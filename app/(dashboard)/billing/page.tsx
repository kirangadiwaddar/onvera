import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage your subscription, payment method, and invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Download invoices</Button>
          <Button variant="gradient" size="sm">Upgrade plan</Button>
        </div>
      </div>

      <Separator className="bg-border" />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-violet-50 via-white to-white p-5 shadow-sm dark:border-white/10 dark:from-violet-500/10 dark:via-white/5 dark:to-white/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current plan</p>
              <h2 className="mt-2 text-xl font-semibold">Agency Pro</h2>
              <p className="text-xs text-muted-foreground">$39 per workspace / month</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              Active
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Billing cycle</span>
              <span className="text-zinc-900 dark:text-white">Monthly</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Next invoice</span>
              <span className="text-zinc-900 dark:text-white">Apr 01, 2026</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Workspace members</span>
              <span className="text-zinc-900 dark:text-white">12 / 25</span>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="outline" size="sm">Change plan</Button>
            <Button variant="destructiveLight" size="sm">Cancel subscription</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
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

      <div className="rounded-2xl border border-border bg-gradient-to-br from-white via-violet-50 to-white p-5 dark:border-white/10 dark:from-white/5 dark:via-violet-500/10 dark:to-white/5">
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
          <div className="flex items-center justify-between">
            <span>Active projects</span>
            <span className="text-zinc-900 dark:text-white">18 / Unlimited</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Client portals</span>
            <span className="text-zinc-900 dark:text-white">24 / Unlimited</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Storage</span>
            <span className="text-zinc-900 dark:text-white">32 GB / 100 GB</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-to-br from-white via-violet-50 to-white p-5 dark:border-white/10 dark:from-white/5 dark:via-violet-500/10 dark:to-white/5">
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
  )
}
