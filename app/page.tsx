"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Crown,
  Fingerprint,
  FolderKanban,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/providers/auth-provider"
import { getDefaultPathForRole } from "@/lib/auth/roles"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Logo from "@/components/ui/logo"

export default function Home() {
  const { user, profile } = useAuth()
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [mounted, setMounted] = useState(false)
  const [pricingMode, setPricingMode] = useState<"agency" | "freelancer">("agency")
  const pricing = useMemo(
    () => ({
      agency: {
        label: "Agency",
        price: "$39",
        subtitle: "per workspace / month",
        cta: "Start Agency Workspace",
        highlight: "Best for multi-client teams",
        features: [
          "Unlimited projects",
          "Team roles & permissions",
          "Client portals & approvals",
          "Branded onboarding",
          "Advanced analytics",
          "Priority support",
        ],
      },
      freelancer: {
        label: "Freelancer",
        price: "$19",
        subtitle: "per workspace / month",
        cta: "Start Freelancer Workspace",
        highlight: "Ideal for solo operators",
        features: [
          "Unlimited projects",
          "Client onboarding flows",
          "Project checklists",
          "Custom templates",
          "Invite collaborators",
          "Email support",
        ],
      },
    }),
    [],
  )

  const activePlan = pricing[pricingMode]
  const role = profile?.role || (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null)
  const dashboardHref = getDefaultPathForRole(role)

  const container: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  }

  const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  }

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
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0b0b13] dark:text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-200/70 blur-[140px] dark:bg-violet-600/30" />
          <div className="absolute right-[-120px] top-32 h-[360px] w-[360px] rounded-full bg-fuchsia-200/70 blur-[120px] dark:bg-fuchsia-500/25" />
          <div className="absolute left-[-140px] bottom-[-120px] h-[320px] w-[320px] rounded-full bg-indigo-200/70 blur-[120px] dark:bg-indigo-500/20" />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 2xl:px-10">
          <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-wide">
            <span className="flex h-9 w-9 items-center gap-2">
              {/* <BriefcaseBusiness className="h-5 w-5" /> */}
              <Logo />
            </span>
            Onvera
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-zinc-600 md:flex dark:text-white/70">
            <a href="#features" className="transition hover:text-zinc-900 dark:hover:text-white">Features</a>
            <a href="#workflow" className="transition hover:text-zinc-900 dark:hover:text-white">Workflow</a>
            <a href="#pricing" className="transition hover:text-zinc-900 dark:hover:text-white">Pricing</a>
            <a href="#faq" className="transition hover:text-zinc-900 dark:hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* <Link
                  href="/projects"
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/20 dark:text-white/80 dark:hover:border-white/40 dark:hover:text-white"
                >
                  All Projects
                </Link> */}
                <Link
                  href={dashboardHref}
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/30 dark:bg-white dark:text-[#0b0b13] dark:hover:shadow-white/20"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/20 dark:text-white/80 dark:hover:border-white/40 dark:hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/30 dark:bg-white dark:text-[#0b0b13] dark:hover:shadow-white/20"
                >
                  Start free
                </Link>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "rounded-full border border-zinc-200/80 bg-white/80 p-2 text-zinc-500 shadow-sm transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white",
                  )}
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
          </div>
        </header>

        <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 pb-20 pt-12 2xl:gap-28 2xl:px-10 2xl:pt-16">
            <motion.section
              className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div className="space-y-6" variants={item}>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/60 bg-violet-500/10 px-4 py-2 text-xs text-violet-700 dark:border-violet-400/40 dark:text-violet-100">
                <Sparkles className="h-4 w-4" />
                First 20 customers are free forever
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl lg:text-5xl 2xl:text-5xl dark:text-white">
                A modern client onboarding OS for agencies & freelancers.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-zinc-600 sm:text-base 2xl:text-base dark:text-white/70">
                Onvera turns chaotic handoffs into a premium experience. Build branded
                onboarding, coordinate teams, and keep every project moving with elegant
                checklists, templates, and approvals.
              </p>
              <div className="flex flex-wrap items-center gap-4 2xl:gap-6">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-500"
                >
                  Launch your workspace
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-6 py-3 text-sm text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/20 dark:text-white/80 dark:hover:border-white/40 dark:hover:text-white"
                >
                  View dashboard
                  <BadgeCheck className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-500 dark:text-white/60">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-violet-500 dark:text-violet-300" /> Setup in minutes
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-violet-500 dark:text-violet-300" /> Cancel anytime
                </span>
              </div>
            </motion.div>

            <motion.div
              className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-2xl shadow-violet-500/15 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-violet-500/20"
              variants={item}
            >
              <div className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-white/50">Workspace</p>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Studio Aurora</h3>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200">
                  Active
                </span>
              </div>
              <div className="mt-6 space-y-5">
                {[
                  {
                    icon: FolderKanban,
                    title: "Project Intake",
                    subtitle: "Auto-collect briefs, assets, and scope.",
                  },
                  {
                    icon: CalendarCheck,
                    title: "Timeline Lock-in",
                    subtitle: "Approve milestones with 1-click review.",
                  },
                  {
                    icon: Fingerprint,
                    title: "Access Control",
                    subtitle: "Share secure updates with clients.",
                  },
                ].map((step, index) => {
                  const Icon = step.icon
                  return (
                    <motion.div
                      key={step.title}
                      className="flex items-start gap-4 rounded-2xl border border-black/5 bg-white/80 p-4 transition hover:-translate-y-1 hover:border-black/10 dark:border-white/5 dark:bg-white/5 dark:hover:border-white/20"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.15 }}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{step.title}</p>
                        <p className="text-xs text-zinc-600 dark:text-white/60">{step.subtitle}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </motion.section>

          <section className="grid gap-8 rounded-3xl border border-black/10 bg-white/70 px-6 py-8 text-zinc-600 md:grid-cols-4 2xl:px-10 2xl:py-10 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            {[
              { label: "Projects shipped", value: "4,200+" },
              { label: "Avg. onboarding time", value: "2.4 days" },
              { label: "Templates ready", value: "65+" },
              { label: "Client satisfaction", value: "4.9/5" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-2">
                <p className="text-2xl font-semibold text-zinc-900 dark:text-white">{stat.value}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-white/50">{stat.label}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-black/10 bg-white/70 px-6 py-10 2xl:px-10 2xl:py-14 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/60 bg-violet-500/10 px-3 py-1 text-xs text-violet-700 dark:border-violet-400/40 dark:text-violet-100">
                  <Monitor className="h-4 w-4" />
                  Product tour
                </div>
                <h2 className="text-3xl font-semibold text-zinc-900 2xl:text-4xl dark:text-white">
                  Full client onboarding, shown end-to-end.
                </h2>
                <p className="max-w-2xl text-sm text-zinc-600 dark:text-white/70">
                  See onboarding intake, approvals, and project tracking in a single, polished workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  "Client onboarding",
                  "Project approvals",
                  "Project tracking",
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-8 overflow-hidden rounded-3xl border border-black/10 bg-black/95 shadow-2xl shadow-violet-500/15 dark:border-white/10">
              <video
                className="h-full w-full"
                controls
                playsInline
                poster="/video-poster.png"
              >
                <source src="/product-demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="mt-4 text-xs text-zinc-500 dark:text-white/60">
              Drop your MP4 in `public/product-demo.mp4` and a poster in `public/video-poster.png`.
            </div>
            <div className="mt-8 rounded-3xl border border-black/10 bg-gradient-to-br from-violet-100 via-white to-white p-6 dark:border-white/10 dark:from-[#1a1f2f] dark:via-[#0f131d] dark:to-[#0f131d]">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-white/50">
                  Dashboard preview
                </div>
                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-700 dark:bg-violet-500/20 dark:text-violet-100">
                  Live status
                </span>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-28 rounded-full bg-black/10 dark:bg-white/10" />
                    <div className="h-3 w-12 rounded-full bg-black/10 dark:bg-white/10" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-16 rounded-xl bg-white/80 shadow-sm dark:bg-white/5" />
                    ))}
                  </div>
                  <div className="mt-4 h-32 rounded-2xl bg-white/80 shadow-sm dark:bg-white/5" />
                </div>
                <div className="grid gap-3">
                  {[
                    "Approval timelines",
                    "Client uploads",
                    "Team status",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-black/10 bg-white/80 p-4 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                    >
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{item}</p>
                      <p className="mt-2">Always visible, always in sync.</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 text-xs text-zinc-500 dark:text-white/60">
                Replace the mock with a real screenshot in `public/dashboard-screenshot.png`.
              </div>
            </div>
          </section>

          <section id="features" className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] 2xl:gap-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/60 bg-violet-500/10 px-3 py-1 text-xs text-violet-700 dark:border-violet-400/40 dark:text-violet-100">
                <Zap className="h-4 w-4" />
                Features
              </div>
              <h2 className="text-3xl font-semibold text-zinc-900 2xl:text-4xl dark:text-white">
                Everything you need to run a premium client experience.
              </h2>
              <p className="text-sm text-zinc-600 dark:text-white/70">
                Build consistent onboarding, keep internal teams aligned, and show clients exactly
                where things stand with beautiful, status-rich dashboards.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 2xl:gap-6">
              {[
                {
                  title: "Template-first workflows",
                  description: "Reusable onboarding flows with smart defaults.",
                },
                {
                  title: "Real-time collaboration",
                  description: "Invite team members or clients with instant roles.",
                },
                {
                  title: "Progress visibility",
                  description: "Status badges, timelines, and milestone check-ins.",
                },
                {
                  title: "Secure access links",
                  description: "Controlled access for external members.",
                },
              ].map((feature) => (
                <motion.div
                  key={feature.title}
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 240, damping: 18 }}
                  className="rounded-2xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5"
                >
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-white/60">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section id="workflow" className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] 2xl:gap-14">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/60 bg-violet-500/10 px-3 py-1 text-xs text-violet-700 dark:border-violet-400/40 dark:text-violet-100">
                <Crown className="h-4 w-4" />
                Client experience
              </div>
              <h2 className="text-3xl font-semibold text-zinc-900 2xl:text-4xl dark:text-white">
                A polished workflow clients actually enjoy.
              </h2>
              <p className="text-sm text-zinc-600 dark:text-white/70">
                Share status, collect assets, and keep approvals moving without endless email threads.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                "Guided onboarding with instant access tokens",
                "Dynamic project checklists synced across teams",
                "Invite collaborators and tag responsibilities",
                "Deliverables tracked with feedback cycles",
              ].map((point) => (
                <motion.div
                  key={point}
                  className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                  whileHover={{ scale: 1.01 }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <p className="text-sm text-zinc-700 dark:text-white/80">{point}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white/70 px-6 py-10 2xl:px-10 2xl:py-14 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-white/50">Roles & Access</p>
                <h2 className="mt-2 text-3xl font-semibold text-zinc-900 2xl:text-4xl dark:text-white">
                  A clear access map for every role.
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-white/70">
                  Keep responsibilities obvious with a structured permissions table.
                </p>
              </div>
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/5">
              <div className="grid grid-cols-[1fr_1.2fr_1.8fr] gap-0 bg-zinc-100/70 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:bg-white/5 dark:text-white/50">
                <span>Role</span>
                <span>Access scope</span>
                <span>Typical actions</span>
              </div>
              {[
                {
                  role: "Admin",
                  scope: "Full workspace access",
                  actions: "Manage templates, teams, billing, and projects.",
                },
                {
                  role: "Freelancer",
                  scope: "Solo workspace",
                  actions: "Run projects, invite external members, track approvals.",
                },
                {
                  role: "Team Lead",
                  scope: "Assigned teams",
                  actions: "Review submissions, approve deliverables, lead updates.",
                },
                {
                  role: "Team Member",
                  scope: "Assigned projects",
                  actions: "Update tasks, upload assets, collaborate on checklists.",
                },
                {
                  role: "Project Member",
                  scope: "Project-specific",
                  actions: "View progress, submit assets, respond to feedback.",
                },
              ].map((row) => (
                <div
                  key={row.role}
                  className="grid grid-cols-[1fr_1.2fr_1.8fr] gap-0 border-t border-black/5 px-4 py-4 text-xs text-zinc-600 dark:border-white/10 dark:text-white/70"
                >
                  <span className="flex items-center">
                    <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-100">
                      {row.role}
                    </span>
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-white">{row.scope}</span>
                  <span>{row.actions}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="pricing" className="rounded-3xl border border-black/10 bg-white/70 px-6 py-10 2xl:px-10 2xl:py-14 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-white/50">Pricing</p>
                <h2 className="text-3xl font-semibold text-zinc-900 2xl:text-4xl dark:text-white">
                  Flexible plans for every team size.
                </h2>
                <p className="text-sm text-zinc-600 dark:text-white/70">First 20 customers get lifetime access for free.</p>
              </div>
              <div className="inline-flex rounded-full border border-black/10 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
                {(["agency", "freelancer"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPricingMode(mode)}
                    className={cn(
                      "rounded-full px-4 py-2 text-xs font-semibold transition",
                      pricingMode === mode
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white",
                    )}
                  >
                    {mode === "agency" ? "Agency" : "Freelancer"}
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              key={pricingMode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <div className="rounded-3xl border border-violet-300/50 bg-gradient-to-br from-violet-500/15 via-transparent to-transparent p-6 dark:border-violet-400/30">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-violet-600 dark:text-violet-200">{activePlan.label}</p>
                    <h3 className="mt-2 text-4xl font-semibold text-zinc-900 dark:text-white">{activePlan.price}</h3>
                    <p className="text-xs text-zinc-600 dark:text-white/60">{activePlan.subtitle}</p>
                  </div>
                  <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-700 dark:bg-violet-500/20 dark:text-violet-100">
                    {activePlan.highlight}
                  </span>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {activePlan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-white/80">
                      <CheckCircle2 className="h-4 w-4 text-violet-500 dark:text-violet-300" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Link
                  href="/register"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-lg dark:bg-white dark:text-[#0b0b13]"
                >
                  {activePlan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-4">
                {[
                  {
                    title: "Team onboarding",
                    description: "Configure roles, permissions, and access.",
                  },
                  {
                    title: "Client experience",
                    description: "Share a premium, branded workspace.",
                  },
                  {
                    title: "Automated invites",
                    description: "Send secure project links in seconds.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{item.title}</p>
                    <p className="mt-2 text-xs text-zinc-600 dark:text-white/60">{item.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          <section id="faq" className="grid gap-6 rounded-3xl border border-black/10 bg-white/70 px-6 py-10 2xl:px-10 2xl:py-14 dark:border-white/10 dark:bg-white/5">
            <h2 className="text-3xl font-semibold text-zinc-900 2xl:text-4xl dark:text-white">Frequently asked questions</h2>
            {[
              {
                q: "Is Onvera for both agencies and solo freelancers?",
                a: "Yes. Switch between agency and freelancer pricing, and customize roles accordingly.",
              },
              {
                q: "What happens after the first 20 customers?",
                a: "Standard pricing applies to new signups, but the first 20 keep lifetime free access.",
              },
              {
                q: "Do clients need an account?",
                a: "Invite clients with secure links. They can view progress without full accounts.",
              },
            ].map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{faq.q}</p>
                <p className="mt-2 text-xs text-zinc-600 dark:text-white/60">{faq.a}</p>
              </div>
            ))}
          </section>
          <motion.footer
            className="grid gap-8 rounded-3xl border border-black/10 bg-white/70 px-6 py-6 text-zinc-600 2xl:px-10 2xl:py-14 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-base font-semibold text-zinc-900 dark:text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </span>
                  Onvera
                </div>
                <p className="max-w-lg text-sm text-zinc-600 dark:text-white/60">
                  Premium client onboarding for agencies and freelancers who want everything
                  to feel cohesive, fast, and beautifully branded.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                
                {user ? (
              <>
                {/* <Link
                  href="/projects"
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/20 dark:text-white/80 dark:hover:border-white/40 dark:hover:text-white"
                >
                  All Projects
                </Link> */}
                <Link
                  href={dashboardHref}
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/30 dark:bg-white dark:text-[#0b0b13] dark:hover:shadow-white/20"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/20 dark:text-white/80 dark:hover:border-white/40 dark:hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/30 dark:bg-white dark:text-[#0b0b13] dark:hover:shadow-white/20"
                >
                  Start free
                </Link>
              </>
            )}
              </div>
            </div>
            <div className="grid gap-6 border-t border-black/10 pt-6 text-xs text-zinc-500 md:grid-cols-3 dark:border-white/10 dark:text-white/60">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Product</p>
                <p>Templates</p>
                <p>Project workflows</p>
                <p>Client approvals</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Company</p>
                <p>About</p>
                <p>Careers</p>
                <p>Contact</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Resources</p>
                <p>Help center</p>
                <p>Community</p>
                <p>Status</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-black/10 pt-6 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between dark:border-white/10 dark:text-white/50">
              <span>© 2026 Onvera. All rights reserved.</span>
              <span>First 20 customers are free forever.</span>
            </div>
          </motion.footer>
        </main>
      </div>
    </div>
  )
}
