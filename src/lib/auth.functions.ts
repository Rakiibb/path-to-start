import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SECRET_CODE_RE = /^[A-Za-z0-9_.]{4,20}$/;

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const iters = 100_000;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: iters, hash: "SHA-256" },
    key, 256,
  );
  return `pbkdf2$${iters}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}
async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iters = Number(parts[1]);
  const salt = unb64(parts[2]);
  const expected = unb64(parts[3]);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: iters, hash: "SHA-256" },
    key, expected.length * 8,
  );
  const got = new Uint8Array(bits);
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i];
  return diff === 0;
}

function syntheticEmail(userId: string) {
  return `user-${userId}@smartclass.local`;
}

// Login with Roll Number + Password + Secret Code.
// If secret_code is NULL (first login), the entered code is saved.
export const loginWithSecretCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      rollNumber: z.string().trim().min(1),
      password: z.string().min(1),
      secretCode: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");

    const roll = data.rollNumber.trim();
    const pw = data.password;
    const secret = data.secretCode.trim();

    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, auth_user_id, full_name, role, secret_code, password_hash")
      .eq("roll_number", roll)
      .maybeSingle();

    if (userErr) throw new Error(userErr.message);
    if (!user) throw new Error("Invalid Roll Number.");
    if (!user.password_hash) throw new Error("Account not initialised. Contact your captain.");

    const okPw = await verifyPassword(pw, user.password_hash);
    if (!okPw) throw new Error("Incorrect Password.");

    // Secret code path.
    if (user.secret_code === null) {
      // First-time setup — validate & claim.
      if (!SECRET_CODE_RE.test(secret)) {
        throw new Error(
          "Secret Code must be 4–20 characters (letters, numbers, underscore, dot).",
        );
      }
      const { data: taken } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("secret_code", secret)
        .maybeSingle();
      if (taken) throw new Error("This Secret Code is already taken.");
      const { error: upErr } = await supabaseAdmin
        .from("users")
        .update({ secret_code: secret })
        .eq("id", user.id);
      if (upErr) throw new Error(upErr.message);
    } else if (user.secret_code !== secret) {
      throw new Error("Incorrect Secret Code.");
    }

    // Session hydration.
    const email = syntheticEmail(user.id);
    const authPw = `sc_${user.id}_${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) ?? "local"}`;

    let authUserId = user.auth_user_id;
    if (!authUserId) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email, password: authPw, email_confirm: true,
          user_metadata: { app_user_id: user.id, role: user.role },
        });
      if (createErr || !created?.user) {
        throw new Error(createErr?.message ?? "Could not create auth user");
      }
      authUserId = created.user.id;
      const { error: linkErr } = await supabaseAdmin
        .from("users").update({ auth_user_id: authUserId }).eq("id", user.id);
      if (linkErr) throw new Error(linkErr.message);
    }

    const authClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
    );
    const { data: signIn, error: signInErr } = await authClient.auth.signInWithPassword({
      email, password: authPw,
    });
    if (signInErr || !signIn.session) {
      throw new Error(signInErr?.message ?? "Sign-in failed");
    }

    // Log the login activity (best-effort)
    try {
      await supabaseAdmin.from("activity_logs").insert({
        actor_id: user.id,
        actor_name: user.full_name,
        action: user.role === "captain" ? "Captain Login" : "Student Login",
        entity: "auth",
        entity_id: user.id,
        details: { role: user.role },
      });
    } catch (_e) {
      // don't block login on logging failure
    }

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      firstLogin: user.secret_code === null,
      user: { id: user.id, full_name: user.full_name, role: user.role },
    };
  });

// Captain-only: create a student account.
export const createStudentAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      fullName: z.string().trim().min(1).max(120),
      rollNumber: z.string().trim().regex(/^\d+$/, "Roll number must contain digits only").min(1).max(40),
      password: z.string().min(6).max(100),
      heightCm: z.number().int().positive().max(300).nullable().optional(),
      role: z.enum(["student", "captain"]).default("student"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");

    // Authorize: caller must be a captain.
    const auth = getRequestHeader("authorization");
    if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = auth.slice(7);
    const { data: who, error: whoErr } = await supabaseAdmin.auth.getUser(token);
    if (whoErr || !who.user) throw new Error("Unauthorized");
    const { data: caller } = await supabaseAdmin
      .from("users").select("role").eq("auth_user_id", who.user.id).maybeSingle();
    if (!caller || caller.role !== "captain") throw new Error("Forbidden");

    const hash = await hashPassword(data.password);
    const { data: inserted, error } = await supabaseAdmin
      .from("users")
      .insert({
        full_name: data.fullName.trim(),
        roll_number: data.rollNumber.trim(),
        password_hash: hash,
        height_cm: data.heightCm ?? null,
        role: data.role,
        secret_code: null,
      })
      .select("id, full_name, roll_number, role")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Roll Number already exists.");
      throw new Error(error.message);
    }
    return inserted;
  });
