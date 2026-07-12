import { supabase } from "@/integrations/supabase/client";
import { getMe } from "./users.service";
import type { SosRequest, SosStatus } from "./types";

export async function listSos(): Promise<SosRequest[]> {
  const { data, error } = await supabase
    .from("sos_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSos(input: {
  location?: string;
  message?: string;
}): Promise<SosRequest> {
  const me = await getMe();
  if (!me) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("sos_requests")
    .insert({ user_id: me.id, location: input.location, message: input.message })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Captains only (RLS enforces).
export async function updateSosStatus(id: string, status: SosStatus): Promise<SosRequest> {
  const { data, error } = await supabase
    .from("sos_requests")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
