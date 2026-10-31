import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { derivePresence } from '@/lib/presence';

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

  const accountId = profile.account_id;

  // 1. Audit logs aggregation
  const { data: logs } = await supabase
    .from('distribution_audit_logs')
    .select('distribution_mode, status, campaign_id, campaign_name, execution_time_ms, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(1000);

  const totalLogs = logs?.length ?? 0;
  let byCpf = 0;
  let byOperational = 0;
  let byManual = 0;
  let queuedCount = 0;
  let triageCount = 0;
  let conflictCount = 0;
  let totalExecTime = 0;

  const volumeByCampaign = new Map<string, { name: string; count: number }>();

  for (const log of logs ?? []) {
    if (log.distribution_mode === 'cpf_responsibility') byCpf++;
    if (log.distribution_mode === 'operational_smart') byOperational++;
    if (log.distribution_mode === 'manual') byManual++;

    if (log.status === 'queued') queuedCount++;
    if (log.status === 'triage') triageCount++;
    if (log.status === 'conflict') conflictCount++;

    totalExecTime += log.execution_time_ms || 0;

    const campName = log.campaign_name || 'Triagem Geral';
    const current = volumeByCampaign.get(campName) ?? { name: campName, count: 0 };
    current.count++;
    volumeByCampaign.set(campName, current);
  }

  // 2. Live Presence
  const { data: presenceRows } = await supabase
    .from('member_presence')
    .select('status, last_seen_at')
    .eq('account_id', accountId);

  const now = Date.now();
  const onlineAgents = (presenceRows ?? []).filter(
    (p) => derivePresence(p.status, p.last_seen_at, now) === 'online',
  ).length;

  // 3. Campaigns count
  const { count: campaignsCount } = await supabase
    .from('distribution_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('is_active', true);

  // 4. Open conversations without agent
  const { count: unassignedConvs } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .is('assigned_agent_id', null)
    .in('status', ['open', 'pending']);

  return NextResponse.json({
    kpis: {
      totalReceived: totalLogs,
      distributedByCpf: byCpf,
      distributedOperational: byOperational,
      distributedManual: byManual,
      awaitingQueue: queuedCount,
      inTriage: triageCount,
      inConflict: conflictCount,
      unassignedOpenChats: unassignedConvs ?? 0,
      activeCampaigns: campaignsCount ?? 0,
      onlineOperators: onlineAgents,
      avgDistributionMs: totalLogs > 0 ? Math.round(totalExecTime / totalLogs) : 0,
    },
    campaignDistribution: Array.from(volumeByCampaign.values()),
  });
}
