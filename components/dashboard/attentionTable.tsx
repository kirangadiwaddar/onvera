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

const AttentionTable = ({ projects }: Props) => {

  const enrichedProjects = projects.map(p => ({
  ...p,
  templateTitle: p.template?.title ?? p.template_id
}))

  return (
    <div className="col-span-2 overflow-hidden rounded-2xl border border-destructive/20 h-full">
      <div className="flex items-center justify-between p-5 py-4 bg-destructive/5">
        <div className="text-destructive space-y-2">
          <p className="text-sm flex items-center gap-2">
            <OctagonAlert size={16} />
            Attention Required
          </p>
        </div>

        <Link href="/projects">
          <Button variant="ghost" size="sm">
            View All Projects <ArrowUp size={16} />
          </Button>
        </Link>
      </div>

      <Separator className="bg-gray-100" />

      {projects.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-center text-muted-foreground">
            No projects need attention 🎉
          </div>
        </div>
      ) : (
        <div className="mt-5 w-full overflow-auto">
          <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-4 text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {projects.map(project => {
                const formattedDate = new Date(project.created_at)
                  .toLocaleDateString("en-GB")

                return (
                  <TableRow key={project.id}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback
                          className={`font-semibold ${getAvatarColor(project.title)}`}
                        >
                          {project.title.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-40">
                        {project.title}
                      </span>
                    </TableCell>

                    <TableCell>
                      {project.template?.title ?? project.template_id}
                    </TableCell>

                    <TableCell>
                      {formattedDate}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default AttentionTable