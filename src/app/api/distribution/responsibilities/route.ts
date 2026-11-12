import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeCpf } from '@/lib/distribution/distribution-engine';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.account_id) return NextResponse.json({ error: 'No account' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const campaignId = searchParams.get('campaignId');
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit')) || 30));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('cpf_responsibilities')
    .select('*, campaign:distribution_campaigns(id, name, code)', { count: 'exact' })
    .eq('account_id', profile.account_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (campaignId) query = query.eq('campaign_id', campaignId);
  if (search) {
    const cleanDigits = search.replace(/\D/g, '');
    if (cleanDigits) {
      query = query.ilike('cpf', `%${cleanDigits}%`);
    } else {
      query = query.ilike('debtor_name', `%${search.trim()}%`);
    }
  }

  const { data: rows, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    responsibilities: rows ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}

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

  const body = await request.json();
  const {
    cpf,
    campaign_id = null,
    assigned_agent_id = null,
    contract_ref = null,
    debtor_name = null,
    creditor_name = null,
  } = body;

  const cleanCpf = sanitizeCpf(cpf);
  if (!cleanCpf) {
    return NextResponse.json({ error: 'CPF inválido (deve conter 11 dígitos).' }, { status: 400 });
  }

  const { data: saved, error } = await supabase
    .from('cpf_responsibilities')
    .insert({
      account_id: profile.account_id,
      cpf: cleanCpf,
      campaign_id,
      assigned_agent_id,
      contract_ref: contract_ref ? String(contract_ref).trim() : null,
      debtor_name: debtor_name ? String(debtor_name).trim() : null,
      creditor_name: creditor_name && String(creditor_name).trim() ? String(creditor_name).trim() : null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responsibility: saved }, { status: 201 });
}
