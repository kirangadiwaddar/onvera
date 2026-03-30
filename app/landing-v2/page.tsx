"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Layers,
  FileText,
  Zap,
  PenTool,
  Briefcase,
  Box,
  MessageSquare,
  Users,
  ShieldCheck,
} from "lucide-react";

export default function LandingV2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      title: "Client-ready workspaces",
      description:
        "Invite clients into a focused space to upload assets, answer your checklist, and stay on track.",
      icon: <Users className="h-6 w-6 text-violet-200" />,
    },
    {
      title: "Structured templates",
      description:
        "Launch repeatable onboarding flows with templates tailored to each service line.",
      icon: <Layers className="h-6 w-6 text-violet-200" />,
    },
    {
      title: "Proofing without chaos",
      description:
        "Keep feedback, approvals, and files in one place with clear status updates.",
      icon: <MessageSquare className="h-6 w-6 text-violet-200" />,
    },
    {
      title: "Team visibility",
      description:
        "Track project status, deadlines, and ownership across teams and clients.",
      icon: <ShieldCheck className="h-6 w-6 text-violet-200" />,
    },
  ];

  const examples = [
    { title: "Website onboarding", icon: <PenTool className="h-6 w-6" /> },
    { title: "Brand identity kickoff", icon: <Briefcase className="h-6 w-6" /> },
    { title: "Product launch checklist", icon: <Box className="h-6 w-6" /> },
    { title: "Content pipeline", icon: <FileText className="h-6 w-6" /> },
    { title: "Client approval flow", icon: <MessageSquare className="h-6 w-6" /> },
    { title: "Retainer handoff", icon: <Users className="h-6 w-6" /> },
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "₹0",
      description: "Perfect for trying Onvera with one project.",
      features: [
        "1 project",
        "1 template",
        "1 external member per project",
        "Default templates included",
      ],
    },
    {
      name: "Freelancer",
      price: "₹399",
      period: "/month",
      description: "For solo operators with repeatable services.",
      features: [
        "Up to 5 projects",
        "Up to 5 templates",
        "Up to 5 external members per project",
        "Priority support",
      ],
      popular: true,
    },
    {
      name: "Agency",
      price: "₹1499",
      period: "/month",
      description: "For teams managing multiple clients.",
      features: [
        "Unlimited projects",
        "Unlimited templates",
        "Up to 5 teams",
        "Project notes and approvals",
      ],
    },
  ];

  const footerLinks = {
    product: ["Features", "Templates", "Client access", "Pricing"],
    company: ["About", "Careers", "Privacy", "Terms"],
    support: ["Help center", "Contact", "Community"],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-violet-400/30">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-500/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-[140px]" />
      </div>

      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/90">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Onvera</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/templates" className="hover:text-white transition">Templates</Link>
            <Link href="/projects" className="hover:text-white transition">Projects</Link>
            <div className="flex items-center gap-1 text-slate-300">
              Resources <ChevronDown className="h-4 w-4" />
            </div>
            <Link href="/billing" className="hover:text-white transition">Pricing</Link>
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400"
            >
              Get started
            </Link>
          </div>

          <button
            className="text-slate-300 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-white/10 bg-slate-950/90 px-6 py-6 md:hidden">
            <div className="flex flex-col gap-4 text-sm font-medium text-slate-200">
              <Link href="/" className="hover:text-white">Home</Link>
              <Link href="/templates" className="hover:text-white">Templates</Link>
              <Link href="/projects" className="hover:text-white">Projects</Link>
              <Link href="/billing" className="hover:text-white">Pricing</Link>
              <Link href="/login" className="hover:text-white">Sign in</Link>
              <Link href="/register" className="rounded-full bg-violet-500 px-4 py-2 text-center text-white">Get started</Link>
            </div>
          </div>
        ) : null}
      </header>

      <main className="pt-24">
        <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-24 pt-24 text-center md:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-violet-100 backdrop-blur">
            <Zap className="h-4 w-4 text-violet-200" />
            Client onboarding, simplified
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
            Deliver client projects faster with a calm, clear workspace.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-slate-300">
            Onvera keeps client onboarding, file collection, and approvals in one organized flow. Give your team and your
            clients a space that feels professional and easy to use.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-full bg-violet-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-violet-500/20 transition hover:bg-violet-400"
            >
              Start free
            </Link>
            <Link
              href="/templates"
              className="rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-base font-semibold text-white/90 backdrop-blur transition hover:bg-white/10"
            >
              Browse templates
            </Link>
          </div>

          <div className="mt-16 grid w-full gap-6 md:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl shadow-violet-500/5 backdrop-blur"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/5 py-24 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-white md:text-4xl">Popular onboarding flows</h2>
              <p className="mt-4 text-slate-300">
                Spin up a workspace in minutes with templates designed for agencies, studios, and client teams.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {examples.map((example, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-violet-400/40 hover:bg-white/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/60 text-violet-200">
                    {example.icon}
                  </div>
                  <p className="text-base font-medium text-slate-100">{example.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-white md:text-4xl">Pricing for every stage</h2>
              <p className="mt-4 text-slate-300">
                Start free and upgrade when you need more projects, templates, or team collaboration.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {pricingPlans.map((plan, idx) => (
                <div
                  key={idx}
                  className={`relative flex h-full flex-col rounded-3xl border p-8 backdrop-blur ${
                    plan.popular
                      ? "border-violet-400/70 bg-white/10 shadow-2xl shadow-violet-500/20"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  {plan.popular ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-4 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </div>
                  ) : null}
                  <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                  <p className="mt-2 text-sm text-slate-300">{plan.description}</p>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    {plan.period ? <span className="text-sm text-slate-300">{plan.period}</span> : null}
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-slate-200">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-violet-300" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-8 rounded-full py-3 text-center text-sm font-semibold transition ${
                      plan.popular
                        ? "bg-violet-500 text-white hover:bg-violet-400"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    Get started
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/80 py-16 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/80">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-semibold">Onvera</span>
              </div>
              <p className="mt-4 max-w-md text-sm text-slate-300">
                Onvera helps teams collect client assets, track onboarding progress, and keep projects moving without
                messy email threads.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Product</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {footerLinks.product.map((link) => (
                  <li key={link}>
                    <Link href="#" className="hover:text-white">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Company</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {footerLinks.company.map((link) => (
                  <li key={link}>
                    <Link href="#" className="hover:text-white">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Support</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {footerLinks.support.map((link) => (
                  <li key={link}>
                    <Link href="#" className="hover:text-white">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-400">
            © Onvera Studio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
