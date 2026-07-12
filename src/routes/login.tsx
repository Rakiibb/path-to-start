import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { signInWithCode } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter your secret code.");
      return;
    }
    setLoading(true);
    try {
      await signInWithCode(code);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Welcome to SmartClass</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your secret code to continue.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Secret Code
            </label>
            <input
              id="code"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="Enter your code"
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700"
          >
            {loading ? "Signing in…" : "Continue"}
          </Button>

          <p className="text-center text-xs text-gray-400">
            Your role will be assigned automatically.
          </p>
        </form>
      </div>
    </div>
  );
}