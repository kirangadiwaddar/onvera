"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  FolderKanban,
  Lock,
  MessageSquareMore,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  TvMinimalPlay,
  User,
  Users,
  Workflow,
} from "lucide-react"
import Logo from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import Image from "next/image"
import dashboardDark from "./assets/dashboard-dark.png"
import dashboardLight from "./assets/dashboard-light.png"
import { useAuth } from "@/components/providers/auth-provider"
import { getDefaultPathForRole } from "@/lib/auth/roles"

const stats = [
  { value: "4,200+", label: "Projects shipped" },
  { value: "2.4 days", label: "Avg. onboarding time" },
  { value: "65+", label: "Templates ready" },
  { value: "4.9/5", label: "Client satisfaction" },
]

const features = [
  {
    icon: Workflow,
    title: "Template-first workflows",
    desc: "Reusable onboarding flows with smart defaults, approvals, and client-safe checklists.",
  },
  {
    icon: Users,
    title: "Real-time collaboration",
    desc: "Invite team members and clients with role-based access that keeps every handoff clean.",
  },
  {
    icon: FolderKanban,
    title: "Progress visibility",
    desc: "Track milestones, submissions, feedback, and status in a single premium workspace.",
  },
  {
    icon: Lock,
    title: "Secure access links",
    desc: "Share project views and approvals without exposing the entire workspace.",
  },
]

const clientPoints = [
  "Guided onboarding with instant access links",
  "Dynamic project checklists synced across teams",
  "Invite collaborators and tag responsibilities",
  "Deliverables tracked with clean feedback cycles",
]

const roles = [
  ["Admin", "Full workspace access", "Manage templates, teams, billing, and projects"],
  ["Freelancer", "Solo workspace", "Run projects, invite external members, track approvals"],
  ["Team Lead", "Assigned teams", "Review submissions, approve deliverables, lead updates"],
  ["Team Member", "Assigned projects", "Update tasks, upload assets, collaborate on checklists"],
  ["Project Member", "Project-specific", "View progress, submit assets, respond to feedback"],
]

const faqs = [
  {
    q: "Is Onvera for both agencies and solo freelancers?",
    a: "Yes. The experience works for agency workspaces and freelancer-led projects with tailored structure for both.",
  },
  {
    q: "Do clients need full accounts?",
    a: "No. Clients can access project progress, approvals, and uploads through secure links and controlled permissions.",
  },
  {
    q: "Is onboarding secured?",
    a: "Yes. Access is permissioned, links are controlled, and every workspace action is scoped to the right role.",
  },
  {
    q: "How fast can I get set up?",
    a: "Most teams can launch in a day using templates, client-ready checklists, and guided setup.",
  },
  {
    q: "Can I track approvals and revisions?",
    a: "Yes. Built-in approvals, uploads, and feedback loops keep reviews organized and transparent.",
  },
  {
    q: "Can I brand the onboarding experience?",
    a: "Yes. The product is built around making the onboarding journey feel premium, polished, and aligned with your studio brand.",
  },
]

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-gradient-to-r from-violet-100/80 via-fuchsia-100/80 to-indigo-100/80 px-3 py-1 text-xs font-normal text-black shadow-[0_4px_12px_rgba(99,102,241,0.08)]">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </div>
  )
}

function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage:
          "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"140\" height=\"140\" viewBox=\"0 0 140 140\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"140\" height=\"140\" filter=\"url(%23n)\" opacity=\"1\"/></svg>')",
      }}
    />
  )
}

