"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FolderKanban,
  Globe,
  LayoutGrid,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Workflow,
} from "lucide-react"
import Logo from "@/components/ui/logo"
import { Button } from "@/components/ui/button"

const steps = [
  {
    title: "Branded intake",
    desc: "Collect briefs, assets, and context with premium client forms in minutes.",
    badge: "01",
  },
  {
    title: "Approval moments",
    desc: "Deliverables move faster with clean review steps and one-click approvals.",
    badge: "02",
  },
  {
    title: "Live visibility",
    desc: "Teams and clients always know what is done, next, and blocked.",
    badge: "03",
  },
]

const featureCards = [
  {
    icon: Workflow,
    title: "Smart workflows",
    desc: "Template-first onboarding with automated reminders and status gating.",
  },
  {
    icon: Users,
    title: "Client portals",
    desc: "Share controlled access that feels premium without full accounts.",
  },
  {
    icon: FolderKanban,
    title: "Project clarity",
    desc: "Every task, approval, and deadline stays visible in one workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Secure handoffs",
    desc: "Role-based access and scoped links keep assets protected.",
  },
]

const testimonials = [
  {
    name: "Evelyn Parker",
    role: "Studio Lead",
    quote:
      "Onvera cleaned up our handoff chaos. Clients now praise how premium everything feels.",
  },
  {
    name: "Ravi Malhotra",
    role: "Brand Designer",
    quote:
      "The onboarding checklist + approvals cut our launch time by nearly half.",
  },
  {
    name: "Maya Chen",
    role: "Agency Ops",
    quote:
      "We finally have visibility across teams without endless status meetings.",
  },
]

const faqs = [
  {
    q: "Is Onvera for agencies and freelancers?",
    a: "Yes. Plans are built for solo studios through multi-team agencies.",
  },
  {
    q: "Do clients need accounts?",
    a: "No. Clients use secure links for uploads, approvals, and updates.",
  },
  {
    q: "Can we customize branding?",
    a: "Yes. Add your logo, colors, and a custom onboarding experience.",
  },
  {
    q: "How fast can we launch?",
    a: "Most teams are live in a day with templates and guided setup.",
  },
]

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </div>
  )
}

function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.08]"
      style={{
        backgroundImage:
          "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"140\" height=\"140\" viewBox=\"0 0 140 140\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"140\" height=\"140\" filter=\"url(%23n)\" opacity=\"1\"/></svg>')",
      }}
    />
  )
}

