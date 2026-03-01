
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TestimonialCardProps {
  message: string
  name: string
  role: string
  avatar?: string
}

export default function TestimonialCard({
  message,
  name,
  role,
  avatar,
}: TestimonialCardProps) {
  return (
    <div className="min-w-105 rounded-2xl border bg-white/80 border-white backdrop-blur-sm p-6">
      <p className="text-sm line-clamp-3 text-zinc-600 dark:text-zinc-400 whitespace-normal">
        {message}
      </p>

      <div className="mt-6 flex items-center gap-4">
        <Avatar className="h-10 w-10">
          {avatar && <AvatarImage src={avatar} alt={name} />}
          <AvatarFallback className="border font-semibold uppercase text-primary">{name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  )
}
