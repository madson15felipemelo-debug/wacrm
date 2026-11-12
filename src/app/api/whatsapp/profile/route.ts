import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/whatsapp/encryption';
import { uploadResumableMedia } from '@/lib/whatsapp/meta-api';

const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

async function getAccountWhatsAppCredentials(requireWrite = false) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Não autorizado', status: 401 as const };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, account_role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.account_id) {
    return { error: 'Conta não encontrada', status: 403 as const };
  }

  if (
    requireWrite &&
    profile.account_role !== 'owner' &&
    profile.account_role !== 'admin'
  ) {
    return {
      error: 'Apenas o dono da conta pode editar o perfil do WhatsApp',
      status: 403 as const,
    };
  }

  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('phone_number_id, waba_id, access_token')
    .eq('account_id', profile.account_id)
    .maybeSingle();

  if (!config?.phone_number_id || !config?.access_token) {
    return {
      error: 'Conecte primeiro as credenciais da API do WhatsApp abaixo.',
      status: 400 as const,
    };
  }

  let accessToken: string;
  try {
    accessToken = decrypt(config.access_token);
  } catch {
    return {
      error: 'Não foi possível descriptografar o token de acesso salvo.',
      status: 400 as const,
    };
  }

  return {
    phoneNumberId: config.phone_number_id as string,
    wabaId: (config.waba_id as string | null) ?? null,
    accessToken,
  };
}

async function resolveMetaAppId(accessToken: string): Promise<string> {
  if (process.env.META_APP_ID?.trim()) {
    return process.env.META_APP_ID.trim();
  }
  const res = await fetch(`${META_API_BASE}/app`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(
      'Não foi possível identificar o ID do App da Meta a partir do token de acesso.',
    );
  }
  const data = (await res.json()) as { id?: string };
  if (!data?.id) {
    throw new Error('O endpoint /app da Meta não retornou o ID do aplicativo.');
  }
  return data.id;
}

