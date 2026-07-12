import { supabase } from "@/integrations/supabase/client";
import type { SchoolRule, SchoolRuleInsert } from "./types";

export async function listRules(): Promise<SchoolRule[]> {
  const { data, error } = await supabase
    .from("school_rules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Captains only (RLS enforces).
export async function createRule(input: SchoolRuleInsert): Promise<SchoolRule> {
  const { data, error } = await supabase
    .from("school_rules")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRule(id: string): Promise<void> {
  const { error } = await supabase.from("school_rules").delete().eq("id", id);
  if (error) throw error;
}
