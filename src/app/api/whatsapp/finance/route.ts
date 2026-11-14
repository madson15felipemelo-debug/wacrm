import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export interface MetaCategoryBreakdown {
  marketingCost: number
  marketingCount: number
  utilityCost: number
  utilityCount: number
  authenticationCost: number
  authenticationCount: number
  serviceCost: number
  serviceCount: number
  freeTierCount: number
  totalOfficialCost: number
  totalOfficialConversations: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const period = request.nextUrl.searchParams.get('period') || 'month'
    const now = new Date()
    let startDate: Date

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    } else if (period === '7d') {
      startDate = new Date(now.getTime() - 6 * 86400000)
      startDate.setHours(0, 0, 0, 0)
    } else if (period === '30d') {
      startDate = new Date(now.getTime() - 29 * 86400000)
      startDate.setHours(0, 0, 0, 0)
    } else {
      // 'month' (Este mês)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
    }

    const startIso = startDate.toISOString()
    const endIso = now.toISOString()

    // Query real database counts in parallel
    const [
      broadcastsRes,
      recipsRes,
      messagesRes,
      convsRes,
      profileRes,
    ] = await Promise.all([
      supabase
        .from('broadcasts')
        .select('id, name, template_name, sent_count, delivered_count, read_count, replied_count, failed_count, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso),
      supabase
        .from('broadcast_recipients')
        .select('id, status, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso),
      supabase
        .from('messages')
        .select('id, conversation_id, sender_type, content_type, status, ai_generated, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso),
      supabase
        .from('conversations')
        .select('id, created_at, updated_at')
        .gte('updated_at', startIso)
        .lte('updated_at', endIso),
      supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const broadcasts = (broadcastsRes.data ?? []) as any[]
    const recips = (recipsRes.data ?? []) as any[]
    const msgs = (messagesRes.data ?? []) as any[]
    const convs = (convsRes.data ?? []) as any[]

    // 1. Disparos em massa (Broadcasts entregues/enviados)
    const broadcastSentFromBatches = broadcasts.reduce(
      (acc, b) => acc + Number(b.sent_count || 0),
      0
    )
    const broadcastDeliveredFromBatches = broadcasts.reduce(
      (acc, b) => acc + Number(b.delivered_count || 0),
      0
    )
    const broadcastFailedFromBatches = broadcasts.reduce(
      (acc, b) => acc + Number(b.failed_count || 0),
      0
    )

    const recipDeliveredCount = recips.filter((r) =>
      ['sent', 'delivered', 'read', 'replied'].includes(r.status)
    ).length
    const recipFailedCount = recips.filter((r) => r.status === 'failed').length

    const broadcastBillableCount = Math.max(
      broadcastDeliveredFromBatches || broadcastSentFromBatches,
      recipDeliveredCount
    )
    const failedCount = Math.max(broadcastFailedFromBatches, recipFailedCount)

    // 2. Templates individuais enviados nas conversas
    const individualTemplatesCount = msgs.filter(
      (m) => m.sender_type !== 'customer' && m.content_type === 'template' && m.status !== 'failed'
    ).length

    // 3. Interações de atendimento (Operador Humano, Robô de Fluxo e Agente de IA)
    const humanInteractionMsgs = msgs.filter(
      (m) => m.sender_type === 'agent' && m.content_type !== 'template' && m.status !== 'failed'
    ).length
    const botAndAiInteractionMsgs = msgs.filter(
      (m) => m.sender_type === 'bot' && m.content_type !== 'template' && m.status !== 'failed'
    ).length
    const inboundCustomerMsgs = msgs.filter((m) => m.sender_type === 'customer').length

    const totalInteractionsCount = humanInteractionMsgs + botAndAiInteractionMsgs
    const activeConversationsCount = convs.length

    // 4. Query Official Meta WABA Billing (`currency` + `conversation_analytics` with category dimensions)
    let metaConnected = false
    let metaCurrency = 'BRL'
    let metaError: string | null = null
    const metaBreakdown: MetaCategoryBreakdown = {
      marketingCost: 0,
      marketingCount: 0,
      utilityCost: 0,
      utilityCount: 0,
      authenticationCost: 0,
      authenticationCount: 0,
      serviceCost: 0,
      serviceCount: 0,
      freeTierCount: 0,
      totalOfficialCost: 0,
      totalOfficialConversations: 0,
    }

    if (profileRes.data?.account_id) {
      const { data: waConfig } = await supabase
        .from('whatsapp_config')
        .select('waba_id, access_token')
        .eq('account_id', profileRes.data.account_id)
        .maybeSingle()

      if (waConfig?.waba_id && waConfig?.access_token) {
        try {
          const token = decrypt(waConfig.access_token)
          const startUnix = Math.floor(startDate.getTime() / 1000)
          const endUnix = Math.floor(now.getTime() / 1000)

          const fields = encodeURIComponent(
            `currency,conversation_analytics.start(${startUnix}).end(${endUnix}).granularity(DAILY).dimensions(["CONVERSATION_CATEGORY","CONVERSATION_TYPE"])`
          )
          const url = `${META_API_BASE}/${waConfig.waba_id}?fields=${fields}`

          const metaRes = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          })

          const metaJson = await metaRes.json().catch(() => ({}))

          if (metaRes.ok) {
            metaConnected = true
            if (typeof metaJson?.currency === 'string' && metaJson.currency) {
              metaCurrency = metaJson.currency.toUpperCase()
            }

            const points: any[] =
              metaJson?.conversation_analytics?.data?.[0]?.data_points ?? []

            for (const pt of points) {
              const cost = Number(pt.cost || 0)
              const count = Number(pt.conversation || 0)
              const cat = String(pt.conversation_category || '').toUpperCase()
              const cType = String(pt.conversation_type || '').toUpperCase()

              metaBreakdown.totalOfficialCost += cost
              metaBreakdown.totalOfficialConversations += count

              if (cType === 'FREE_TIER' || cType === 'FREE_ENTRY_POINT') {
                metaBreakdown.freeTierCount += count
              }

              if (cat === 'MARKETING') {
                metaBreakdown.marketingCost += cost
                metaBreakdown.marketingCount += count
              } else if (cat === 'UTILITY') {
                metaBreakdown.utilityCost += cost
                metaBreakdown.utilityCount += count
              } else if (cat === 'AUTHENTICATION') {
                metaBreakdown.authenticationCost += cost
                metaBreakdown.authenticationCount += count
              } else if (cat === 'SERVICE') {
                metaBreakdown.serviceCost += cost
                metaBreakdown.serviceCount += count
              }
            }
          } else {
            metaError =
              metaJson?.error?.message ||
              'Token sem permissão de leitura financeira (whatsapp_business_management) ou WABA sem dados no período.'
          }
        } catch (e) {
          metaError = e instanceof Error ? e.message : 'Erro ao consultar faturamento na Meta'
        }
      } else {
        metaError = 'Preencha o WABA ID nas credenciais abaixo para sincronizar os custos direto da Meta.'
      }
    }

    return NextResponse.json({
      period,
      startDate: startIso,
      endDate: endIso,
      counts: {
        broadcastDisparos: broadcastBillableCount,
        individualTemplates: individualTemplatesCount,
        totalDisparos: broadcastBillableCount + individualTemplatesCount,
        humanInteractions: humanInteractionMsgs,
        botAiInteractions: botAndAiInteractionMsgs,
        totalInteractions: totalInteractionsCount,
        inboundCustomerMsgs,
        activeConversations: activeConversationsCount,
        failedNotBilled: failedCount,
      },
      metaOfficial: {
        connected: metaConnected,
        currency: metaCurrency,
        error: metaError,
        breakdown: metaBreakdown,
      },
    })
  } catch (err) {
    console.error('[api/whatsapp/finance] error:', err)
    return NextResponse.json(
      { error: 'Falha ao carregar resumo financeiro do WhatsApp' },
      { status: 500 }
    )
  }
}
