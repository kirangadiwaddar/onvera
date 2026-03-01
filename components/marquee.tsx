"use client"

import { motion, useMotionValue, useAnimationFrame } from "framer-motion"
import { useRef } from "react"

interface MarqueeProps {
  children: React.ReactNode
  speed?: number
  direction?: "left" | "right"
}

export default function Marquee({
  children,
  speed = 50,
  direction = "left",
}: MarqueeProps) {
  const x = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useAnimationFrame((_, delta) => {
    const moveBy = (delta / 1000) * speed
    const current = x.get()

    const newX =
      direction === "left"
        ? current - moveBy
        : current + moveBy

    const width = containerRef.current?.scrollWidth ?? 0
    const halfWidth = width / 2

    if (direction === "left" && Math.abs(newX) >= halfWidth) {
      x.set(0)
    } else if (direction === "right" && newX >= 0) {
      x.set(-halfWidth)
    } else {
      x.set(newX)
    }
  })

  return (
    <div className="overflow-hidden w-full">
      <motion.div
        ref={containerRef}
        style={{ x }}
        className="flex gap-8"
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}
