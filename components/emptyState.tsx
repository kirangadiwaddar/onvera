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
// import { IconFolderCode } from "@tabler/icons-react"

interface EmptyStateProps {
  title: string
  description: string
  buttonText?: string
  onClick?: () => void
  icon?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  buttonText,
  onClick,
  icon,
}: EmptyStateProps) {
  return (
    <Empty className="rounded-none">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="w-14 h-14 bg-violet-50 text-violet-500">
          {icon}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>

      {buttonText && (
        <EmptyContent className="flex-row justify-center gap-2">
          <Button variant="gradient" onClick={onClick}><Plus className="w-4 h-4" />{buttonText}</Button>
        </EmptyContent>
      )}
    </Empty>
  )
}