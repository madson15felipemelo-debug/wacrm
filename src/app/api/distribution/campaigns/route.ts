import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { derivePresence } from '@/lib/presence';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.account_id) {
    return NextResponse.json({ error: 'No account' }, { status: 400 });
  }

  const accountId = profile.account_id;

  // 1. Fetch campaigns
  const { data: campaigns, error: campErr } = await supabase
    .from('distribution_campaigns')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (campErr) {
    return NextResponse.json({ error: campErr.message }, { status: 500 });
  }

  // 2. Fetch operators links and presence to calculate live metrics
  const { data: operators } = await supabase
    .from('campaign_operators')
    .select('campaign_id, user_id, is_substitute')
    .eq('account_id', accountId);

  const { data: presenceRows } = await supabase
    .from('member_presence')
    .select('user_id, status, last_seen_at')
    .eq('account_id', accountId);

  const now = Date.now();
  const onlineUsers = new Set(
    (presenceRows ?? [])
      .filter((p) => derivePresence(p.status, p.last_seen_at, now) === 'online')
      .map((p) => p.user_id),
  );

  // 3. Count active conversations per campaign
  const { data: convRows } = await supabase
    .from('conversations')
    .select('campaign_id')
    .eq('account_id', accountId)
    .in('status', ['open', 'pending'])
    .not('campaign_id', 'is', null);

  const activeConvCountByCamp = new Map<string, number>();
  for (const c of convRows ?? []) {
    if (c.campaign_id) {
      activeConvCountByCamp.set(
        c.campaign_id,
        (activeConvCountByCamp.get(c.campaign_id) ?? 0) + 1,
      );
    }
  }

  const result = (campaigns ?? []).map((camp) => {
    const campOps = (operators ?? []).filter((o) => o.campaign_id === camp.id);
    const onlineCount = campOps.filter((o) => onlineUsers.has(o.user_id)).length;

    return {
      ...camp,
      operators_count: campOps.length,
      online_operators_count: onlineCount,
      active_conversations_count: activeConvCountByCamp.get(camp.id) ?? 0,
    };
  });

  return NextResponse.json({ campaigns: result });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, account_role')
    .eq('user_id', user.id)
    .single();

  if (!profile?.account_id) {
    return NextResponse.json({ error: 'No account' }, { status: 400 });
  }

  if (profile.account_role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const {
    name,
    code,
    client_name = 'Ambiental',
    distribution_strategy = 'least_busy',
    contingency_strategy = 'queue',
    max_concurrent_chats = 10,
  } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Nome da campanha é obrigatório.' }, { status: 400 });
  }

  const { data: created, error } = await supabase
    .from('distribution_campaigns')
    .insert({
      account_id: profile.account_id,
      name: name.trim(),
      code: code ? code.trim() : null,
      client_name: client_name.trim(),
      distribution_strategy,
      contingency_strategy,
      max_concurrent_chats: Number(max_concurrent_chats) || 10,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign: created }, { status: 201 });
}
