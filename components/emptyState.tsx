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
import { useEffect, useState } from "react"
// import { IconFolderCode } from "@tabler/icons-react"

interface EmptyStateProps {
  title: string
  description: string
  buttonText?: string
  onClick?: () => void
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  buttonText,
  onClick,
  icon,
  action
}: EmptyStateProps) {

    const [role, setRole] = useState<string | null>(null)
    useEffect(() => {
    const loadRole = async () => {
      const res = await fetch("/api/me")
      const data = await res.json()
      setRole(data.role)
    }
  
    loadRole()
  }, [])
  
  return (
    <Empty className="rounded-none">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="w-14 h-14 bg-violet-50 text-violet-500 rounded-full">
          {icon}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
           {role !== "member" && action}
           {buttonText && (
          <Button variant="gradient" onClick={onClick}><Plus className="w-4 h-4" />{buttonText}</Button>
           )}
        </EmptyContent>
     
    </Empty>
  )
}