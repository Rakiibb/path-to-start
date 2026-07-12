import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Synthesized email for Supabase Auth, keyed by the app user's id (not the
// secret code). This keeps the secret code out of auth.users.
function syntheticEmail(userId: string) {
  return `user-${userId}@smartclass.local`;
}

// Login with roll number + secret code. Returns Supabase session tokens for
// the client to hydrate via supabase.auth.setSession(). Role is determined
// from the users table — the client never picks it.
export const loginWithSecretCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        rollNumber: z.string().trim().min(1),
        secretCode: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");

    const roll = data.rollNumber.trim();
    const code = data.secretCode.trim();

    // Look up by roll number.
    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, auth_user_id, full_name, role, secret_code")
      .eq("roll_number", roll)
      .maybeSingle();

    if (userErr) throw new Error(userErr.message);
    if (!user) throw new Error("Roll Number not found.");
    if (!user.secret_code) {
      throw new Error("No Secret Code set. Please use First Time Setup.");
    }
    if (user.secret_code !== code) throw new Error("Secret Code incorrect.");

    const email = syntheticEmail(user.id);
    const password = `sc_${user.id}_${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) ?? "local"}`;

    // Ensure an auth.users row exists and is linked.
    let authUserId = user.auth_user_id;
    if (!authUserId) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { app_user_id: user.id, role: user.role },
        });
      if (createErr || !created?.user) {
        throw new Error(createErr?.message ?? "Could not create auth user");
      }
      authUserId = created.user.id;
      const { error: linkErr } = await supabaseAdmin
        .from("users")
        .update({ auth_user_id: authUserId })
        .eq("id", user.id);
      if (linkErr) throw new Error(linkErr.message);
    }

    const authClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
    );
    const { data: signIn, error: signInErr } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr || !signIn.session) {
      throw new Error(signInErr?.message ?? "Sign-in failed");
    }

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
      },
    };
  });

// First-time setup: user picks their own Secret Code. Roll number must
// exist and secret_code must currently be NULL.
export const setupSecretCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        rollNumber: z.string().trim().min(1),
        secretCode: z
          .string()
          .min(6, "Secret Code must be at least 6 characters")
          .max(20, "Secret Code must be at most 20 characters"),
        confirmSecretCode: z.string(),
      })
      .refine((v) => v.secretCode === v.confirmSecretCode, {
        path: ["confirmSecretCode"],
        message: "Secret Codes do not match.",
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const roll = data.rollNumber.trim();
    const code = data.secretCode.trim();

    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, secret_code")
      .eq("roll_number", roll)
      .maybeSingle();
    if (userErr) throw new Error(userErr.message);
    if (!user) throw new Error("Roll Number not found.");
    if (user.secret_code) {
      throw new Error("Secret Code already created for this Roll Number.");
    }

    const { data: existing, error: existErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("secret_code", code)
      .maybeSingle();
    if (existErr) throw new Error(existErr.message);
    if (existing) throw new Error("Secret Code already exists.");

    const { error: updateErr } = await supabaseAdmin
      .from("users")
      .update({ secret_code: code })
      .eq("id", user.id);
    if (updateErr) throw new Error(updateErr.message);

    return { ok: true as const };
  });
