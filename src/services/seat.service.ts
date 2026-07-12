import { supabase } from "@/integrations/supabase/client";
import { getMe } from "./users.service";
import type { SeatStudent, SeatStudentUpdate } from "./types";

export type SeatRosterEntry = {
  id: string;
  full_name: string;
  roll_number: string | null;
  secret_code: string | null;
  height_cm: number | null;
  role: "student" | "captain";
};

// Any authenticated user can list the roster used by the Seat Planner.
export async function listSeatRoster(): Promise<SeatRosterEntry[]> {
  const { data, error } = await supabase.rpc("list_seat_roster");
  if (error) throw error;
  return (data ?? []) as SeatRosterEntry[];
}

export async function listSeatStudents(): Promise<SeatStudent[]> {
  const { data, error } = await supabase
    .from("seat_students")
    .select("*")
    .order("roll_number", { nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

// Captains only (RLS enforces).
export async function createSeatStudent(input: {
  name: string;
  roll_number?: string;
  height_cm?: number;
}): Promise<SeatStudent> {
  const me = await getMe();
  if (!me) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("seat_students")
    .insert({ ...input, created_by: me.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSeatStudent(
  id: string,
  patch: SeatStudentUpdate,
): Promise<SeatStudent> {
  const { data, error } = await supabase
    .from("seat_students")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSeatStudent(id: string): Promise<void> {
  const { error } = await supabase.from("seat_students").delete().eq("id", id);
  if (error) throw error;
}
