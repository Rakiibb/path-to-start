export type Role = "student" | "captain";

const KEY = "smartclass_session";

export type Session = { role: Role; code: string; name: string };

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function signIn(code: string): Session | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const isCaptain = trimmed.toUpperCase().startsWith("C");
  const session: Session = {
    role: isCaptain ? "captain" : "student",
    code: trimmed,
    name: isCaptain ? "Class Captain" : "Student",
  };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}