export default function OnveraLandingV2Page() {
  const { user, profile } = useAuth()
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const pricingPlans = useMemo(
    () => [
      {
        id: "free",
        name: "Free",
        price_monthly: 0,
        price_yearly: 0,
        description: "Best to get started",
        highlight: false,
        features: [
          "1 active client/project",
          "Basic onboarding workflow",
          "Email notifications",
          "Limited storage",
        ],
        cta: "Get Started",
      },
      {
        id: "freelancer",
        name: "Freelancer",
        price_monthly: 399,
        price_yearly: 3999,
        description: "For solo professionals",
        highlight: false,
        features: [
          "Up to 5 clients/projects",
          "Custom onboarding workflows",
          "Email + reminders",
          "File uploads",
          "Basic templates",
        ],
        cta: "Start Free Trial",
      },
      {
        id: "agency",
        name: "Agency",
        price_monthly: 1499,
        price_yearly: 14999,
        description: "For growing teams",
        highlight: true,
        features: [
          "Unlimited clients/projects",
          "Up to 10 team members",
          "Advanced workflows",
          "Custom branding",
          "Analytics dashboard",
        ],
        cta: "Get Started",
      },
      {
        id: "pro",
        name: "Pro Agency",
        price_monthly: null ,
        price_yearly: null,
        description: "For scaling agencies",
        highlight: false,
        features: [
          "Unlimited clients/projects",
          "Unlimited team members",
          "White-label platform",
        ],
        cta: "Contact Sales",
      },
    ],
    [],
  )
  const formatPrice = (value: number) => {
    if (value === 0) return "Free"
    return `₹${value.toLocaleString("en-IN")}`
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("onvera-theme")
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const apply = (next: "light" | "dark") => {
      setTheme(next)
      document.documentElement.classList.toggle("dark", next === "dark")
    }

    if (stored === "dark" || stored === "light") {
      apply(stored)
      return
    }

    apply("dark")

    const handleChange = (event: MediaQueryListEvent) => {
      apply(event.matches ? "dark" : "light")
    }
    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [])

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("onvera-theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
    }
  }

  const userRole =
    profile?.role || (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null)
  const dashboardPath = user ? getDefaultPathForRole(userRole) : "/login"
  const displayName =
    profile?.full_name ||
    (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
    (typeof user?.email === "string" ? user.email.split("@")[0] : "") ||
    "User"
  const avatarUrl =
    (typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "") || ""
  const avatarFallback = displayName.trim().slice(0, 1).toUpperCase()
  return (
    <main className="min-h-screen bg-white dark:bg-[#030303] text-zinc-900 dark:text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.18),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.12),transparent_28%)]" />
        <Grain />

        <header className="fixed top-0 right-0 left-0 z-50 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/35 backdrop-blur-xl">
          <div className="mx-auto grid grid-cols-2 lg:grid-cols-3 w-full items-center justify-between px-5 lg:px-20 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center">
                <Logo width={40} height={40} />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wide">Onvera</p>
                <p className="text-xs text-zinc-600 dark:text-white/70">Client OS</p>
              </div>
            </div>

            <nav className="hidden items-center justify-center gap-8 text-sm text-zinc-600 dark:text-white/70 lg:flex">
              <a href="#features" className="transition hover:text-zinc-900 dark:text-white">Features</a>
              <a href="#experience" className="transition hover:text-zinc-900 dark:text-white">Experience</a>
              <a href="#pricing" className="transition hover:text-zinc-900 dark:text-white">Pricing</a>
              <a href="#faq" className="transition hover:text-zinc-900 dark:text-white">FAQ</a>
            </nav>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 text-zinc-700 dark:text-white/80 transition hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              {user ? (
                <Link
                  href={dashboardPath}
                  className="inline-flex items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 p-1 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:scale-[1.02]"
                  aria-label="Open your workspace"
                >
                  <Avatar className="h-9 w-9">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                    <AvatarFallback className="bg-violet-500 text-white">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-500 text-sm font-medium text-white shadow-[0_8px_20px_rgba(99,102,241,0.25)] transition hover:scale-[1.02] sm:h-auto sm:w-auto sm:px-4 sm:py-2"
                >
                  <span className="hidden sm:inline">Sign In</span>
                  <User className="h-4 w-4 sm:hidden" />
                </Link>
              )}
              {/* <a
                href="/login"
                className="hidden rounded-full border border-black/10 dark:border-white/10 px-4 py-2 text-sm text-zinc-600 dark:text-white/70 transition hover:border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 sm:inline-flex"
              >
                Log in
              </a>
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:scale-[1.02]"
              >
                Start now
                <ArrowRight className="h-4 w-4" />
              </a> */}
              {/* <a href="#" className="hidden lg:inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:scale-[1.02]">Enter the portal  <ArrowRight className="h-4 w-4" /></a> */}
            </div>
          </div>
        </header>

        <section className="mt-10 relative mx-auto grid w-full items-center gap-16 px-5 lg:px-20 pb-20 pt-24 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-28">
          <div>
            <SectionBadge>Premium onboarding workspace</SectionBadge>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-6 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            >
              A modern client OS - <span className="bg-gradient-to-tr from-violet-400  to-violet-700 bg-clip-text text-transparent">Onboarding System</span> for agencies and freelancers.
            </motion.h1>

            <p className="mt-6 max-w-2xl text-sm text-zinc-600 dark:text-white/70">
              Onvera turns chaotic handoffs into a premium experience. Build branded onboarding,
              coordinate teams, and keep every project moving with elegant checklists, approvals,
              and visibility your clients actually enjoy.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href={
                  user
                    ? getDefaultPathForRole(
                        profile?.role ||
                          (typeof user.user_metadata?.role === "string" ? user.user_metadata.role : null)
                      )
                    : "/login"
                }
              >
                <Button
                  variant="gradient"
                  size="lg"
                  className="rounded-full transition hover:scale-[1.02]"
                >
                  {user ? "Smart Dashboard" : "Start your client OS"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full transition hover:scale-[1.02] text-violet-600 dark:text-white"
                >
                <TvMinimalPlay className="size-6" strokeWidth={1.5} />
                 See Product Demo
                </Button>
              </Link>
            </div>

            <div className="mt-16 flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-white/70">
              <span className="rounded-full border border-black/10 dark:border-white/10 bg-gradient-to-r from-sky-100/80 to-violet-100/80 px-3 py-1.5 text-black font-normal shadow-[0_4px_12px_rgba(59,130,246,0.08)]">Setup in minutes</span>
              <span className="rounded-full border border-black/10 dark:border-white/10 bg-gradient-to-r from-indigo-100/80 to-fuchsia-100/80 px-3 py-1.5 text-black font-normal shadow-[0_4px_12px_rgba(124,58,237,0.08)]">Cancel anytime</span>
              <span className="rounded-full border border-black/10 dark:border-white/10 bg-gradient-to-r from-emerald-100/80 to-teal-100/80 px-3 py-1.5 text-black font-normal shadow-[0_4px_12px_rgba(16,185,129,0.08)]">Premium client UX</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -left-12 top-10 hidden h-28 w-28 rounded-full bg-violet-500/20 blur-3xl lg:block" />
            <div className="absolute -right-8 bottom-10 hidden h-28 w-28 rounded-full bg-sky-500/20 blur-3xl lg:block" />

            <div className="relative overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5 p-3 shadow-[0_0_80px_rgba(99,102,241,0.12)] backdrop-blur-2xl">
              {/* Prismatic Aurora Burst - Multi-layered Gradient */}
              <div
                className="absolute inset-0 z-0"
                style={{
                  background: `
                        radial-gradient(ellipse 120% 80% at 70% 20%, rgba(255, 20, 147, 0.15), transparent 50%),
                        radial-gradient(ellipse 100% 60% at 30% 10%, rgba(0, 255, 255, 0.12), transparent 60%),
                        radial-gradient(ellipse 90% 70% at 50% 0%, rgba(138, 43, 226, 0.18), transparent 65%),
                        radial-gradient(ellipse 110% 50% at 80% 30%, rgba(255, 215, 0, 0.08), transparent 40%),
                        transparent
                      `,
                }}
              />
              <div className="rounded-2xl bg-white dark:bg-[#0a0a0a] p-4 relative z-10">
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-white/70">Workspace</p>
                    <h3 className="text-xl font-semibold">Studio Aurora</h3>
                  </div>
                  <div className="rounded-full border border-black/10 dark:border-white/10 bg-gradient-to-r from-emerald-100/80 to-teal-100/80 px-3 py-1 text-xs font-normal text-black shadow-[0_4px_12px_rgba(16,185,129,0.08)]">
                    <span className="inline-block mr-2 h-2 w-2 rounded-full bg-green-600"></span>
                    Active
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[
                    ["Project Intake", "Auto-collect briefs, assets, and scope."],
                    ["Timeline Lock-in", "Approve milestones with 1-click review."],
                    ["Access Control", "Share secure updates with clients."],
                    ["Team Sync", "Keep feedback and ownership crystal clear."],
                  ].map(([title, desc], index) => (
                    <div key={title} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/[0.04] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-600 dark:text-white/70">{title}</span>
                        <span className="text-xs text-zinc-600 dark:text-white/70">0{index + 1}</span>
                      </div>
                      <p className="text-sm leading-6 text-zinc-600 dark:text-white/70">{desc}</p>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-4 rounded-3xl border border-black/10 dark:border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-white/70">Live status</p>
                      <h4 className="mt-1 text-lg font-semibold">Approvals, uploads, timelines</h4>
                    </div>
                    <BadgeCheck className="h-5 w-5 text-zinc-600 dark:text-white/70" fill="#00c951" stroke="#fff" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {[82, 61, 94].map((v, i) => (
                      <div key={i}>
                        <div className="mb-2 flex items-center justify-between text-xs text-zinc-600 dark:text-white/70">
                          <span>{["Client uploads", "Approval timelines", "Team status"][i]}</span>
                          <span>{v}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-black/5 dark:bg-white/5">
                          <div className="h-2 rounded-full bg-violet-500" style={{ width: `${v}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>


      <section id="stats" className="mx-auto w-full px-5 py-10 lg:px-20 scroll-mt-24">
        <motion.div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">


            {stats.map((item, index) => {
              const Icon = [FolderKanban, Workflow, ShieldCheck, BadgeCheck][index]
              return (
                <div
                  key={item.label}
                  className=" relative overflow-hidden rounded-[26px] border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <div className="text-3xl font-semibold text-zinc-900 dark:text-white">{item.value}</div>
                      <div className="mt-1 text-sm text-zinc-600 dark:text-white/70">{item.label}</div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 dark:border-white/10 bg-gradient-to-br from-violet-100/80 via-fuchsia-100/80 to-indigo-100/80 text-black">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-5 h-px bg-black/5 dark:bg-white/10" />
                  <p className="mt-3 text-xs text-zinc-500 dark:text-white/50">
                    Updated live as your workspace grows.
                  </p>
                </div>
              )
            })}
          </div>
        </motion.div>
      </section>

      <section id="demo" className="mx-auto w-full px-5 lg:px-20 py-8  lg:py-16 scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div
            className="rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
          >
            <SectionBadge>Product tour</SectionBadge>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
              Full client onboarding, shown end-to-end.
            </h2>
            <p className="mt-4 max-w-2xl text-sm text-zinc-600 dark:text-white/70">
              Show intake, approvals, project tracking, and team coordination in a single polished workspace.
            </p>

            <div
              className="mt-10 overflow-hidden bg-white dark:bg-[#0a0a0a]"
            >
              <div className="rounded-[1.25rem] border border-black/10 dark:border-white/10  p-5 relative overflow-hidden">
                {/* Prismatic Aurora Burst - Multi-layered Gradient */}
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    background: `
                        radial-gradient(ellipse 120% 80% at 70% 20%, rgba(255, 20, 147, 0.15), transparent 50%),
                        radial-gradient(ellipse 100% 60% at 30% 10%, rgba(0, 255, 255, 0.12), transparent 60%),
                        radial-gradient(ellipse 90% 70% at 50% 0%, rgba(138, 43, 226, 0.18), transparent 65%),
                        radial-gradient(ellipse 110% 50% at 80% 30%, rgba(255, 215, 0, 0.08), transparent 40%),
                        transparent
                      `,
                  }}
                />

                <div className="grid h-full gap-4 lg:grid-cols-[.85fr_1.15fr] relative z-10">
                  <div
                    className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-white/70">
                      <ShieldCheck className="h-4 w-4" /> Dashboard preview
                    </div>
                    <div className="mt-5 space-y-3">
                      {[
                        "Client onboarding",
                        "Project approvals",
                        "Project tracking",
                        "Role-based visibility",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 px-3 py-2.5 text-sm text-zinc-600 dark:text-white/70"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div
                      className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="text-sm text-zinc-600 dark:text-white/70">Milestone timeline</div>
                      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {["Brief", "Assets", "Review", "Launch"].map((step, i) => (
                          <div
                            key={step}
                            className="rounded-2xl border border-black/10 dark:border-white/10 p-3 text-center text-xs"
                          >
                            <div className={`mx-auto mb-2 h-2 w-2 rounded-full ${i < 3 ? "bg-green-500" : "bg-black/50 dark:bg-white/50"}`} />
                            <div className="text-zinc-600 dark:text-white/70 text-xs">{step}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div
                        className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="text-sm text-zinc-600 dark:text-white/70">Client uploads</div>
                        <div className="mt-3 text-2xl font-semibold">24</div>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-white/70">Always visible, always in sync.</p>
                      </div>
                      <div
                        className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="text-sm text-zinc-600 dark:text-white/70">Team status</div>
                        <div className="mt-3 text-2xl font-semibold">6 / 7</div>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-white/70">Aligned across approvals.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="flex items-start gap-5 rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/10 dark:border-white/10 bg-white/[0.06]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-white/70">{feature.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full px-5 lg:px-20 py-8 lg:py-16 scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-3">
          <div
            className="rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/[0.04] p-8 lg:col-span-2"
          >
            <SectionBadge>Client experience</SectionBadge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              A polished workflow clients actually enjoy.
            </h2>
            <p className="mt-4 max-w-2xl text-zinc-600 dark:text-white/70">
              Share status, collect assets, and keep approvals moving without endless email threads.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {clientPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-3xl border border-black/10 dark:border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-black">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-7 text-zinc-600 dark:text-white/70">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-[2rem] border border-black/10 dark:border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-8"
          >
            {/* Prismatic Aurora Burst - Multi-layered Gradient */}
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    background: `
                        radial-gradient(ellipse 120% 80% at 70% 20%, rgba(255, 20, 147, 0.15), transparent 50%),
                        radial-gradient(ellipse 100% 60% at 30% 10%, rgba(0, 255, 255, 0.12), transparent 60%),
                        radial-gradient(ellipse 90% 70% at 50% 0%, rgba(138, 43, 226, 0.18), transparent 65%),
                        radial-gradient(ellipse 110% 50% at 80% 30%, rgba(255, 215, 0, 0.08), transparent 40%),
                        transparent
                      `,
                  }}
                />
              
            <div className="relative z-10">
              <SectionBadge>Premium feel</SectionBadge>
            <h3 className="mt-5 text-2xl font-semibold">Built to make your process look expensive.</h3>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-white/70">
              Combine modern visuals, premium layout structure, and clean motion to make every onboarding step feel intentional.
            </p>
            <div
              className="mt-8 rounded-3xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/30 p-4"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 p-3">
                <MessageSquareMore className="h-5 w-5 text-zinc-600 dark:text-white/70" />
                <div>
                  <div className="text-sm font-medium">Client review ready</div>
                  <div className="text-xs text-zinc-600 dark:text-white/70">Approval requested 2 mins ago</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 p-3">
                <ShieldCheck className="h-5 w-5 text-zinc-600 dark:text-white/70" />
                <div>
                  <div className="text-sm font-medium">Secure access shared</div>
                  <div className="text-xs text-zinc-600 dark:text-white/70">Project portal active</div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      <section id="experience" className="mx-auto w-full px-5 lg:px-20 py-8  lg:py-16 scroll-mt-24">
        <div
          className="overflow-hidden rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/[0.04]"
        >
          <div className="border-b border-black/10 dark:border-white/10 px-[30px] py-6 lg:px-[30px]">
            <SectionBadge>Roles & access</SectionBadge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              A clear access map for every role.
            </h2>
            <p className="mt-4 max-w-2xl text-zinc-600 dark:text-white/70">
              Keep responsibilities obvious with a structured permissions table for agencies, freelancers, leads, teams, and project members.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-zinc-600 dark:text-white/70">
                <tr>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Access scope</th>
                  <th className="px-6 py-4 font-medium">Typical actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(([role, scope, action]) => (
                  <tr key={role} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white min-w-42">{role}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-white/70 min-w-52">{scope}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-white/70 min-w-xs">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* <section id="pricing" className="mx-auto w-full px-5 lg:px-20 py-8 lg:py-16 scroll-mt-24">
        <div className="lg:grid lg:grid-cols-3 space-y-5 lg:space-y-0 gap-6">
          <div
            className="relative overflow-hidden rounded-[2rem] border border-black/10 dark:border-white/10 bg-white/4 p-8 shrink-0"
          >
            <div
              className="absolute inset-0 z-0"
              style={{
                background: `
                        radial-gradient(ellipse 120% 80% at 70% 20%, rgba(255, 20, 147, 0.15), transparent 50%),
                        radial-gradient(ellipse 100% 60% at 30% 10%, rgba(0, 255, 255, 0.12), transparent 60%),
                        radial-gradient(ellipse 90% 70% at 50% 0%, rgba(138, 43, 226, 0.18), transparent 65%),
                        radial-gradient(ellipse 110% 50% at 80% 30%, rgba(255, 215, 0, 0.08), transparent 40%),
                        transparent
                      `,
              }}
            />
            <SectionBadge>Pricing</SectionBadge>
            <div className="mt-5 lg:flex lg:flex-wrap items-center justify-between gap-4 relative z-10">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Flexible plans for agency and freelancer teams.
                </h2>
                <p className="mt-4 text-zinc-600 dark:text-white/70">
                  Choose the workflow that matches how you deliver projects, from solo studios to full teams.
                </p>
              </div>
              <div className="mt-5 inline-flex items-center justify-start gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`rounded-full px-4 py-1.5 text-xs transition cursor-pointer ${billingCycle === "monthly"
                      ? "bg-violet-500 text-white"
                      : "text-zinc-600 dark:text-white/70"
                    }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("annual")}
                  className={`rounded-full px-4 py-1.5 text-xs transition cursor-pointer ${billingCycle === "annual"
                      ? "bg-violet-500 text-white"
                      : "text-zinc-600 dark:text-white/70"
                    }`}
                >
                  Annual
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="lg:grid lg:gap-6 lg:grid-cols-2 space-y-5 lg:space-y-0">
              {pricingPlans.map((plan) => {
                const rawPrice = billingCycle === "annual" ? plan.price_yearly : plan.price_monthly
                const isContactOnly = plan.id === "pro" || rawPrice === null
                const price = rawPrice ?? 0
                const isFree = price === 0
                const priceSuffix =
                  !isContactOnly && !isFree ? (billingCycle === "annual" ? "/year" : "/month") : ""
                const billingNote = isContactOnly
                  ? null
                  : isFree
                    ? "No credit card required"
                    : billingCycle === "annual"
                      ? "Billed yearly"
                      : "Billed monthly"

                return (
                  <div
                    key={plan.id}
                    className={`group relative overflow-hidden rounded-[2rem] border bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)] dark:bg-[#0a0a0a] ${
                      plan.highlight
                        ? "border-violet-400/70 dark:border-violet-400/50"
                        : "border-black/10 dark:border-white/10"
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(circle_at_bottom,rgba(124,58,237,0.18),transparent_70%)] opacity-70" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.14),transparent_70%)] opacity-50" />
                    <div className="relative rounded-[1.5rem] p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex rounded-full border border-black/10 dark:border-white/10 bg-gradient-to-r from-violet-100/80 to-fuchsia-100/80 px-3 py-1 text-xs font-normal text-black shadow-[0_4px_12px_rgba(124,58,237,0.08)]">
                            {plan.name}
                          </div>
                          <p className="mt-3 text-sm text-zinc-600 dark:text-white/70">{plan.description}</p>
                        </div>
                        {plan.highlight ? (
                          <div className="rounded-full border border-violet-200/70 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/40 dark:text-violet-200">
                            Most popular
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-6 grid gap-3">
                        {!isContactOnly ? (
                          <div className="mt-2 flex items-end gap-2">
                            <h3 className="text-4xl font-semibold text-zinc-900 dark:text-white">
                              {formatPrice(price)}
                            </h3>
                            {priceSuffix ? (
                              <span className="pb-1 text-sm text-zinc-500 dark:text-white/60">{priceSuffix}</span>
                            ) : null}
                          </div>
                        ) : null}
                        {billingNote ? (
                          <p className="text-sm text-zinc-600 dark:text-white/70">{billingNote}</p>
                        ) : null}
                        {plan.features.map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 px-4 py-3 text-sm text-zinc-600 dark:text-white/70"
                          >
                            <CheckCircle2 className="h-4 w-4 text-zinc-600 dark:text-white/70" />
                            {item}
                          </div>
                        ))}
                      </div>

                      <a
                        href="/register"
                        className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:scale-[1.02] ${
                          plan.highlight
                            ? "bg-violet-500 text-white"
                            : "border border-black/10 dark:border-white/10 text-zinc-700 dark:text-white/80"
                        }`}
                      >
                        {plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section> */}

      <section id="pricing" className="mx-auto w-full px-5 lg:px-20 py-8 lg:py-16 scroll-mt-24">
        <div className="rounded-[32px] border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 p-8">
          <SectionBadge>Pricing</SectionBadge>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Select the plan that fits your team</h2>
              <p className="mt-3 text-sm text-zinc-600 dark:text-white/70">
                Flexible tiers for solo freelancers, studios, and multi-team agencies.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-4 py-1.5 transition ${
                  billingCycle === "monthly" ? "bg-violet-500 text-white" : "text-zinc-600 dark:text-white/70"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`rounded-full px-4 py-1.5 transition ${
                  billingCycle === "annual" ? "bg-violet-500 text-white" : "text-zinc-600 dark:text-white/70"
                }`}
              >
                Annual
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-4">
            {pricingPlans.map((plan) => {
              const rawPrice = billingCycle === "annual" ? plan.price_yearly : plan.price_monthly
              const price = rawPrice ?? 0
              const suffix = billingCycle === "annual" ? "/year" : "/month"
              const isContactOnly = plan.id === "pro" || rawPrice === null
              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-[26px] border p-6 flex flex-col ${
                    plan.highlight
                      ? "border-violet-300/70 bg-gradient-to-b from-violet-50 via-violet-100/40 to-white dark:border-violet-400/60 dark:from-violet-500/15 dark:via-fuchsia-500/10 dark:to-transparent"
                      : "border-black/10 dark:border-white/10 bg-white dark:bg-white/5"
                  }`}
                >
                  {plan.highlight ? (
                    <div className="absolute right-4 top-4 rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                      Most popular
                    </div>
                  ) : null}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-white/60">{plan.description}</p>
                  {!isContactOnly ? (
                    <div className="mt-4 flex items-end gap-2">
                      <span className="text-3xl font-semibold">{formatPrice(price)}</span>
                      <span className="text-xs text-zinc-500 dark:text-white/60">{suffix}</span>
                    </div>
                  ) : null}
                  <div className="mt-5 space-y-2 text-xs text-zinc-600 dark:text-white/70">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 flex items-end">
                    <Button className="mt-6 w-full rounded-full" variant={plan.highlight ? "gradient" : "outline"}>
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-3xl px-5 py-10 lg:py-14 scroll-mt-24">
        <div className="text-center">
          <SectionBadge>Frequently asked questions</SectionBadge>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Clear answers for modern service businesses.
          </h2>
        </div>

        <div className="mt-8 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/[0.04] p-5"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold">{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? (
                  <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-white/70">
                    {faq.a}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="mx-auto w-full px-5 lg:px-20 pb-10 pt-6 lg:pb-16">
        <div
          className="relative overflow-hidden rounded-[2.5rem] border border-black/10 dark:border-white/10 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8 text-center sm:p-12"
        >
          <Grain />
          <div className="relative z-10 mx-auto max-w-3xl">
            <SectionBadge>Start now</SectionBadge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
              Turn onboarding into your competitive advantage.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-600 dark:text-white/70 sm:text-lg">
              Give every client a premium first impression with structured onboarding, clean approvals, and a workspace that feels built for modern agencies.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white"
              >
                Start now
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 px-6 py-3 text-sm font-medium text-zinc-600 dark:text-white/70"
              >
                See the product tour
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="">
        <div className="mx-auto w-full px-5 lg:px-20 py-6 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 p-6 text-xs text-zinc-600 dark:text-white/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center">
                <Logo width={40} height={40} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Onvera</p>
                <p className="text-xs text-zinc-500 dark:text-white/60">Client OS</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-zinc-600 dark:text-white/60">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Enterprise-ready security
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" /> Premium client experience
              </span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-zinc-600 dark:text-white/60">
            <p>© 2026 Onvera. All rights reserved.</p>
            <div className="flex items-center gap-4 text-zinc-600 dark:text-white/60">
              <Link href="#features" className="transition hover:text-zinc-900 dark:hover:text-white">
                Features
              </Link>
              <Link href="#pricing" className="transition hover:text-zinc-900 dark:hover:text-white">
                Pricing
              </Link>
              <Link href="#faq" className="transition hover:text-zinc-900 dark:hover:text-white">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>

      
    </main>
  )
}
