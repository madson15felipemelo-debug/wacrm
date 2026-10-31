import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id: campaignId } = await props.params;
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
  const { userId, isSubstitute = false, maxCapacity = 10, weight = 1 } = body;

  if (!userId) {
    return NextResponse.json({ error: 'ID do operador é obrigatório.' }, { status: 400 });
  }

  // Verify the target user belongs to the same account and is not viewer
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('user_id, account_role')
    .eq('account_id', profile.account_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json({ error: 'Operador não encontrado na conta.' }, { status: 404 });
  }

  if (targetProfile.account_role === 'viewer') {
    return NextResponse.json(
      { error: 'Usuários com perfil somente leitura (viewer) não podem ser operadores de atendimento.' },
      { status: 400 },
    );
  }

  const { data: linked, error } = await supabase
    .from('campaign_operators')
    .upsert(
      {
        account_id: profile.account_id,
        campaign_id: campaignId,
        user_id: userId,
        is_substitute: Boolean(isSubstitute),
        max_capacity: Number(maxCapacity) || 10,
        weight: Number(weight) || 1,
      },
      { onConflict: 'campaign_id,user_id' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ operator: linked }, { status: 201 });
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id: campaignId } = await props.params;
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

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('campaign_operators')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .eq('account_id', profile.account_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
