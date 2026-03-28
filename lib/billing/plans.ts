export const PLAN_IDS = ["free", "freelancer", "agency", "agency_pro"] as const

export type PlanId = (typeof PLAN_IDS)[number]

export type PlanLimits = {
  maxProjects: number | null
  maxTemplates: number | null
  maxTeams: number | null
  maxExternalMembersPerProject: number | null
  notes: boolean
  defaultTemplates: boolean
  teamAccess: boolean
}

const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxProjects: 1,
    maxTemplates: 1,
    maxTeams: 0,
    maxExternalMembersPerProject: 1,
    notes: false,
    defaultTemplates: true,
    teamAccess: false,
  },
  freelancer: {
    maxProjects: 5,
    maxTemplates: 5,
    maxTeams: 0,
    maxExternalMembersPerProject: 5,
    notes: false,
    defaultTemplates: true,
    teamAccess: false,
  },
  agency: {
    maxProjects: null,
    maxTemplates: null,
    maxTeams: 5,
    maxExternalMembersPerProject: null,
    notes: true,
    defaultTemplates: true,
    teamAccess: true,
  },
  agency_pro: {
    maxProjects: null,
    maxTemplates: null,
    maxTeams: null,
    maxExternalMembersPerProject: null,
    notes: true,
    defaultTemplates: true,
    teamAccess: true,
  },
}

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  freelancer: "Freelancer",
  agency: "Agency",
  agency_pro: "Agency Pro",
}

export function normalizePlan(value?: string | null): PlanId {
  if (!value) return "free"
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_")
  return PLAN_IDS.includes(normalized as PlanId) ? (normalized as PlanId) : "free"
}

export function getPlanLimits(plan?: string | null): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)]
}

export function canUseNotes(plan?: string | null) {
  return getPlanLimits(plan).notes
}

export function canUseTeams(plan?: string | null) {
  return getPlanLimits(plan).teamAccess
}

export function canUseDefaultTemplates(plan?: string | null) {
  return getPlanLimits(plan).defaultTemplates
}

export function formatLimit(value: number | null) {
  if (value === null) return "Unlimited"
  return String(value)
}
