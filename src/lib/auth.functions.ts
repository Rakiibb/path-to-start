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
      secretCode: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");

    const roll = data.rollNumber.trim();
    const pw = data.password;
    const secret = (data.secretCode ?? "").trim();

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
      if (!secret) throw new Error("Please enter a Secret Code to set up your account.");
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
    }
    // If already set, Secret Code is not required on subsequent logins.

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

// Simple fixed login for the requested two-option auth screen.
// Student uses ID: student / Password: 1234
// Teacher uses ID: teacher / Password: 1234 (stored as captain internally for permissions).
export const loginWithFixedAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      accountType: z.enum(["student", "teacher"]),
      id: z.string().trim().min(1),
      password: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");

    const account = data.accountType === "teacher"
      ? {
          id: "teacher",
          password: "1234",
          fullName: "Teacher",
          rollNumber: "fixed_teacher",
          secretCode: "fixed_teacher",
          role: "student" as const,
          activity: "Teacher Login",
        }
      : {
          id: "student",
          password: "1234",
          fullName: "Student",
          rollNumber: "fixed_student",
          secretCode: "fixed_student",
          role: "student" as const,
          activity: "Student Login",
        };

    if (data.id.trim().toLowerCase() !== account.id || data.password !== account.password) {
      throw new Error("Invalid ID or password.");
    }

    const fixedUserSelect = "id, auth_user_id, full_name, role";
    let fixedUser: {
      id: string;
      auth_user_id: string;
      full_name: string;
      role: "student" | "captain";
    } | null = null;

    const fetchedUser = await supabaseAdmin
      .from("users")
      .select(fixedUserSelect)
      .eq("secret_code", account.secretCode)
      .not("auth_user_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (fetchedUser.error) throw new Error(fetchedUser.error.message);
    if (fetchedUser.data?.auth_user_id) {
      fixedUser = {
        id: fetchedUser.data.id,
        auth_user_id: fetchedUser.data.auth_user_id,
        full_name: fetchedUser.data.full_name,
        role: fetchedUser.data.role,
      };
    }

    if (!fixedUser) {
      const id = crypto.randomUUID();
      const email = `user-${id}@smartclass.local`;
      const authPw = `sc_${id}_${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) ?? "local"}`;
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: authPw,
        email_confirm: true,
        user_metadata: { app_user_id: id, role: account.role },
      });
      if (createErr || !created?.user) {
        throw new Error(createErr?.message ?? "Could not create auth user");
      }

      const inserted = await supabaseAdmin
        .from("users")
        .insert({
          id,
          auth_user_id: created.user.id,
          full_name: account.fullName,
          roll_number: account.rollNumber,
          secret_code: account.secretCode,
          role: account.role,
          is_demo: true,
        })
        .select(fixedUserSelect)
        .single();

      if (inserted.error) {
        await supabaseAdmin.auth.admin.deleteUser(created.user.id);
        if (inserted.error.code !== "23505") throw new Error(inserted.error.message);
        const existing = await supabaseAdmin
          .from("users")
          .select(fixedUserSelect)
          .eq("secret_code", account.secretCode)
          .not("auth_user_id", "is", null)
          .limit(1)
          .maybeSingle();
        if (existing.error || !existing.data?.auth_user_id) {
          throw new Error(existing.error?.message ?? "Could not prepare account.");
        }
        fixedUser = {
          id: existing.data.id,
          auth_user_id: existing.data.auth_user_id,
          full_name: existing.data.full_name,
          role: existing.data.role,
        };
      } else {
        if (!inserted.data.auth_user_id) throw new Error("Could not prepare account.");
        fixedUser = {
          id: inserted.data.id,
          auth_user_id: inserted.data.auth_user_id,
          full_name: inserted.data.full_name,
          role: inserted.data.role,
        };
      }
    }

    const user = fixedUser;
    // Ensure the fixed account never carries elevated privileges.
    if (user.role !== account.role) {
      await supabaseAdmin
        .from("users")
        .update({ role: account.role })
        .eq("id", user.id);
      user.role = account.role;
    }
    const email = `user-${user.id}@smartclass.local`;
    const authPw = `sc_${user.id}_${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) ?? "local"}`;

    await supabaseAdmin.auth.admin.updateUserById(user.auth_user_id, {
      password: authPw,
      user_metadata: { app_user_id: user.id, role: user.role },
    });

    const authClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
    );
    const { data: signIn, error: signInErr } = await authClient.auth.signInWithPassword({
      email,
      password: authPw,
    });
    if (signInErr || !signIn.session) {
      throw new Error(signInErr?.message ?? "Sign-in failed");
    }

    try {
      await supabaseAdmin.from("activity_logs").insert({
        actor_id: user.id,
        actor_name: account.fullName,
        action: account.activity,
        entity: "auth",
        entity_id: user.id,
        details: { role: data.accountType },
      });
    } catch (_e) {
      // don't block login on logging failure
    }

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      firstLogin: false,
      user: { id: user.id, full_name: account.fullName, role: user.role },
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
