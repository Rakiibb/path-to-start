import { supabase } from "@/integrations/supabase/client";
import { getMe } from "./users.service";
import type { FeedbackVote } from "./types";

export async function listVotes(feedbackId: string): Promise<FeedbackVote[]> {
  const { data, error } = await supabase
    .from("feedback_votes")
    .select("*")
    .eq("feedback_id", feedbackId);
  if (error) throw error;
  return data ?? [];
}

// One vote per user per feedback (UNIQUE constraint). Users cannot vote on
// their own feedback (RLS enforces).
export async function castVote(feedbackId: string, vote: boolean): Promise<FeedbackVote> {
  const me = await getMe();
  if (!me) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("feedback_votes")
    .upsert(
      { feedback_id: feedbackId, user_id: me.id, vote },
      { onConflict: "feedback_id,user_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeVote(feedbackId: string): Promise<void> {
  const { error } = await supabase
    .from("feedback_votes")
    .delete()
    .eq("feedback_id", feedbackId);
  if (error) throw error;
}
