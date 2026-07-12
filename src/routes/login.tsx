import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, School, UserRound } from "lucide-react";
import { signInFixedAccount } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<"student" | "teacher">("student");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demo = loginType === "teacher"
    ? { id: "teacher", password: "1234", label: "Teacher" }
    : { id: "student", password: "1234", label: "Student" };

  function selectType(type: "student" | "teacher") {
    setLoginType(type);
    setId("");
    setPassword("");
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!id.trim()) return setError("Please enter your ID.");
    if (!password) return setError("Please enter your Password.");
    setLoading(true);
    try {
      await signInFixedAccount(loginType, id, password);
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
            Choose Student or Teacher login, then enter the ID and password.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 rounded-xl bg-gray-100 p-1.5">
          <button
            type="button"
            onClick={() => selectType("student")}
            className={`flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
              loginType === "student"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <UserRound className="h-4 w-4" />
            Student Login
          </button>
          <button
            type="button"
            onClick={() => selectType("teacher")}
            className={`flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
              loginType === "teacher"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <School className="h-4 w-4" />
            Teacher Login
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700">ID</label>
            <input
              id="id"
              type="text"
              autoComplete="username"
              value={id}
              onChange={(e) => { setId(e.target.value); setError(""); }}
              placeholder={`Enter ${demo.label.toLowerCase()} ID`}
              className={input}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Enter password"
              className={input}
            />
            {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
          </div>

          <Button type="submit" disabled={loading}
            className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700">
            {loading ? "Signing in…" : "Login"}
          </Button>

          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-gray-700">
            <div className="font-semibold text-gray-900">{demo.label} login details</div>
            <div className="mt-2 grid grid-cols-[88px_1fr] gap-y-1">
              <span className="text-gray-500">ID</span>
              <code className="font-mono font-semibold text-sky-700">{demo.id}</code>
              <span className="text-gray-500">Password</span>
              <code className="font-mono font-semibold text-sky-700">{demo.password}</code>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
