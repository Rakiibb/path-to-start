import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MessageSquare,
  LayoutGrid,
  Siren,
  BarChart3,
  BookOpen,
  Bell,
  ShieldCheck,
  Users,
  Zap,
  GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "SmartClass — Smarter, Safer Classrooms" },
      {
        name: "description",
        content:
          "SmartClass helps schools with anonymous feedback, smart seating, SOS alerts, reports, rules and notifications — all in one place.",
      },
      { property: "og:title", content: "SmartClass — Smarter, Safer Classrooms" },
      {
        property: "og:description",
        content:
          "One platform for anonymous feedback, seat planning, emergencies, reports, rules and notifications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: MessageSquare,
    title: "Anonymous Class Feedback",
    desc: "Students share honest feedback without fear. Captains review, verify and act.",
  },
  {
    icon: LayoutGrid,
    title: "Smart Seat Planner",
    desc: "Plan classroom seating visually. Drag, drop and save arrangements in seconds.",
  },
  {
    icon: Siren,
    title: "SOS Emergency",
    desc: "One tap sends a real-time emergency alert to everyone in the classroom.",
  },
  {
    icon: BarChart3,
    title: "Reports",
    desc: "See feedback statistics and classroom trends with clean, live charts.",
  },
  {
    icon: BookOpen,
    title: "School Rules",
    desc: "A searchable rulebook so every student knows what is expected of them.",
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Stay up to date with real-time alerts for feedback, SOS and activity.",
  },
];

const whyPoints = [
  {
    icon: ShieldCheck,
    title: "Safe by design",
    desc: "Row-level security, role-based access and anonymous submissions built in.",
  },
  {
    icon: Zap,
    title: "Realtime everywhere",
    desc: "Feedback, SOS and notifications update instantly — no refresh needed.",
  },
  {
    icon: Users,
    title: "Built for classrooms",
    desc: "Designed with students and captains, not generic enterprise users.",
  },
  {
    icon: GraduationCap,
    title: "Simple to adopt",
    desc: "Minimal UI, no training required. Works on any modern browser.",
  },
];

const team = [
  { name: "Aarav Sharma", role: "Product & Frontend" },
  { name: "Ishita Rao", role: "Backend & Realtime" },
  { name: "Kabir Mehta", role: "Design & UX" },
  { name: "Neha Verma", role: "Data & Reports" },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Nav */}
      <header className="border-b border-sky-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/landing" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            SmartClass
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#about" className="hover:text-slate-900">About</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#why" className="hover:text-slate-900">Why SmartClass</a>
            <a href="#team" className="hover:text-slate-900">Team</a>
          </nav>
          <Link
            to="/login"
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <span className="inline-block rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
            Smarter classrooms, safer students
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-slate-900">
            The all-in-one platform for modern classrooms
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            SmartClass brings feedback, seating, emergencies, reports, rules and
            notifications together in one clean, realtime workspace.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to="/login"
              className="rounded-md bg-sky-500 px-6 py-3 text-sm font-medium text-white hover:bg-sky-600"
            >
              Login
            </Link>
            <a
              href="#about"
              className="rounded-md border border-sky-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:border-sky-300"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
              About SmartClass
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
              A classroom operating system built for students and captains
            </h2>
            <p className="mt-4 text-slate-600">
              SmartClass replaces scattered chats, paper forms and spreadsheets with a
              single minimal workspace. Students speak up anonymously, captains stay
              organised, and everyone gets notified instantly when it matters.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-8">
            <div className="grid grid-cols-2 gap-6">
              <Stat value="6" label="Core modules" />
              <Stat value="Realtime" label="Live sync" />
              <Stat value="100%" label="Anonymous feedback" />
              <Stat value="1-tap" label="SOS alerts" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-sky-50/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
              Everything a classroom needs
            </h2>
            <p className="mt-4 text-slate-600">
              Six focused tools, one consistent experience.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-sky-100 bg-white p-6 hover:border-sky-200"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-100 text-sky-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Why SmartClass
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">
            Built to be trusted, from day one
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {whyPoints.map((w) => (
            <div key={w.title} className="rounded-xl border border-sky-100 bg-white p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-100 text-sky-600">
                <w.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {w.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section id="team" className="bg-sky-50/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
              Meet the Team
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
              The people behind SmartClass
            </h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <div
                key={m.name}
                className="rounded-xl border border-sky-100 bg-white p-6 text-center"
              >
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sky-100 text-lg font-semibold text-sky-700">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {m.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sky-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-sky-500 text-white">
              <GraduationCap className="h-4 w-4" />
            </span>
            SmartClass © {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#about" className="hover:text-slate-800">About</a>
            <a href="#features" className="hover:text-slate-800">Features</a>
            <a href="#team" className="hover:text-slate-800">Team</a>
            <Link to="/login" className="hover:text-slate-800">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
    </div>
  );
}