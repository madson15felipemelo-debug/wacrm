// ============================================================
// /api/account/members
//
//   GET  — Lists every member of the caller's account.
//   POST — Creates a new team member directly (Admin/Owner only)
//          with name, email, password, and role (admin/agent/viewer),
//          without requiring an invite link.
// ============================================================

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from "@/lib/auth/account";
import { canManageMembers, isAccountRole } from "@/lib/auth/roles";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import type { AccountMember } from "@/types";

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  account_role: string;
  created_at: string;
}

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LEN = 100;
const MIN_PASSWORD_LEN = 6;
const MAX_PASSWORD_LEN = 128;

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    // RLS on profiles allows reading any row whose account matches
    // the caller's, so this query is naturally account-scoped.
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("user_id, full_name, email, avatar_url, account_role, created_at")
      .eq("account_id", ctx.accountId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/account/members] fetch error:", error);
      return NextResponse.json(
        { error: "Failed to load members" },
        { status: 500 },
      );
    }

    const canSeeEmails = canManageMembers(ctx.role);

    const members: AccountMember[] = (data as ProfileRow[]).flatMap((row) => {
      if (!isAccountRole(row.account_role)) return [];
      return [
        {
          user_id: row.user_id,
          full_name: row.full_name ?? "",
          email: canSeeEmails ? row.email : null,
          avatar_url: row.avatar_url,
          role: row.account_role,
          joined_at: row.created_at,
        },
      ];
    });

    return NextResponse.json({ members });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberCreate:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as {
      fullName?: unknown;
      email?: unknown;
      password?: unknown;
      role?: unknown;
    } | null;

    const fullName =
      typeof body?.fullName === "string" ? body.fullName.trim() : "";
    if (!fullName) {
      return NextResponse.json(
        { error: "Informe o nome do membro." },
        { status: 400 },
      );
    }
    if (fullName.length > MAX_NAME_LEN) {
      return NextResponse.json(
        { error: `O nome deve ter no máximo ${MAX_NAME_LEN} caracteres.` },
        { status: 400 },
      );
    }

    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 },
      );
    }

    const password = typeof body?.password === "string" ? body.password : "";
    if (password.length < MIN_PASSWORD_LEN) {
      return NextResponse.json(
        {
          error: `A senha deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres.`,
        },
        { status: 400 },
      );
    }
    if (password.length > MAX_PASSWORD_LEN) {
      return NextResponse.json(
        {
          error: `A senha deve ter no máximo ${MAX_PASSWORD_LEN} caracteres.`,
        },
        { status: 400 },
      );
    }

    const role = body?.role;
    if (!isAccountRole(role) || role === "owner") {
      return NextResponse.json(
        { error: "O perfil deve ser Admin, Atendente ou Leitor." },
        { status: 400 },
      );
    }

    const adminDb = getServiceClient();

    // Check if a profile with this email already exists
    const { data: existingProfile } = await adminDb
      .from("profiles")
      .select("user_id, account_id")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile?.account_id === ctx.accountId) {
      return NextResponse.json(
        { error: "Este e-mail já faz parte da sua equipe." },
        { status: 409 },
      );
    }

    let targetUserId: string | null = null;
    let oldAccountIdToCleanup: string | null = null;

    if (existingProfile) {
      // Check if the existing user owns an empty personal account (e.g. previously removed member)
      const { data: oldAcc } = await adminDb
        .from("accounts")
        .select("id, owner_user_id")
        .eq("id", existingProfile.account_id)
        .maybeSingle();

      const { count: memberCount } = await adminDb
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("account_id", existingProfile.account_id);

      const { count: contactCount } = await adminDb
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", existingProfile.account_id);

      if (
        !oldAcc ||
        oldAcc.owner_user_id !== existingProfile.user_id ||
        (memberCount ?? 0) > 1 ||
        (contactCount ?? 0) > 0
      ) {
        return NextResponse.json(
          {
            error:
              "Já existe uma conta ativa vinculada a este e-mail. Use outro endereço de e-mail.",
          },
          { status: 409 },
        );
      }

      // Safe to attach existing standalone user and update their credentials
      const { error: updateAuthErr } =
        await adminDb.auth.admin.updateUserById(existingProfile.user_id, {
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (updateAuthErr) {
        console.error(
          "[POST /api/account/members] updateUserById error:",
          updateAuthErr,
        );
        return NextResponse.json(
          { error: "Não foi possível atualizar as credenciais deste e-mail." },
          { status: 500 },
        );
      }

      targetUserId = existingProfile.user_id;
      oldAccountIdToCleanup = existingProfile.account_id;
    } else {
      // Create a brand new user via Supabase Auth Admin API (email pre-confirmed)
      const { data: authData, error: createErr } =
        await adminDb.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (createErr || !authData?.user) {
        console.error("[POST /api/account/members] createUser error:", createErr);
        const msg = createErr?.message?.toLowerCase() ?? "";
        if (msg.includes("already") || msg.includes("registered")) {
          return NextResponse.json(
            { error: "Já existe um usuário cadastrado com este e-mail." },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { error: createErr?.message || "Falha ao criar o usuário." },
          { status: 500 },
        );
      }

      targetUserId = authData.user.id;

      // Read the auto-created personal account from the on_auth_user_created trigger
      const { data: triggerProfile } = await adminDb
        .from("profiles")
        .select("account_id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      oldAccountIdToCleanup = triggerProfile?.account_id ?? null;
    }

    // Move the profile to the caller's account with the chosen role
    const { data: updatedProfile, error: profileErr } = await adminDb
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        account_id: ctx.accountId,
        account_role: role,
      })
      .eq("user_id", targetUserId)
      .select("user_id, full_name, email, avatar_url, account_role, created_at")
      .single();

    if (profileErr || !updatedProfile) {
      console.error(
        "[POST /api/account/members] profile update error:",
        profileErr,
      );
      return NextResponse.json(
        { error: "Falha ao vincular o membro à conta." },
        { status: 500 },
      );
    }

    // Clean up the orphan personal account created by the signup trigger
    if (oldAccountIdToCleanup && oldAccountIdToCleanup !== ctx.accountId) {
      await adminDb
        .from("accounts")
        .delete()
        .eq("id", oldAccountIdToCleanup)
        .eq("owner_user_id", targetUserId);
    }

    const member: AccountMember = {
      user_id: updatedProfile.user_id,
      full_name: updatedProfile.full_name ?? fullName,
      email: updatedProfile.email ?? email,
      avatar_url: updatedProfile.avatar_url,
      role,
      joined_at: updatedProfile.created_at,
    };

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
