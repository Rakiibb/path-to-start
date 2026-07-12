import { supabase } from "@/integrations/supabase/client";
import { loginWithSecretCode } from "./auth.functions";

export type Role = "student" | "captain";

export type Session = {
  id: string;
  role: Role;
  name: string;
};

// Sign in with a secret code. Delegates to the server, then hydrates the
// Supabase session on the client so RLS-protected queries work.
export async function signInWithCode(secretCode: string): Promise<Session> {
  const result = await loginWithSecretCode({ data: { secretCode } });
  const { error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  if (error) throw error;
  return {
    id: result.user.id,
    role: result.user.role as Role,
    name: result.user.full_name,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Fetch the current app user's profile (users row). Returns null when signed
// out. RLS restricts this to the user's own row.
export async function getCurrentAppUser(): Promise<Session | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, role")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, name: data.full_name, role: data.role as Role };
}