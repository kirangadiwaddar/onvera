export type status =
  | "completed"
  | "overdue"
  | "waiting"
  | "ongoing"
  | "onhold"

export const statusStyles: Record<status, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
  waiting: "bg-amber-100 text-amber-700",
  ongoing: "bg-blue-100 text-blue-700",
  onhold: "bg-violet-100 text-violet-700",
}

export const statusLabel: Record<status, string> = {
  completed: "Completed",
  overdue: "Overdue",
  waiting: "Waiting",
  ongoing: "Ongoing",
  onhold: "On Hold",
}