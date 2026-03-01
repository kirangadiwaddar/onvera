import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Plus } from "lucide-react"
import { Spinner } from "./ui/spinner"
// import { IconFolderCode } from "@tabler/icons-react"

interface EmptyStateProps {
  title?: string
  description?: string
  buttonText?: string
  icon?: React.ReactNode
}

export function LoadingState({
  title,
  description,
  buttonText,
  icon,
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