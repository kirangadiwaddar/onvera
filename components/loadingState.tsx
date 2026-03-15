import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "./ui/spinner"
// import { IconFolderCode } from "@tabler/icons-react"

interface EmptyStateProps {
  title?: string
  description?: string
}

export function LoadingState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <Spinner className="size-6 text-violet-500" />
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
