"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, CircleX, Infinity, LockKeyhole } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/components/providers/auth-provider"
import { EmptyState } from "@/components/emptyState"
import { createClient } from "@/lib/supabase/client"
import { getPlanLimits, normalizePlan, PLAN_IDS, PLAN_LABELS } from "@/lib/billing/plans"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/auth/client-fetch"

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}

export default function BillingPage() {
  const { profile, user, refreshProfile } = useAuth()
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [workspaceSwitching, setWorkspaceSwitching] = useState(true)
  const workspaceSwitchTimerRef = useRef<number | null>(null)
  const ensureOwnerWorkspace = (items: WorkspaceItem[]): WorkspaceItem[] => {
    if (!user?.id) return items
    const ownsFlag =
      typeof window !== "undefined" && window.localStorage.getItem("onvera:ownsWorkspace") === "true"
    const ownsByProfile =
      profile?.role === "super_admin" ||
      (typeof user.user_metadata?.role === "string" && user.user_metadata.role === "super_admin")
    if (!(ownsFlag || ownsByProfile)) return items
    if (items.some((workspace) => workspace.id === user.id)) return items
    const fallbackName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Workspace"
    const ownerWorkspace: WorkspaceItem = {
      id: user.id,
      name: String(fallbackName),
      email: user.email || null,
      plan: typeof profile?.plan === "string" ? profile.plan : "free",
      role: "super_admin",
    }
    return [ownerWorkspace, ...items]
  }
  const [updatingPlan, setUpdatingPlan] = useState(false)
  const [usageLoading, setUsageLoading] = useState(false)
  const [projectCount, setProjectCount] = useState(0)
  const [templateCount, setTemplateCount] = useState(0)
  const [teamCount, setTeamCount] = useState(0)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const currentWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null
  const currentPlan = normalizePlan(
    currentWorkspace?.plan || profile?.plan || (typeof user?.user_metadata?.plan === "string" ? user.user_metadata.plan : null),
  )
  const planLimits = useMemo(() => getPlanLimits(currentPlan), [currentPlan])
  const canManagePlan = currentWorkspace?.role === "super_admin" || profile?.role === "super_admin"
  const stripeLinked = Boolean(profile?.stripe_customer_id || profile?.stripe_subscription_id)
  const isFreePlan = currentPlan === "free"
  const isSuperAdmin = currentWorkspace?.role === "super_admin" || profile?.role === "super_admin"
  const renderLimit = (value: number | null) =>
    value === null ? <Infinity className="inline h-4 w-4 align-middle" /> : value

  const pricingPlans = useMemo(
    () => [
      {
        id: "free",
        name: "Free",
        price_monthly: 0,
        price_yearly: 0,
        description: "For getting started",
        highlight: false,
        features: [
          "1 Project",
          "1 Template (default templates included)",
          "No Team access",
          "No Project notes",
          "1 External member per project",
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
          "Up to 5 projects",
          "Up to 5 templates (choose from all)",
          "No team access",
          "No project notes",
          "Up to 5 external members per project",
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
          "Unlimited projects",
          "Unlimited templates",
          "Up to 5 teams",
          "Project notes",
          "Unlimited external members",
        ],
        cta: "Get Started",
      },
      {
        id: "agency_pro",
        name: "Agency Pro",
        price_monthly: null,
        price_yearly: null,
        description: "For scaling agencies",
        highlight: false,
        features: [
          "Unlimited projects",
          "Unlimited templates",
          "Unlimited teams",
          "Project notes",
          "Unlimited external members",
        ],
        cta: "Contact Sales",
      },
    ],
    [],
  )

  const handlePlanChange = async (nextPlan: string) => {
    if (!canManagePlan || !user?.id) return
    const normalized = normalizePlan(nextPlan)
    if (normalized === currentPlan) return
    try {
      setUpdatingPlan(true)
      const supabase = createClient()
      const { error } = await supabase
        .from("profiles")
        .update({ plan: normalized })
        .eq("id", user.id)
      if (error) {
        throw new Error(error.message)
      }
      toast.success("Plan updated")
      await refreshProfile()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update plan")
    } finally {
      setUpdatingPlan(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    let active = true
    const loadUsage = async () => {
      setUsageLoading(true)
      try {
        const [projectsRes, templatesRes, teamsRes] = await Promise.all([
          fetchWithAuth("/api/projects?summary=1", { cache: "no-store" }),
          fetchWithAuth("/api/templates", { cache: "no-store" }),
          fetchWithAuth("/api/teams", { cache: "no-store" }),
        ])
        const projectsData = await projectsRes.json().catch(() => null) as { projects?: unknown[] } | null
        const templatesData = await templatesRes.json().catch(() => null) as { templates?: unknown[] } | null
        const teamsData = await teamsRes.json().catch(() => null) as { teams?: unknown[] } | null
        if (!active) return
        setProjectCount(Array.isArray(projectsData?.projects) ? projectsData!.projects!.length : 0)
        setTemplateCount(Array.isArray(templatesData?.templates) ? templatesData!.templates!.length : 0)
        setTeamCount(Array.isArray(teamsData?.teams) ? teamsData!.teams!.length : 0)
      } catch {
        if (!active) return
        setProjectCount(0)
        setTemplateCount(0)
        setTeamCount(0)
      } finally {
        if (active) setUsageLoading(false)
      }
    }
    void loadUsage()
    return () => {
      active = false
    }
  }, [user?.id, selectedWorkspaceId])

  useEffect(() => {
    if (!user?.id) return
    let active = true
    const loadWorkspaces = async () => {
      try {
        const res = await fetchWithAuth("/api/workspaces", { cache: "no-store" })
        const data = await res.json().catch(() => null) as { workspaces?: WorkspaceItem[] } | null
        if (!active) return
        let items = Array.isArray(data?.workspaces) ? data.workspaces : []
        items = ensureOwnerWorkspace(items)
        setWorkspaces(items)
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("onvera:workspace") : null
        const preferred = stored && items.some((item) => item.id === stored) ? stored : null
        const fallback = items[0]?.id || null
        const nextId =
          preferred ||
          (items.some((item) => item.id === user.id) ? user.id : fallback)
        setSelectedWorkspaceId(nextId)
        setWorkspaceSwitching(false)
      } catch {
        setWorkspaces([])
        setWorkspaceSwitching(false)
      }
    }
    void loadWorkspaces()
    const handleWorkspace = () => {
      if (typeof window === "undefined") return
      setWorkspaceSwitching(true)
      if (workspaceSwitchTimerRef.current !== null) {
        window.clearTimeout(workspaceSwitchTimerRef.current)
      }
      workspaceSwitchTimerRef.current = window.setTimeout(() => {
        setWorkspaceSwitching(false)
      }, 1000)
      void loadWorkspaces()
    }
    window.addEventListener("workspace:changed", handleWorkspace)
    window.addEventListener("storage", handleWorkspace)
    return () => {
      active = false
      window.removeEventListener("workspace:changed", handleWorkspace)
      window.removeEventListener("storage", handleWorkspace)
      if (workspaceSwitchTimerRef.current !== null) {
        window.clearTimeout(workspaceSwitchTimerRef.current)
      }
    }
  }, [user?.id])

  const workspaceReady = !workspaceSwitching && (!workspaces.length || !!selectedWorkspaceId)

  if (!workspaceReady) {
    return (
      <EmptyState
        icon={<LockKeyhole className="h-6 w-6 text-destructive" />}
        title="Loading billing"
        description="Checking your workspace permissions."
      />
    )
  }

  if (!isSuperAdmin) {
    return (
        <EmptyState
          icon={<LockKeyhole className="h-6 w-6 text-destructive" />}
          title="Billing is managed by your admin"
          description="Only workspace admins can view and update billing settings."
        />
    )
  }

  if (isFreePlan) {
    return (
      <div className="relative overflow-hidden px-6 py-6">
        <div className="pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full bg-violet-200/50 blur-3xl dark:bg-violet-500/20" />
        <div className="pointer-events-none absolute -left-20 top-52 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/15" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Billing</p>
              <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">Upgrade your plan</h1>
              <p className="text-sm text-muted-foreground">
                Compare plans and upgrade when you are ready to unlock team access and notes.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 p-1 text-xs shadow-sm dark:border-white/10 dark:bg-white/5">
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

          <div className="grid gap-6 lg:grid-cols-4">
            {pricingPlans.map((plan) => {
              const rawPrice = billingCycle === "annual" ? plan.price_yearly : plan.price_monthly
              const price = rawPrice ?? 0
              const suffix = billingCycle === "annual" ? "/year" : "/month"
              const isContactOnly = plan.id === "agency_pro" || rawPrice === null
              const isCurrent = currentPlan === plan.id
              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-[26px] border p-6 flex flex-col shadow-sm ${
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
                      <span className="text-3xl font-semibold">₹{price.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-zinc-500 dark:text-white/60">{suffix}</span>
                    </div>
                  ) : null}
                  <div className="mt-5 space-y-2 text-xs text-zinc-600 dark:text-white/70">
                    {plan.features.map((feature) => {
                      const isNegative = feature.toLowerCase().startsWith("no ")
                      return (
                        <div key={feature} className="flex items-center gap-2">
                          {isNegative ? (
                            <CircleX className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          {feature}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex-1 flex items-end">
                    <Button
                      className="mt-6 w-full rounded-full"
                      variant={plan.highlight ? "gradient" : "outline"}
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Current plan" : plan.cta}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden px-6 py-6">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/50 blur-3xl dark:bg-violet-500/20" />
      <div className="pointer-events-none absolute right-[-6rem] top-24 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-500/15" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Billing</p>
            <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">Manage billing</h1>
            <p className="text-sm text-muted-foreground">
              Keep tabs on your subscription, payment method, and invoices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">Download invoices</Button>
            <Button variant="gradient" size="sm">Upgrade plan</Button>
          </div>
        </div>

        <Separator className="bg-border/70" />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[26px] border border-border bg-gradient-to-br from-violet-50 via-white to-white p-6 shadow-sm dark:border-white/10 dark:from-violet-500/10 dark:via-white/5 dark:to-white/5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current plan</p>
                <h2 className="mt-2 text-2xl font-semibold">{PLAN_LABELS[currentPlan]}</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Projects: {renderLimit(planLimits.maxProjects)} · Templates: {renderLimit(planLimits.maxTemplates)} ·
                  Teams: {renderLimit(planLimits.maxTeams)}
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                Active
              </Badge>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Billing cycle</span>
                <span className="text-zinc-900 dark:text-white">Monthly</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Next invoice</span>
                <span className="text-zinc-900 dark:text-white">Apr 01, 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Stripe status</span>
                <span className="text-zinc-900 dark:text-white">
                  {stripeLinked ? "Linked" : "Not linked"}
                </span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" disabled={!stripeLinked}>
                {stripeLinked ? "Manage subscription" : "Stripe not linked"}
              </Button>
              <Button variant="destructiveLight" size="sm">Cancel subscription</Button>
            </div>
          </div>

          <div className="rounded-[26px] border border-border bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Payment method</p>
                <h2 className="mt-2 text-lg font-semibold">Primary card</h2>
              </div>
              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                Default
              </Badge>
            </div>

            <div className="mt-4 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-500 to-fuchsia-500 p-4 text-white shadow-lg">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/70">
                <span>Onvera</span>
                <span>VISA</span>
              </div>
              <div className="mt-6 text-lg font-semibold tracking-[0.2em]">
                •••• •••• •••• 4242
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-white/80">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Card holder</div>
                  <div>Onvera Studio</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Expires</div>
                  <div>08/27</div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Billing emails go to <span className="font-medium text-zinc-900 dark:text-white">billing@onvera.test</span>.
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" size="sm">Update card</Button>
              <Button variant="outline" size="sm">Add payment method</Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Usage</p>
                <h2 className="mt-2 text-lg font-semibold">Workspace usage</h2>
              </div>
              <Link href="/teams" className="text-xs text-violet-600 hover:underline dark:text-violet-300">
                Manage team
              </Link>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-xl border border-black/5 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <span>Active projects</span>
                <span className="text-zinc-900 dark:text-white">
                  {usageLoading ? "..." : projectCount} / {renderLimit(planLimits.maxProjects)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-black/5 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <span>Templates</span>
                <span className="text-zinc-900 dark:text-white">
                  {usageLoading ? "..." : templateCount} / {renderLimit(planLimits.maxTemplates)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-black/5 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <span>Teams</span>
                <span className="text-zinc-900 dark:text-white">
                  {usageLoading ? "..." : teamCount} / {renderLimit(planLimits.maxTeams)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-black/5 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <span>External members / project</span>
                <span className="text-zinc-900 dark:text-white">
                  {renderLimit(planLimits.maxExternalMembersPerProject)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-white via-violet-50 to-white p-5 shadow-sm dark:border-white/10 dark:from-white/5 dark:via-violet-500/10 dark:to-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Invoices</h2>
              <Button variant="outline" size="sm">Export CSV</Button>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { id: "INV-1024", status: "Paid", amount: "$39.00", date: "Mar 01, 2026" },
                    { id: "INV-1023", status: "Paid", amount: "$39.00", date: "Feb 01, 2026" },
                    { id: "INV-1022", status: "Paid", amount: "$39.00", date: "Jan 01, 2026" },
                  ].map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{invoice.amount}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Download</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
