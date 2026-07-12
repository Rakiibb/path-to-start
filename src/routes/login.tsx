import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { signInWithCode } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!rollNumber.trim()) return setError("Please enter your roll number.");
    if (!code.trim()) return setError("Please enter your secret code.");
    setLoading(true);
    try {
      await signInWithCode(rollNumber, code);
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
          <p className="mt-1 text-sm text-gray-500">Sign in with your roll number and secret code.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="roll" className="block text-sm font-medium text-gray-700">
              Roll Number
            </label>
            <input
              id="roll"
              type="text"
              autoComplete="username"
              value={rollNumber}
              onChange={(e) => { setRollNumber(e.target.value); setError(""); }}
              placeholder="e.g. 21"
              className={input}
            />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Secret Code
            </label>
            <input
              id="code"
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              placeholder="Enter your code"
              className={input}
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <Button type="submit" disabled={loading} className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700">
            {loading ? "Signing in…" : "Login"}
          </Button>

          <Link
            to="/setup"
            className="flex h-11 w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            First Time Setup
          </Link>

          <p className="text-center text-xs text-gray-400">Your role is assigned automatically.</p>
        </form>
      </div>
    </div>
  );
}