export async function GET() {
  try {
    const creds = await getAccountWhatsAppCredentials();
    if ('error' in creds) {
      return NextResponse.json({ error: creds.error }, { status: creds.status });
    }

    const { phoneNumberId, wabaId, accessToken } = creds;

    const [profileRes, phoneRes, wabaPhonesRes] = await Promise.all([
      fetch(
        `${META_API_BASE}/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        },
      ),
      fetch(
        `${META_API_BASE}/${phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating,status,messaging_limit_tier,name_status,new_display_name,new_name_status`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        },
      ),
      wabaId
        ? fetch(
            `${META_API_BASE}/${wabaId}/phone_numbers?fields=id,verified_name,display_phone_number,quality_rating,status,messaging_limit_tier,name_status,new_display_name,new_name_status`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              cache: 'no-store',
            },
          )
        : Promise.resolve(null),
    ]);

    const profileJson = await profileRes.json().catch(() => ({}));
    const phoneJson = await phoneRes.json().catch(() => ({}));
    const wabaPhonesJson = wabaPhonesRes
      ? await wabaPhonesRes.json().catch(() => ({}))
      : null;

    if (!profileRes.ok) {
      const msg =
        profileJson?.error?.error_user_msg ||
        profileJson?.error?.message ||
        'Falha ao consultar o perfil do WhatsApp na Meta.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const businessProfile = Array.isArray(profileJson?.data)
      ? profileJson.data[0] ?? {}
      : {};

    const primaryPhone = {
      id: phoneJson?.id ?? phoneNumberId,
      verified_name: phoneJson?.verified_name ?? '',
      display_phone_number: phoneJson?.display_phone_number ?? '',
      quality_rating: phoneJson?.quality_rating ?? '',
      status: phoneJson?.status ?? 'CONNECTED',
      messaging_limit_tier: phoneJson?.messaging_limit_tier ?? '',
      name_status: phoneJson?.name_status ?? '',
      new_display_name: phoneJson?.new_display_name ?? null,
      new_name_status: phoneJson?.new_name_status ?? null,
      profile_picture_url: businessProfile.profile_picture_url ?? null,
      is_primary: true,
    };

    // Build full list of numbers in the WABA (if multiple exist)
    const rawWabaList: Record<string, unknown>[] = Array.isArray(
      wabaPhonesJson?.data,
    )
      ? wabaPhonesJson.data
      : [];

    let phones = [primaryPhone];
    if (rawWabaList.length > 0) {
      phones = await Promise.all(
        rawWabaList.map(async (item) => {
          const itemId = String(item.id ?? '');
          const isPrimary = itemId === phoneNumberId;
          let picUrl: string | null = isPrimary
            ? (businessProfile.profile_picture_url ?? null)
            : null;

          if (!isPrimary && itemId) {
            try {
              const pRes = await fetch(
                `${META_API_BASE}/${itemId}/whatsapp_business_profile?fields=profile_picture_url`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                  cache: 'no-store',
                },
              );
              const pJson = await pRes.json().catch(() => ({}));
              picUrl =
                Array.isArray(pJson?.data) && pJson.data[0]?.profile_picture_url
                  ? pJson.data[0].profile_picture_url
                  : null;
            } catch {
              picUrl = null;
            }
          }

          return {
            id: itemId,
            verified_name: String(item.verified_name ?? ''),
            display_phone_number: String(item.display_phone_number ?? ''),
            quality_rating: String(item.quality_rating ?? ''),
            status: String(item.status ?? 'CONNECTED'),
            messaging_limit_tier: String(item.messaging_limit_tier ?? ''),
            name_status: String(item.name_status ?? ''),
            new_display_name: (item.new_display_name as string | null) ?? null,
            new_name_status: (item.new_name_status as string | null) ?? null,
            profile_picture_url: picUrl,
            is_primary: isPrimary,
          };
        }),
      );
      // Sort so primary number appears first
      phones.sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1));
    }

    return NextResponse.json({
      profile: {
        about: businessProfile.about ?? '',
        address: businessProfile.address ?? '',
        description: businessProfile.description ?? '',
        email: businessProfile.email ?? '',
        profile_picture_url: businessProfile.profile_picture_url ?? null,
        websites: Array.isArray(businessProfile.websites)
          ? businessProfile.websites
          : [],
        vertical: businessProfile.vertical ?? '',
      },
      phone: primaryPhone,
      phones,
    });
  } catch (err) {
    console.error('[GET /api/whatsapp/profile] error:', err);
    return NextResponse.json(
      { error: 'Erro interno ao carregar perfil do WhatsApp' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const creds = await getAccountWhatsAppCredentials(true);
    if ('error' in creds) {
      return NextResponse.json({ error: creds.error }, { status: creds.status });
    }

    const { phoneNumberId, accessToken } = creds;
    const contentType = request.headers.get('content-type') || '';

    // Case 1: Multipart photo upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'Selecione uma imagem JPG ou PNG.' },
          { status: 400 },
        );
      }

      const mimeType = file.type.toLowerCase();
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        return NextResponse.json(
          { error: 'A foto de perfil deve estar em formato JPG ou PNG.' },
          { status: 400 },
        );
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.byteLength === 0) {
        return NextResponse.json(
          { error: 'O arquivo enviado está vazio.' },
          { status: 400 },
        );
      }
      if (bytes.byteLength > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: 'A imagem excede o limite máximo de 5 MB da Meta.' },
          { status: 400 },
        );
      }

      const appId = await resolveMetaAppId(accessToken);
      const { handle } = await uploadResumableMedia({
        appId,
        accessToken,
        fileName: file.name || (mimeType === 'image/png' ? 'profile.png' : 'profile.jpg'),
        mimeType,
        bytes,
      });

      const updateRes = await fetch(
        `${META_API_BASE}/${phoneNumberId}/whatsapp_business_profile`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            profile_picture_handle: handle,
          }),
        },
      );

      const updateJson = await updateRes.json().catch(() => ({}));
      if (!updateRes.ok) {
        const msg =
          updateJson?.error?.error_user_msg ||
          updateJson?.error?.message ||
          'A Meta recusou a atualização da foto de perfil.';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      // Re-fetch updated profile picture URL
      const refreshRes = await fetch(
        `${META_API_BASE}/${phoneNumberId}/whatsapp_business_profile?fields=profile_picture_url`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        },
      );
      const refreshJson = await refreshRes.json().catch(() => ({}));
      const newPicUrl =
        Array.isArray(refreshJson?.data) && refreshJson.data[0]?.profile_picture_url
          ? refreshJson.data[0].profile_picture_url
          : null;

      return NextResponse.json({
        success: true,
        profile_picture_url: newPicUrl,
      });
    }

    // Case 2: JSON body (text fields or display name request)
    const body = (await request.json().catch(() => ({}))) as {
      action?: 'update_profile' | 'request_display_name';
      about?: string;
      description?: string;
      address?: string;
      email?: string;
      website?: string;
      newDisplayName?: string;
    };

    if (body.action === 'request_display_name') {
      const nextName = (body.newDisplayName || '').trim();
      if (!nextName || nextName.length < 3) {
        return NextResponse.json(
          { error: 'Informe um nome de apresentação válido (mínimo 3 caracteres).' },
          { status: 400 },
        );
      }

      const params = new URLSearchParams({
        new_display_name: nextName,
      });

      const nameRes = await fetch(
        `${META_API_BASE}/${phoneNumberId}?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const nameJson = await nameRes.json().catch(() => ({}));
      if (!nameRes.ok) {
        const rawMsg =
          nameJson?.error?.error_user_msg ||
          nameJson?.error?.message ||
          'A Meta não permitiu solicitar a troca do nome de apresentação.';
        return NextResponse.json({ error: rawMsg }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        new_display_name: nextName,
      });
    }

    // Default: update business profile text fields
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
    };

    if (typeof body.about === 'string' && body.about.trim().length > 0) {
      payload.about = body.about.trim().slice(0, 139);
    }
    if (typeof body.description === 'string') {
      payload.description = body.description.trim().slice(0, 512);
    }
    if (typeof body.address === 'string') {
      payload.address = body.address.trim().slice(0, 256);
    }
    if (typeof body.email === 'string') {
      payload.email = body.email.trim().slice(0, 128);
    }
    if (typeof body.website === 'string') {
      const site = body.website.trim();
      payload.websites = site ? [site] : [];
    }

    const updateRes = await fetch(
      `${META_API_BASE}/${phoneNumberId}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    const updateJson = await updateRes.json().catch(() => ({}));
    if (!updateRes.ok) {
      const msg =
        updateJson?.error?.error_user_msg ||
        updateJson?.error?.message ||
        'Falha ao atualizar os dados do perfil na Meta.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/whatsapp/profile] error:', err);
    const message =
      err instanceof Error ? err.message : 'Erro interno ao salvar perfil';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

