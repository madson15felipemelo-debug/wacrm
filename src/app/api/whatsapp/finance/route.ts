import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

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
      templatesRes,
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
      supabase.from('message_templates').select('name, category'),
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
    void templatesRes

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

    // Optional: try fetching official Meta WABA conversation_analytics if waba_id is configured
    let metaOfficialCostUsd: number | null = null
    let metaOfficialConversations: number | null = null

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
          const url = `${META_API_BASE}/${waConfig.waba_id}?fields=conversation_analytics.start(${startUnix}).end(${endUnix}).granularity(DAILY)`
          const metaRes = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          })
          if (metaRes.ok) {
            const metaJson = await metaRes.json()
            const points: any[] =
              metaJson?.conversation_analytics?.data?.[0]?.data_points ?? []
            if (points.length > 0) {
              metaOfficialCostUsd = points.reduce(
                (acc, p) => acc + Number(p.cost || 0),
                0
              )
              metaOfficialConversations = points.reduce(
                (acc, p) => acc + Number(p.conversation || 0),
                0
              )
            }
          }
        } catch {
          // Ignore if token lacks billing analytics scope; fallback to DB telemetry
        }
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
        costUsd: metaOfficialCostUsd,
        conversationsCount: metaOfficialConversations,
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
