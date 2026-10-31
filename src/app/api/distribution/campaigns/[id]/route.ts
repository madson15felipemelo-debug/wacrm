import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { derivePresence } from '@/lib/presence';

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
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

  const { data: campaign, error: campErr } = await supabase
    .from('distribution_campaigns')
    .select('*')
    .eq('id', id)
    .eq('account_id', profile.account_id)
    .maybeSingle();

  if (campErr || !campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  }

  // Fetch operators with their profiles
  const { data: opRows } = await supabase
    .from('campaign_operators')
    .select('id, user_id, is_substitute, max_capacity, weight, created_at')
    .eq('campaign_id', id);

  const userIds = (opRows ?? []).map((o) => o.user_id);

  let profilesMap = new Map();
  let presenceMap = new Map();
  let activeChatsMap = new Map();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, avatar_url, account_role')
      .in('user_id', userIds);

    for (const p of profiles ?? []) profilesMap.set(p.user_id, p);

    const { data: presence } = await supabase
      .from('member_presence')
      .select('user_id, status, last_seen_at')
      .in('user_id', userIds);

    const now = Date.now();
    for (const p of presence ?? []) {
      presenceMap.set(p.user_id, derivePresence(p.status, p.last_seen_at, now));
    }

    const { data: chats } = await supabase
      .from('conversations')
      .select('assigned_agent_id')
      .eq('account_id', profile.account_id)
      .in('status', ['open', 'pending'])
      .in('assigned_agent_id', userIds);

    for (const c of chats ?? []) {
      if (c.assigned_agent_id) {
        activeChatsMap.set(
          c.assigned_agent_id,
          (activeChatsMap.get(c.assigned_agent_id) ?? 0) + 1,
        );
      }
    }
  }

  const operators = (opRows ?? []).map((op) => ({
    ...op,
    profile: profilesMap.get(op.user_id) ?? null,
    presence_status: presenceMap.get(op.user_id) ?? 'offline',
    active_chats: activeChatsMap.get(op.user_id) ?? 0,
  }));

  return NextResponse.json({ campaign, operators });
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
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
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ('name' in body) patch.name = String(body.name).trim();
  if ('code' in body) patch.code = body.code ? String(body.code).trim() : null;
  if ('client_name' in body) patch.client_name = String(body.client_name).trim();
  if ('distribution_strategy' in body) patch.distribution_strategy = body.distribution_strategy;
  if ('contingency_strategy' in body) patch.contingency_strategy = body.contingency_strategy;
  if ('max_concurrent_chats' in body) patch.max_concurrent_chats = Number(body.max_concurrent_chats);
  if ('is_active' in body) patch.is_active = Boolean(body.is_active);

  const { data: updated, error } = await supabase
    .from('distribution_campaigns')
    .update(patch)
    .eq('id', id)
    .eq('account_id', profile.account_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: updated });
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
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

  const { error } = await supabase
    .from('distribution_campaigns')
    .delete()
    .eq('id', id)
    .eq('account_id', profile.account_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
