import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  const campaignId = searchParams.get('campaignId');
  const status = searchParams.get('status');
  const cpf = searchParams.get('cpf');
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit')) || 30));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('distribution_audit_logs')
    .select('*', { count: 'exact' })
    .eq('account_id', profile.account_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (campaignId) query = query.eq('campaign_id', campaignId);
  if (status) query = query.eq('status', status);
  if (cpf) query = query.ilike('cpf', `%${cpf.replace(/\D/g, '')}%`);

  const { data: logs, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    logs: logs ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
