import TemplateCards from '@/components/templateCard'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import React from 'react'

export default function Page() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col lg:flex-row items-center justify-between px-7 gap-4 lg:gap-5">
        <p className="text-sm flex-1 lg:line-clamp-2">Stop starting from scratch — build smarter with structured templates.</p>        
      </div> 
      <Separator className="my-0 bg-border" />
    <TemplateCards />
    </div>
  )
}
