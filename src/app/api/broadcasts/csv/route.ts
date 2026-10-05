import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { parseAudienceCsv } from '@/lib/broadcasts/csv-audience'
import { extractVariableIndices } from '@/lib/whatsapp/template-validators'

export const maxDuration = 60

/** Largest audience a single CSV broadcast can carry. */
const MAX_CSV_RECIPIENTS = 5000
const LOOKUP_CHUNK = 500
const INSERT_CHUNK = 200

/**
 * POST /api/broadcasts/csv
 *
 * Creates a queued broadcast from a CSV the browser already uploaded to
 * the private `audience-imports` bucket. Nothing is sent here: every
 * recipient is stored `pending` with its template variables, and the
 * `/api/broadcasts/worker` cron drains the queue in batches.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = checkRateLimit(`broadcast:${user.id}`, RATE_LIMITS.broadcast)
    if (!limit.success) return rateLimitResponse(limit)

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const templateName =
      typeof body?.templateName === 'string' ? body.templateName : ''
    const templateLanguage =
      typeof body?.templateLanguage === 'string' && body.templateLanguage
        ? body.templateLanguage
        : 'en_US'
    const storagePath =
      typeof body?.storagePath === 'string' ? body.storagePath : ''

    if (!templateName) {
      return NextResponse.json({ error: 'Escolha um modelo.' }, { status: 400 })
    }
    // The upload helper scopes every path to its account; refuse anything
    // that points at another account's folder.
    if (!storagePath.startsWith(`account-${accountId}/`)) {
      return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    const { data: config } = await admin
      .from('whatsapp_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()
    if (!config) {
      return NextResponse.json(
        { error: 'Configure a conexão com o WhatsApp antes de disparar.' },
        { status: 400 },
      )
    }

    const { data: template } = await admin
      .from('message_templates')
      .select('body_text')
      .eq('account_id', accountId)
      .eq('name', templateName)
      .eq('language', templateLanguage)
      .maybeSingle()
    if (!template) {
      return NextResponse.json(
        { error: 'Modelo não encontrado. Sincronize os modelos com a Meta.' },
        { status: 400 },
      )
    }
    const requiredVars = extractVariableIndices(template.body_text ?? '')
    const requiredCount = requiredVars.length ? Math.max(...requiredVars) : 0

    const { data: file, error: downloadError } = await admin.storage
      .from('audience-imports')
      .download(storagePath)
    if (downloadError || !file) {
      return NextResponse.json(
        { error: 'Não foi possível ler o arquivo enviado.' },
        { status: 400 },
      )
    }

    let parsed
    try {
      parsed = parseAudienceCsv(await file.text())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'CSV inválido.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum telefone válido no CSV (use formato E.164, ex: 5547999999999).' },
        { status: 400 },
      )
    }
    if (parsed.rows.length > MAX_CSV_RECIPIENTS) {
      return NextResponse.json(
        {
          error: `Cada disparo aceita até ${MAX_CSV_RECIPIENTS} contatos. Seu arquivo tem ${parsed.rows.length}.`,
        },
        { status: 400 },
      )
    }
    if (parsed.paramColumnCount < requiredCount) {
      return NextResponse.json(
        {
          error: `O modelo usa ${requiredCount} variável(is), mas o CSV tem ${parsed.paramColumnCount} coluna(s) além de 'phone'.`,
        },
        { status: 400 },
      )
    }

    // Find or create one contact per phone, scoped to the account — the
    // same key the contacts index enforces, so no duplicate rows.
    const contactIdByPhone = new Map<string, string>()
    const phones = parsed.rows.map((r) => r.phone)

    for (let i = 0; i < phones.length; i += LOOKUP_CHUNK) {
      const chunk = phones.slice(i, i + LOOKUP_CHUNK)
      const { data: existing, error } = await admin
        .from('contacts')
        .select('id, phone')
        .eq('account_id', accountId)
        .in('phone_normalized', chunk)
      if (error) throw error
      for (const c of existing ?? []) {
        contactIdByPhone.set(c.phone.replace(/\D/g, ''), c.id)
      }
    }

    const missing = phones.filter((p) => !contactIdByPhone.has(p))
    for (let i = 0; i < missing.length; i += INSERT_CHUNK) {
      const chunk = missing.slice(i, i + INSERT_CHUNK).map((phone) => ({
        account_id: accountId,
        user_id: user.id,
        phone,
      }))
      const { data: inserted, error } = await admin
        .from('contacts')
        .insert(chunk)
        .select('id, phone')
      if (error) throw error
      for (const c of inserted ?? []) {
        contactIdByPhone.set(c.phone.replace(/\D/g, ''), c.id)
      }
    }

    const { data: broadcast, error: broadcastError } = await admin
      .from('broadcasts')
      .insert({
        account_id: accountId,
        user_id: user.id,
        name: name || `CSV broadcast (${templateName})`,
        template_name: templateName,
        template_language: templateLanguage,
        status: 'sending',
        total_recipients: parsed.rows.length,
        audience_filter: {
          type: 'csv',
          storagePath,
          invalidCount: parsed.invalidCount,
          duplicateCount: parsed.duplicateCount,
        },
      })
      .select('id')
      .single()
    if (broadcastError || !broadcast) throw broadcastError ?? new Error('broadcast insert failed')

    const recipients = parsed.rows.map((row) => ({
      broadcast_id: broadcast.id,
      contact_id: contactIdByPhone.get(row.phone)!,
      status: 'pending' as const,
      template_params: row.params,
    }))
    for (let i = 0; i < recipients.length; i += INSERT_CHUNK) {
      const { error } = await admin
        .from('broadcast_recipients')
        .insert(recipients.slice(i, i + INSERT_CHUNK))
      if (error) throw error
    }

    return NextResponse.json({
      broadcastId: broadcast.id,
      total: parsed.rows.length,
      invalidCount: parsed.invalidCount,
      duplicateCount: parsed.duplicateCount,
    })
  } catch (error) {
    console.error('[broadcasts/csv] failed:', error)
    return NextResponse.json(
      { error: 'Não foi possível criar o disparo. Tente novamente.' },
      { status: 500 },
    )
  }
}