export default function LandingTwoPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const pricingPlans = useMemo(
    () => [
      {
        id: "starter",
        name: "Starter",
        price_monthly: 19,
        price_yearly: 190,
        highlight: false,
        desc: "For new studios",
        features: [
          "2 active clients",
          "Starter onboarding templates",
          "Email reminders",
          "Basic analytics",
        ],
        cta: "Start Starter",
      },
      {
        id: "studio",
        name: "Studio",
        price_monthly: 49,
        price_yearly: 490,
        highlight: true,
        desc: "Best for growing teams",
        features: [
          "Unlimited clients",
          "Custom workflows",
          "Branded portals",
          "Advanced approvals",
          "Priority support",
        ],
        cta: "Start Studio",
      },
      {
        id: "agency",
        name: "Agency",
        price_monthly: 99,
        price_yearly: 990,
        highlight: false,
        desc: "Scaling agencies",
        features: [
          "Unlimited teams",
          "White-label experience",
          "Custom domain",
          "Automation & integrations",
          "Dedicated success",
        ],
        cta: "Talk to Sales",
      },
    ],
    [],
  )

  const formatPrice = (value: number) => `$${value}`

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.25),transparent_35%),radial-gradient(circle_at_70%_20%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.14),transparent_40%)]" />
        <Grain />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Logo width={28} height={28} />
            </div>
            <div>
              <p className="text-sm font-semibold">Onvera</p>
              <p className="text-xs text-white/60">Client OS</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#flows" className="transition hover:text-white">
              Workflows
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </nav>
          <Link href="/login" className="hidden md:inline-flex">
            <Button variant="ghost" className="rounded-full text-white/80 hover:text-white">
              Sign in
            </Button>
          </Link>
        </header>

        <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pb-28">
          <div>
            <SectionBadge>Onboarding & client ops</SectionBadge>
            <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Manage clients{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">
                smarter, faster, better.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-sm text-white/70">
              Onvera gives agencies and freelancers a premium onboarding system with branded
              checklists, approvals, and live client updates.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button variant="gradient" size="lg" className="rounded-full">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full border border-white/10 text-white/80 hover:text-white"
              >
                Watch demo
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-4 text-xs text-white/60">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <BadgeCheck className="h-4 w-4 text-emerald-400" />
                Setup in minutes
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <BadgeCheck className="h-4 w-4 text-emerald-400" />
                Client-ready UX
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <BadgeCheck className="h-4 w-4 text-emerald-400" />
                Cancel anytime
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-violet-500/30 blur-3xl" />
            <div className="absolute -right-6 bottom-6 h-24 w-24 rounded-full bg-sky-500/30 blur-3xl" />
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
              <div className="rounded-[24px] border border-white/10 bg-[#0a0a0a] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/60">Workspace overview</p>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Live
                  </span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Active clients</p>
                    <p className="mt-2 text-2xl font-semibold">24</p>
                    <p className="mt-2 text-xs text-emerald-300">+12% this month</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Approvals</p>
                    <p className="mt-2 text-2xl font-semibold">92%</p>
                    <p className="mt-2 text-xs text-emerald-300">On-time reviews</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Milestone velocity</span>
                      <span>Last 30 days</span>
                    </div>
                    <div className="mt-4 h-16 rounded-2xl bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-indigo-500/30" />
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                  <MessageSquareMore className="h-4 w-4" />
                  Client approvals delivered without email threads.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="flows" className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <SectionBadge>Simple steps</SectionBadge>
            <h2 className="mt-4 text-2xl font-semibold">Simple steps to smarter onboarding</h2>
            <p className="mt-3 text-sm text-white/70">
              Each project runs through a clean, repeatable flow that keeps clients confident and teams aligned.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>{step.badge}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5">Step</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-xs text-white/60">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 text-sm text-white/70">
                <LayoutGrid className="h-4 w-4" />
                Live intake cards
              </div>
              <div className="mt-4 space-y-3">
                {["Project scope", "Brand assets", "Client approvals"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 text-sm text-white/70">
                <CreditCard className="h-4 w-4" />
                Billing & approvals
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                Automate payment milestones alongside approvals and deliverables.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <SectionBadge>Client experience</SectionBadge>
            <h2 className="mt-4 text-2xl font-semibold">Exchange updates globally in seconds</h2>
            <p className="mt-3 text-sm text-white/70">
              Send assets, collect feedback, and approve work across time zones with structured updates.
            </p>
            <Button className="mt-5 rounded-full" variant="outline">
              Explore features <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 text-sm text-white/60">
              <Globe className="h-4 w-4" />
              Currency-ready client portals
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {["Milestone review", "Asset uploads", "Approval status", "Timeline locks"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-indigo-500/20 p-4 text-xs text-white/70">
              Clients always know what is next, what is pending, and what needs review.
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-[26px] border border-white/10 bg-white/5 p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm text-white/70">{card.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
          <SectionBadge>Pricing</SectionBadge>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Select the plan that fits your team</h2>
              <p className="mt-3 text-sm text-white/70">
                Flexible tiers for solo freelancers, studios, and multi-team agencies.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-4 py-1.5 transition ${
                  billingCycle === "monthly" ? "bg-white text-black" : "text-white/70"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`rounded-full px-4 py-1.5 transition ${
                  billingCycle === "annual" ? "bg-white text-black" : "text-white/70"
                }`}
              >
                Annual
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => {
              const price = billingCycle === "annual" ? plan.price_yearly : plan.price_monthly
              const suffix = billingCycle === "annual" ? "/year" : "/month"
              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-[26px] border p-6 ${
                    plan.highlight
                      ? "border-violet-400/60 bg-gradient-to-b from-violet-500/15 via-fuchsia-500/10 to-transparent"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  {plan.highlight ? (
                    <div className="absolute right-4 top-4 rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-200">
                      Most popular
                    </div>
                  ) : null}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-xs text-white/60">{plan.desc}</p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-3xl font-semibold">{formatPrice(price)}</span>
                    <span className="text-xs text-white/60">{suffix}</span>
                  </div>
                  <div className="mt-5 space-y-2 text-xs text-white/70">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Button
                    className="mt-6 w-full rounded-full"
                    variant={plan.highlight ? "gradient" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14">
        <SectionBadge>Success stories</SectionBadge>
        <h2 className="mt-4 text-2xl font-semibold">Loved by modern studios</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-[24px] border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-center gap-2 text-xs text-amber-300">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4" />
                ))}
              </div>
              <p className="mt-4 text-sm text-white/80">“{item.quote}”</p>
              <div className="mt-4 text-xs text-white/50">
                {item.name} · {item.role}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-4xl px-5 py-14">
        <SectionBadge>FAQs</SectionBadge>
        <h2 className="mt-4 text-2xl font-semibold">Simple answers for onboarding teams</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <div
                key={faq.q}
                className="rounded-[20px] border border-white/10 bg-white/5 p-5"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? (
                  <p className="mt-3 text-sm text-white/70">{faq.a}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-xs text-white/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                <Logo width={24} height={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Onvera</p>
                <p className="text-xs text-white/60">Client OS</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Enterprise-ready security
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" /> Premium client experience
              </span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p>© 2026 Onvera. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="#features">Features</Link>
              <Link href="#pricing">Pricing</Link>
              <Link href="#faq">FAQ</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
