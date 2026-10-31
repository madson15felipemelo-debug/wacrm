import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCpfCsv, type CpfCsvRow } from '@/lib/distribution/csv-import';

export const maxDuration = 60; // Allow sufficient time for batch upsert

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, account_role')
    .eq('user_id', user.id)
    .single();

  if (!profile?.account_id || profile.account_role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accountId = profile.account_id;

  let csvContent = '';
  let defaultCampaignId: string | null = null;
  let defaultCampaignName: string | undefined = undefined;

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    defaultCampaignId = (formData.get('campaignId') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }
    csvContent = await file.text();
  } else {
    const body = await request.json();
    csvContent = body.csvText || '';
    defaultCampaignId = body.campaignId || null;
  }

  if (!csvContent.trim()) {
    return NextResponse.json({ error: 'Conteúdo CSV vazio.' }, { status: 400 });
  }

  // If a default campaign was chosen, fetch its name
  if (defaultCampaignId) {
    const { data: camp } = await supabase
      .from('distribution_campaigns')
      .select('name')
      .eq('id', defaultCampaignId)
      .eq('account_id', accountId)
      .maybeSingle();
    defaultCampaignName = camp?.name;
  }

  // Parse CSV
  const parsed = parseCpfCsv(csvContent, defaultCampaignName);
  if (parsed.rows.length === 0) {
    return NextResponse.json({
      error: 'Nenhum CPF válido encontrado no arquivo.',
      invalidCpfCount: parsed.invalidCpfCount,
    }, { status: 400 });
  }

  // Load existing campaigns
  const { data: existingCampaigns } = await supabase
    .from('distribution_campaigns')
    .select('id, name, code')
    .eq('account_id', accountId);

  const campaignMap = new Map<string, string>(); // lowercase name/code -> id
  for (const c of existingCampaigns ?? []) {
    campaignMap.set(c.name.trim().toLowerCase(), c.id);
    if (c.code) campaignMap.set(c.code.trim().toLowerCase(), c.id);
  }

  // Auto-create campaigns that don't exist yet
  const campaignsToCreate = new Set<string>();
  for (const row of parsed.rows) {
    if (row.clientOrCampaign) {
      const key = row.clientOrCampaign.trim().toLowerCase();
      if (!campaignMap.has(key) && !defaultCampaignId) {
        campaignsToCreate.add(row.clientOrCampaign.trim());
      }
    }
  }

  for (const newCampName of Array.from(campaignsToCreate)) {
    const { data: created } = await supabase
      .from('distribution_campaigns')
      .insert({
        account_id: accountId,
        name: newCampName,
        code: newCampName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15).toUpperCase(),
        client_name: 'Ambiental',
        distribution_strategy: 'least_busy',
        contingency_strategy: 'queue',
        max_concurrent_chats: 15,
        is_active: true,
      })
      .select('id, name, code')
      .single();

    if (created) {
      campaignMap.set(created.name.trim().toLowerCase(), created.id);
      if (created.code) campaignMap.set(created.code.trim().toLowerCase(), created.id);
    }
  }

  // Prepare batch upsert records
  const campaignBreakdown: Record<string, number> = {};
  const recordsToUpsert = [];

  for (const row of parsed.rows) {
    let targetCampaignId = defaultCampaignId;
    let campaignLabel = defaultCampaignName || 'Sem Assessoria';

    if (row.clientOrCampaign) {
      const key = row.clientOrCampaign.trim().toLowerCase();
      if (campaignMap.has(key)) {
        targetCampaignId = campaignMap.get(key)!;
        campaignLabel = row.clientOrCampaign.trim();
      }
    }

    campaignBreakdown[campaignLabel] = (campaignBreakdown[campaignLabel] || 0) + 1;

    recordsToUpsert.push({
      account_id: accountId,
      cpf: row.cpf,
      campaign_id: targetCampaignId,
      debtor_name: row.debtorName || null,
      contract_ref: row.contractRef || null,
      creditor_name: 'Ambiental',
      updated_at: new Date().toISOString(),
    });
  }

  // Batch upsert in chunks of 200
  const CHUNK_SIZE = 200;
  let importedCount = 0;

  for (let i = 0; i < recordsToUpsert.length; i += CHUNK_SIZE) {
    const chunk = recordsToUpsert.slice(i, i + CHUNK_SIZE);
    const { error: upsertErr } = await supabase
      .from('cpf_responsibilities')
      .upsert(chunk, { onConflict: 'account_id, cpf' });

    if (upsertErr) {
      console.error('[cpf-import] chunk upsert error:', upsertErr.message);
      // Fallback: try individual inserts in this chunk to rescue valid rows
      for (const single of chunk) {
        const { error: singleErr } = await supabase
          .from('cpf_responsibilities')
          .upsert(single, { onConflict: 'account_id, cpf' });
        if (!singleErr) importedCount++;
      }
    } else {
      importedCount += chunk.length;
    }
  }

  return NextResponse.json({
    success: true,
    totalLines: parsed.totalLines,
    importedCount,
    invalidCpfCount: parsed.invalidCpfCount,
    campaignBreakdown,
  });
}
