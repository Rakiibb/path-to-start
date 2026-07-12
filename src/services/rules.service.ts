import { supabase } from "@/integrations/supabase/client";
import type { SchoolRule, SchoolRuleInsert, SchoolRuleUpdate } from "./types";

export const RULE_CATEGORIES = [
  "Academic",
  "Discipline",
  "Attendance",
  "Examination",
  "Dress Code",
  "Library",
  "Laboratory",
  "Sports",
  "General",
] as const;

export async function listRules(): Promise<SchoolRule[]> {
  const { data, error } = await supabase
    .from("school_rules")
    .select("*")
    .order("rule_number", { ascending: true, nullsFirst: false })
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

export async function updateRule(
  id: string,
  patch: SchoolRuleUpdate,
): Promise<SchoolRule> {
  const { data, error } = await supabase
    .from("school_rules")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRule(id: string): Promise<void> {
  const { error } = await supabase.from("school_rules").delete().eq("id", id);
  if (error) throw error;
}
