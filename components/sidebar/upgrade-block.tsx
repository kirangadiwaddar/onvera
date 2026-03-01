import React from 'react'
import { Button } from '../ui/button'

const upgradeBlock = () => {
  return (
    <div className="bg-[radial-gradient(ellipse_at_bottom,var(--color-violet-400),var(--color-violet-600))] text-white rounded-xl p-5 space-y-2 text-center group-data-[state=collapsed]:hidden">
      <h4 className="font-medium">Upgrade to Pro</h4>
      <p className="text-xs">Unlock all features and get 1 month free.</p>
      <Button variant="secondary" size="xs" className="mt-2 rounded-full px-5 py-2! h-auto!">Upgrade Now</Button>
    </div>
  )
}

export default upgradeBlock