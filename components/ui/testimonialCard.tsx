
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface TestimonialCardProps {
  message: string
  name: string
  role: string
  avatar?: string
  username?: string
}

export default function TestimonialCard({
  message,
  name,
  role,
  avatar,
  username,
}: TestimonialCardProps) {
  return (
    <figure
      className={cn(
        "relative h-full w-64 cursor-pointer overflow-hidden rounded-xl border p-4",
        "border-gray-950/[.1] bg-white hover:bg-white",
        "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]"
      )}
    >
      <div className="flex flex-row items-center gap-2">
        <Avatar className="h-8 w-8">
          {avatar && <AvatarImage src={avatar} alt={name} />}
          <AvatarFallback className="border font-semibold uppercase text-primary">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium dark:text-white">{name}</figcaption>
          <p className="text-xs font-medium text-muted-foreground dark:text-white/40">
            {role}
          </p>
        </div>
      </div>
      <blockquote className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
        {message}
      </blockquote>
    </figure>
  )
}
