import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
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

  const { data: config } = await supabase
    .from('distribution_rules_config')
    .select('*')
    .eq('account_id', profile.account_id)
    .maybeSingle();

  // If not configured yet, return standard defaults
  const rules = config ?? {
    account_id: profile.account_id,
    active_mode: 'cpf_responsibility',
    default_strategy: 'least_busy',
    external_api_url: null,
    external_api_token: null,
    fallback_behavior: 'triage',
    auto_distribute_on_inbound: true,
  };

  return NextResponse.json({ rules });
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
    active_mode = 'cpf_responsibility',
    default_strategy = 'least_busy',
    external_api_url,
    external_api_token,
    fallback_behavior = 'triage',
    auto_distribute_on_inbound = true,
  } = body;

  const { data: saved, error } = await supabase
    .from('distribution_rules_config')
    .upsert(
      {
        account_id: profile.account_id,
        active_mode,
        default_strategy,
        external_api_url: external_api_url ? String(external_api_url).trim() : null,
        external_api_token: external_api_token ? String(external_api_token).trim() : null,
        fallback_behavior,
        auto_distribute_on_inbound: Boolean(auto_distribute_on_inbound),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: saved });
}
