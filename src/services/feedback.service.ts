import { supabase } from "@/integrations/supabase/client";
import { getMe } from "./users.service";
import type { Feedback, FeedbackInsert, FeedbackUpdate, FeedbackStatus } from "./types";

export async function listFeedback(status?: FeedbackStatus): Promise<Feedback[]> {
  let q = supabase.from("feedback").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createFeedback(
  input: Omit<FeedbackInsert, "created_by">,
): Promise<Feedback> {
  const me = await getMe();
  if (!me) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("feedback")
    .insert({ ...input, created_by: me.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFeedback(id: string, patch: FeedbackUpdate): Promise<Feedback> {
  const { data, error } = await supabase
    .from("feedback")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFeedback(id: string): Promise<void> {
  const { error } = await supabase.from("feedback").delete().eq("id", id);
  if (error) throw error;
}

export async function getMyLastFeedback(): Promise<Feedback | null> {
  const me = await getMe();
  if (!me) return null;
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("created_by", me.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAllFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
