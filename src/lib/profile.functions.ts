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

async function currentAppUser() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const auth = getRequestHeader("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const { data: who, error } = await supabaseAdmin.auth.getUser(auth.slice(7));
  if (error || !who.user) throw new Error("Unauthorized");
  const { data: me } = await supabaseAdmin
    .from("users")
    .select("id, password_hash")
    .eq("auth_user_id", who.user.id)
    .maybeSingle();
  if (!me) throw new Error("Account not found");
  return { supabaseAdmin, me };
}

export const changeMyPassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6).max(100),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, me } = await currentAppUser();
    if (!me.password_hash || !(await verifyPassword(data.currentPassword, me.password_hash))) {
      throw new Error("Current password is incorrect.");
    }
    const password_hash = await hashPassword(data.newPassword);
    const { error } = await supabaseAdmin
      .from("users").update({ password_hash }).eq("id", me.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeMySecretCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      currentPassword: z.string().min(1),
      newSecretCode: z.string().trim().min(4).max(20),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, me } = await currentAppUser();
    if (!SECRET_CODE_RE.test(data.newSecretCode)) {
      throw new Error("Secret Code must be 4–20 characters (letters, numbers, underscore, dot).");
    }
    if (!me.password_hash || !(await verifyPassword(data.currentPassword, me.password_hash))) {
      throw new Error("Current password is incorrect.");
    }
    const { data: taken } = await supabaseAdmin
      .from("users").select("id").eq("secret_code", data.newSecretCode).maybeSingle();
    if (taken && taken.id !== me.id) throw new Error("This Secret Code is already taken.");
    const { error } = await supabaseAdmin
      .from("users").update({ secret_code: data.newSecretCode }).eq("id", me.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });