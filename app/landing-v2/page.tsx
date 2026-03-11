"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Check,
  ChevronRight,
  Monitor,
  Moon,
  Play,
  Sparkles,
  Sun,
} from "lucide-react"
import Logo from "@/components/ui/logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function LandingV2() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [mounted, setMounted] = useState(false)

  const highlights = useMemo(
    () => [
      {
        label: "Client onboarding",
        text: "Collect briefs, assets, and access requests in a single guided flow.",
      },
      {
        label: "Project approvals",
        text: "Review deliverables with instant approvals and version clarity.",
      },
      {
        label: "Project tracking",
        text: "Live status updates across every milestone and checklist.",
      },
    ],
    [],
  )

  const metrics = useMemo(
    () => [
      { value: "7x", label: "Faster onboarding" },
      { value: "85%", label: "Less status chasing" },
      { value: "29", label: "Templates ready" },
    ],
    [],
  )

  const testimonials = useMemo(
    () => [
      {
        quote:
          "Onvera helped us turn onboarding into a polished experience our clients love. The approval flow is incredibly smooth.",
        name: "Marina Patel",
        role: "Agency Owner",
      },
      {
        quote:
          "We finally have a single workspace for assets, feedback, and approvals. No more scattered threads.",
        name: "Luis Romero",
        role: "Product Lead",
      },
      {
        quote:
          "Our clients feel guided without hand-holding. The onboarding templates are a game changer.",
        name: "Asha Nair",
        role: "Freelancer",
      },
    ],
    [],
  )

  const faqs = useMemo(
    () => [
      {
        q: "Can I customize onboarding per client?",
        a: "Yes. Templates let you adjust workflows, checklists, and access per project.",
      },
      {
        q: "Do clients need an account?",
        a: "No. Secure links give clients access to the onboarding workspace instantly.",
      },
      {
        q: "How do approvals work?",
        a: "Each deliverable includes status, feedback, and approval controls in one view.",
      },
      {
        q: "Is Onvera built for freelancers?",
        a: "Absolutely. Freelancer workspaces keep onboarding simple without losing polish.",
      },
    ],
    [],
  )

  useEffect(() => {
    setMounted(true)
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem("onvera-theme")
    if (saved === "light" || saved === "dark" || saved === "system") {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return
    const root = document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const apply = (isDark: boolean) => {
      root.classList.toggle("dark", isDark)
    }

    let cleanup: (() => void) | undefined

    if (theme === "dark") {
      apply(true)
    } else if (theme === "light") {
      apply(false)
    } else {
      apply(media.matches)
      const handleChange = (event: MediaQueryListEvent) => apply(event.matches)
      media.addEventListener("change", handleChange)
      cleanup = () => media.removeEventListener("change", handleChange)
    }

    window.localStorage.setItem("onvera-theme", theme)

    return () => cleanup?.()
  }, [theme, mounted])

  return (
    <div className="min-h-screen bg-[#f7f3ff] text-zinc-900 dark:bg-[#0b0b14] dark:text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-10%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-300/60 blur-[160px] dark:bg-violet-500/20" />
          <div className="absolute right-[-10%] top-[15%] h-[320px] w-[320px] rounded-full bg-indigo-300/50 blur-[160px] dark:bg-indigo-500/20" />
          <div className="absolute left-[-10%] top-[25%] h-[280px] w-[280px] rounded-full bg-fuchsia-200/50 blur-[160px] dark:bg-fuchsia-500/15" />
        </div>

        <header className="relative z-10 mx-auto mt-6 max-w-7xl rounded-2xl border border-violet-200/60 bg-white/70 backdrop-blur shadow-lg shadow-violet-500/10 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
              <Logo width={26} />
              Onvera
            </Link>
            <nav className="hidden items-center gap-8 text-sm text-zinc-600 dark:text-white/70 md:flex">
              <a href="#overview" className="hover:text-zinc-900 dark:hover:text-white">Overview</a>
              <a href="#features" className="hover:text-zinc-900 dark:hover:text-white">Features</a>
              <a href="#testimonials" className="hover:text-zinc-900 dark:hover:text-white">Stories</a>
              <a href="#faq" className="hover:text-zinc-900 dark:hover:text-white">FAQs</a>
            </nav>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full border border-violet-200/70 bg-white/80 p-2 text-zinc-600 shadow-sm transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
                    aria-label="Theme switcher"
                  >
                    {theme === "light" ? (
                      <Sun className="h-4 w-4" />
                    ) : theme === "dark" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Monitor className="h-4 w-4" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-36">
                  <DropdownMenuItem onSelect={() => setTheme("light")}>
                    <Sun /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTheme("dark")}>
                    <Moon /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTheme("system")}>
                    <Monitor /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-500"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 pb-24 pt-12">
          <section id="overview" className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/60 bg-white/70 px-3 py-1 text-xs text-violet-700 dark:border-violet-400/40 dark:bg-white/10 dark:text-violet-200">
                <Sparkles className="h-4 w-4" />
                Exceptional product onboarding in minutes
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Smarter client onboarding. Stronger project delivery.
              </h1>
              <p className="max-w-xl text-sm text-zinc-600 dark:text-white/70">
                Onvera turns onboarding chaos into a structured, premium experience. Collect assets, manage approvals, and
                keep every project on track from a single workspace.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-500"
                >
                  Launch your workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/80 px-5 py-3 text-sm text-zinc-700 transition hover:border-violet-300/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  Watch demo
                  <Play className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-white/60">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-violet-500" /> Branded client portal
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-violet-500" /> Approval-ready checklists
                </span>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="rounded-[32px] border border-violet-200/70 bg-white/80 p-4 shadow-2xl shadow-violet-500/15 backdrop-blur dark:border-white/10 dark:bg-white/5"
            >
              <div className="overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-100 via-white to-white p-4 dark:border-white/10 dark:from-[#1a1f2f] dark:via-[#0f131d] dark:to-[#0f131d]">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-28 rounded-full bg-black/10 dark:bg-white/10" />
                  <div className="h-3 w-14 rounded-full bg-black/10 dark:bg-white/10" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-16 rounded-xl bg-white/80 shadow-sm dark:bg-white/5" />
                  ))}
                </div>
                <div className="mt-4 h-40 rounded-2xl bg-white/80 shadow-sm dark:bg-white/5" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="h-20 rounded-xl bg-white/80 shadow-sm dark:bg-white/5" />
                  <div className="h-20 rounded-xl bg-white/80 shadow-sm dark:bg-white/5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500 dark:text-white/60">
                Replace with a real dashboard screenshot in `public/dashboard-screenshot.png`.
              </p>
            </motion.div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[0.45fr_0.55fr]">
            <div className="space-y-5">
              <h2 className="text-3xl font-semibold">Creating elegant onboarding doesn’t have to be painful.</h2>
              <p className="text-sm text-zinc-600 dark:text-white/70">
                Onvera standardizes client intake, approval workflows, and delivery tracking so every project feels calm and
                predictable.
              </p>
              <div className="space-y-3">
                {[
                  "Instant access links for clients",
                  "Live status visibility across milestones",
                  "Reusable onboarding templates",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-zinc-700 dark:text-white/80">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-200">
                      <Check className="h-4 w-4" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-violet-200/60 bg-white/80 p-6 shadow-xl shadow-violet-500/10 dark:border-white/10 dark:bg-white/5">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Checklist previews",
                  "Approval timelines",
                  "Client uploads",
                  "Team activity",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-violet-200/50 bg-white/90 p-4 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{item}</p>
                    <p className="mt-2">Keep every detail visible in one place.</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="features" className="grid gap-8 lg:grid-cols-[0.4fr_0.6fr]">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-white/50">Product preview</p>
              <h2 className="text-3xl font-semibold">Professional product demos, fast and easy</h2>
              <p className="text-sm text-zinc-600 dark:text-white/70">
                Showcase your onboarding flow with a full-width demo and clear sections that guide every stakeholder.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-violet-200/60 bg-white/80 p-5 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{item.label}</p>
                  <p className="mt-2">{item.text}</p>
                </motion.div>
              ))}
              <motion.div
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-violet-200/60 bg-white/80 p-5 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Dashboards that update live</p>
                <p className="mt-2">Keep everyone updated with real-time project status.</p>
              </motion.div>
            </div>
          </section>

          <section className="rounded-[32px] border border-violet-200/60 bg-violet-950 px-6 py-12 text-white shadow-2xl shadow-violet-500/30 dark:border-white/10">
            <div className="grid gap-8 lg:grid-cols-[0.5fr_0.5fr]">
              <div>
                <h2 className="text-3xl font-semibold">Tell the story behind every project</h2>
                <p className="mt-3 text-sm text-white/70">
                  Create consistent onboarding narratives with timelines, checklists, and approvals built in.
                </p>
                <Link
                  href="/register"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-violet-700"
                >
                  See how it works
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-4">
                {[
                  "Onboarding progress",
                  "Approvals in context",
                  "Client-ready updates",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-xs">
                    <p className="text-sm font-semibold">{item}</p>
                    <p className="mt-2 text-white/70">Keep stakeholders aligned without busywork.</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 rounded-3xl border border-violet-200/60 bg-white/80 px-6 py-8 text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-semibold">The Onvera impact</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-violet-200/50 bg-white/90 p-6 text-center dark:border-white/10 dark:bg-white/5">
                  <p className="text-3xl font-semibold text-violet-600 dark:text-violet-300">{metric.value}</p>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-white/60">{metric.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.4fr_0.6fr]">
            <div>
              <h2 className="text-3xl font-semibold">Scale the way you deliver</h2>
              <p className="mt-3 text-sm text-zinc-600 dark:text-white/70">
                Choose a workspace built for agencies, freelancers, and fast-moving teams.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                "Client portals",
                "Approval checkpoints",
                "Multi-project views",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-violet-200/50 bg-white/90 p-4 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{item}</p>
                  <p className="mt-2">Designed to keep work moving.</p>
                </div>
              ))}
            </div>
          </section>

          <section id="testimonials" className="rounded-3xl border border-violet-200/60 bg-white/80 px-6 py-10 dark:border-white/10 dark:bg-white/5">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-white/50">What teams say</p>
              <h2 className="mt-2 text-3xl font-semibold">Trusted by fast-growing teams</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {testimonials.map((item) => (
                <div key={item.name} className="rounded-2xl border border-violet-200/50 bg-white/90 p-5 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  <p className="text-sm text-zinc-900 dark:text-white">“{item.quote}”</p>
                  <p className="mt-4 text-xs font-semibold text-violet-700 dark:text-violet-200">{item.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-white/50">{item.role}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="faq" className="grid gap-6 rounded-3xl border border-violet-200/60 bg-white/80 px-6 py-10 dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-white/50">FAQs</p>
              <h2 className="mt-2 text-3xl font-semibold">CRM-style clarity for onboarding</h2>
            </div>
            <div className="grid gap-3">
              {faqs.map((item) => (
                <div key={item.q} className="rounded-2xl border border-violet-200/50 bg-white/90 p-5 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{item.q}</p>
                  <p className="mt-2">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-violet-200/60 bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 px-6 py-12 text-white shadow-2xl shadow-violet-500/30 dark:border-white/10">
            <div className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
              <div>
                <h2 className="text-3xl font-semibold">The fastest way to create standout onboarding</h2>
                <p className="mt-2 text-sm text-white/80">Start your workspace and invite clients today.</p>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-violet-700"
              >
                Start now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
