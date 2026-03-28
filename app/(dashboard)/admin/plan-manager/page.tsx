"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingState } from "@/components/loadingState"
import { EmptyState } from "@/components/emptyState"
import { PLAN_IDS, PLAN_LABELS, normalizePlan } from "@/lib/billing/plans"
import { toast } from "sonner"

type PlanRow = {
  id: string
  fullName: string
  email: string | null
  role: string | null
  plan: string | null
}

export default function PlanManagerPage() {
  const { profile, loading } = useAuth()
  const [rows, setRows] = useState<PlanRow[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const canAccess = profile?.role === "super_admin"

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => (row.email || "").toLowerCase().includes(q))
  }, [query, rows])

  const loadRows = async () => {
    setLoadingRows(true)
    try {
      const res = await fetchWithAuth("/api/admin/plan-manager", { cache: "no-store" })
      const data = await res.json().catch(() => null) as { users?: PlanRow[]; message?: string } | null
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load users")
      }
      setRows(Array.isArray(data?.users) ? data!.users! : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load users")
      setRows([])
    } finally {
      setLoadingRows(false)
    }
  }

  useEffect(() => {
    if (!canAccess) return
    void loadRows()
  }, [canAccess])

  const updatePlan = async (userId: string, nextPlan: string) => {
    setUpdatingId(userId)
    try {
      const res = await fetchWithAuth("/api/admin/plan-manager", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: nextPlan }),
      })
      const data = await res.json().catch(() => null) as { message?: string } | null
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update plan")
      }
      setRows((prev) =>
        prev.map((row) => (row.id === userId ? { ...row, plan: normalizePlan(nextPlan) } : row)),
      )
      toast.success("Plan updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update plan")
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return <LoadingState title="Loading" description="Checking permissions" />
  }

  if (!canAccess) {
    return (
      <EmptyState
        title="Access denied"
        description="You don't have permission to manage plans."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Plan Manager</h1>
        <p className="text-sm text-muted-foreground">
          Update user plans manually while payment integration is pending.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email"
          className="w-full max-w-sm"
        />
      </div>

      {loadingRows ? (
        <LoadingState title="Loading users" description="Fetching plan data" />
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
          <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3 text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{row.fullName || row.email || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{row.email || "No email"}</div>
                    </TableCell>
                    <TableCell className="capitalize">{row.role || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {row.plan || "free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={normalizePlan(row.plan)}
                          onValueChange={(value) => updatePlan(row.id, value)}
                          disabled={updatingId === row.id}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_IDS.map((planId) => (
                              <SelectItem key={planId} value={planId}>
                                {PLAN_LABELS[planId]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {updatingId === row.id ? (
                          <span className="text-xs text-muted-foreground">Saving...</span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
