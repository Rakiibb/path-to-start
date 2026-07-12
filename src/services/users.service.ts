import { supabase } from "@/integrations/supabase/client";
import type { UserRow, UserUpdate } from "./types";

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
