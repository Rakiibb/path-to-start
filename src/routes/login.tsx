import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  GraduationCap, School, UserRound, IdCard, Lock, Eye, EyeOff, ArrowRight,
} from "lucide-react";
import { signInFixedAccount } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import classroomImg from "@/assets/login-classroom.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<"student" | "teacher">("student");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demo = loginType === "teacher"
    ? { id: "teacher01", password: "1234", label: "Default" }
    : { id: "student", password: "1234", label: "Student" };

  function selectType(type: "student" | "teacher") {
    setLoginType(type);
    setId(""); setPassword(""); setError("");
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

  return (
    <div className="min-h-screen bg-[#eef2fb]">
      <div className="mx-auto grid min-h-screen max-w-[1280px] gap-6 p-4 md:p-6 lg:grid-cols-2">
        {/* Left: brand + illustration */}
        <section className="hidden overflow-hidden rounded-3xl bg-[#eaf0fb] p-10 lg:flex lg:flex-col">
          <span className="mx-auto inline-flex items-center rounded-full bg-white/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 ring-1 ring-blue-200">
            Digital Classroom
          </span>
          <div className="mx-auto mt-8 max-w-lg text-center">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-blue-800 md:text-5xl">
              Empowering Modern <br /> Learning
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
              A transparent, safe, and smart workspace for educators and students to excel together.
            </p>
          </div>
          <div className="mt-auto flex items-end justify-center pt-8">
            <img
              src={classroomImg}
              alt="Digital classroom illustration"
              width={1024}
              height={1024}
              className="w-full max-w-lg select-none rounded-2xl"
              draggable={false}
            />
          </div>
        </section>

        {/* Right: form */}
        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-blue-900/5 md:p-10">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h2>
                <p className="text-sm text-slate-500">Sign in to access your digital workspace.</p>
              </div>
            </div>

            {/* Segmented tabs */}
            <div className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              {([
                { k: "student", label: "Student", Icon: UserRound },
                { k: "teacher", label: "Teacher", Icon: School },
              ] as const).map(({ k, label, Icon }) => {
                const active = loginType === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => selectType(k)}
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                      active
                        ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="id" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Roll Number
                </label>
                <div className="relative mt-2">
                  <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="id"
                    type="text"
                    autoComplete="username"
                    value={id}
                    onChange={(e) => { setId(e.target.value); setError(""); }}
                    placeholder="Enter your Roll Number"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                  <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-700"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember me on this device
              </label>

              <Button
                type="submit"
                disabled={loading}
                className="group h-12 w-full rounded-xl bg-blue-600 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
              >
                {loading ? "Signing in…" : (
                  <span className="inline-flex items-center gap-2">
                    Login to Dashboard
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-slate-600">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  {demo.label} demo credentials
                </div>
                <div className="grid grid-cols-[70px_1fr] gap-y-0.5">
                  <span className="text-slate-500">ID</span>
                  <code className="font-mono font-semibold text-blue-700">{demo.id}</code>
                  <span className="text-slate-500">Password</span>
                  <code className="font-mono font-semibold text-blue-700">{demo.password}</code>
                </div>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
