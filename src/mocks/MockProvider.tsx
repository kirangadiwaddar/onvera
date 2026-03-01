'use client'

import { useEffect, useState } from 'react'

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      if (process.env.NODE_ENV === 'development') {
        const { worker } = await import('./browser')
        await worker.start()
      }
      setReady(true)
    }

    init()
  }, [])

  if (!ready) return null

  return <>{children}</>
}