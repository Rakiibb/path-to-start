import { supabase } from "@/integrations/supabase/client";
import type { UserRow, UserUpdate } from "./types";
import {
  listAllUsersAdmin,
  updateStudentAdmin,
  deleteStudentAdmin,
  resetStudentPassword,
  resetStudentSecretCode,
} from "@/lib/users.functions";
import { createStudentAccount } from "@/lib/auth.functions";

export async function getMe(): Promise<UserRow | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMe(patch: UserUpdate): Promise<UserRow> {
  const me = await getMe();
  if (!me) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", me.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Captains only (RLS enforces).
export async function listUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase.from("users").select("*").order("full_name");
  if (error) throw error;
  return data ?? [];
}

// ---- Captain admin API (server functions, service-role) ----

export type AdminUserRow = {
  id: string;
  full_name: string;
  roll_number: string | null;
  secret_code: string | null;
  height_cm: number | null;
  role: "student" | "captain";
  created_at: string;
  auth_user_id: string | null;
};

export async function adminListUsers(): Promise<AdminUserRow[]> {
  return (await listAllUsersAdmin()) as AdminUserRow[];
}

export async function adminCreateStudent(input: {
  fullName: string;
  rollNumber: string;
  password: string;
  heightCm: number | null;
  role: "student" | "captain";
}) {
  return createStudentAccount({ data: input });
}

export async function adminUpdateStudent(input: {
  id: string;
  fullName?: string;
  password?: string;
  heightCm?: number | null;
  role?: "student" | "captain";
}) {
  return updateStudentAdmin({ data: input });
}

export async function adminDeleteStudent(id: string) {
  return deleteStudentAdmin({ data: { id } });
}

export async function adminResetPassword(id: string, password: string) {
  return resetStudentPassword({ data: { id, password } });
}

export async function adminResetSecretCode(id: string) {
  return resetStudentSecretCode({ data: { id } });
}
