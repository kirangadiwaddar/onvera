import { StatusBadge } from "@/components/statusBadge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ArrowUp, OctagonAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Project } from "@/types/project"
import { getAvatarColor } from "@/lib/get-avatar-colors"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from '../ui/separator'
import Link from 'next/link'

type Props = {
  projects: Project[]
}

const attentionTable = ({ projects }: Props) => {

  return (
    <div className="col-span-2 h-full w-full overflow-hidden rounded-2xl border border-destructive/20 dark:border-destructive/30">
      <div className="flex items-center justify-between bg-destructive/5 p-5 py-4 dark:bg-destructive/10">
        <div className="text-destructive space-y-2">
          <p className="text-sm flex items-center gap-2">
            <OctagonAlert size={16} />
            Attention Required 
          </p>
          {/* <p className="text-xs">({projects.length}) Projects Need Action</p> */}
        </div>

        <Link href="/projects">
          <Button variant="ghost" size="sm" className="hover:no-underline hover:bg-white dark:hover:bg-white/5">
            View All Projects <ArrowUp size={16} />
          </Button>
        </Link>
      </div>

      <Separator className="bg-border" />

      {projects.length === 0 ? (
        <div className="flex items-center justify-center h-1/2">
          <div className="text-center text-base text-muted-foreground">
            No projects need attention &nbsp;&nbsp; 🎉
          </div>
        </div>) :
        <div className="mt-5 w-full overflow-auto">
          <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-4 [&_tr]:border-zinc-100 text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {projects.map(project => {
                const formattedDate = new Date(project.createdAt)
                  .toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })

                return (
                  <TableRow key={project.id}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={project.avatarSrc} />
                        <AvatarFallback className={`font-semibold ${getAvatarColor(project.title)}`}>
                          {project.title.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-50 truncate">{project.title}</span>
                    </TableCell>

                    <TableCell>{project.templateTitle}</TableCell>
                    <TableCell>{formattedDate}</TableCell>

                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>}
    </div>
  )
}

export default attentionTable
