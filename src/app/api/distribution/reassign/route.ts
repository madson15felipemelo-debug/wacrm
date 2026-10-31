import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeDistribution } from '@/lib/distribution/distribution-engine';

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

  if (!profile?.account_id) return NextResponse.json({ error: 'No account' }, { status: 400 });

  // Only owners, admins and supervisors can execute manual reassignments
  if (profile.account_role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const {
    conversationIds,
    targetAgentId = null,
    targetCampaignId = null,
    reason = 'Atribuição manual pelo supervisor',
  } = body;

  if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json(
      { error: 'É necessário informar ao menos uma conversa.' },
      { status: 400 },
    );
  }

  const results = [];

  for (const convId of conversationIds) {
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, contact_id')
      .eq('id', convId)
      .eq('account_id', profile.account_id)
      .maybeSingle();

    if (!conv) continue;

    const res = await executeDistribution(supabase, {
      accountId: profile.account_id,
      conversationId: conv.id,
      contactId: conv.contact_id,
      actorUserId: user.id,
      targetAgentId,
      targetCampaignId,
      manualReason: reason,
      forcedMode: 'manual',
    });

    results.push({ conversationId: conv.id, ...res });
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
