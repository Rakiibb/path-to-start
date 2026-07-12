import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TablesUpdate } from "@/integrations/supabase/types";

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
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

async function assertCaptain() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const auth = getRequestHeader("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = auth.slice(7);
  const { data: who, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !who.user) throw new Error("Unauthorized");
  const { data: caller } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("auth_user_id", who.user.id)
    .maybeSingle();
  if (!caller || caller.role !== "captain") throw new Error("Forbidden");
  return { supabaseAdmin, callerId: caller.id };
}

// Captain-only: list all users with sensitive fields.
export const listAllUsersAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await assertCaptain();
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, full_name, roll_number, secret_code, height_cm, role, created_at, auth_user_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Update editable fields.
export const updateStudentAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      fullName: z.string().trim().min(1).max(120).optional(),
      password: z.string().min(6).max(100).optional().or(z.literal("")),
      heightCm: z.number().int().positive().max(300).nullable().optional(),
      role: z.enum(["student", "captain"]).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await assertCaptain();
    const patch: TablesUpdate<"users"> = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName;
    if (data.heightCm !== undefined) patch.height_cm = data.heightCm;
    if (data.role !== undefined) patch.role = data.role;
    if (data.password && data.password.length > 0) {
      patch.password_hash = await hashPassword(data.password);
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("users").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Reset password only.
export const resetStudentPassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      password: z.string().min(6).max(100),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await assertCaptain();
    const password_hash = await hashPassword(data.password);
    const { error } = await supabaseAdmin
      .from("users").update({ password_hash }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Reset (clear) secret code.
export const resetStudentSecretCode = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await assertCaptain();
    const { error } = await supabaseAdmin
      .from("users").update({ secret_code: null }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Delete a user (with self-guard).
export const deleteStudentAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin, callerId } = await assertCaptain();
    if (callerId === data.id) throw new Error("You cannot delete yourself.");
    const { data: target } = await supabaseAdmin
      .from("users").select("auth_user_id").eq("id", data.id).maybeSingle();
    const { error } = await supabaseAdmin.from("users").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (target?.auth_user_id) {
      await supabaseAdmin.auth.admin.deleteUser(target.auth_user_id);
    }
    return { ok: true };
  });