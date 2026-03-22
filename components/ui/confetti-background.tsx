"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type ConfettiPiece = {
  id: number
  left: number
  size: number
  delay: number
  duration: number
  rotation: number
  color: string
  opacity: number
}

const COLORS = ["#f97316", "#f43f5e", "#8b5cf6", "#22c55e", "#38bdf8", "#facc15"]

export function ConfettiBackground({
  className,
  pieces = 48,
}: {
  className?: string
  pieces?: number
}) {
  const [items, setItems] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    const next = Array.from({ length: pieces }).map((_, index) => ({
      id: index,
      left: Math.random() * 100,
      size: 6 + Math.random() * 10,
      delay: Math.random() * 2.5,
      duration: 3 + Math.random() * 3.5,
      rotation: Math.random() * 360,
      color: COLORS[index % COLORS.length],
      opacity: 0.6 + Math.random() * 0.35,
    }))
    setItems(next)
  }, [pieces])

  return (
    <div className={cn("confetti-layer pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {items.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 0.6}px`,
            backgroundColor: piece.color,
            opacity: piece.opacity,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ["--confetti-rotation" as string]: `${piece.rotation}deg`,
          }}
        />
      ))}
    </div>
  )
}
