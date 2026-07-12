import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { signInWithCode } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!rollNumber.trim()) return setError("Please enter your Roll Number.");
    if (!password) return setError("Please enter your Password.");
    if (!code.trim()) return setError("Please enter your Secret Code.");
    setLoading(true);
    try {
      const session = await signInWithCode(rollNumber, password, code);
      if (session.firstLogin) toast.success("Secret Code created successfully.");
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Welcome to SmartClass</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in with your Roll Number, Password and Secret Code.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="roll" className="block text-sm font-medium text-gray-700">Roll Number</label>
            <input id="roll" type="text" autoComplete="username" value={rollNumber}
              onChange={(e) => { setRollNumber(e.target.value); setError(""); }}
              placeholder="e.g. 21" className={input} />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Enter your password" className={input} />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">Secret Code</label>
            <input id="code" type="text" autoComplete="off" value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              placeholder="e.g. rahim007" className={input} />
            <p className="mt-1 text-xs text-gray-400">
              First-time users: pick a unique handle (4–20 chars, letters / numbers / _ / .).
            </p>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <Button type="submit" disabled={loading}
            className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700">
            {loading ? "Signing in…" : "Login"}
          </Button>

          <p className="text-center text-xs text-gray-400">Your role is assigned automatically.</p>
        </form>
      </div>
    </div>
  );
}
