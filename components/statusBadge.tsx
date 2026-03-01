// src/components/StatusBadge.tsx

import { Badge } from "@/components/ui/badge"
import { statusStyles, statusLabel, type status } from "@/lib/project-status"

type Props = {
  status: status
}

export function StatusBadge({ status }: Props) {
  return (
    <Badge className={statusStyles[status]}>
      {statusLabel[status]}
    </Badge>
  )
}