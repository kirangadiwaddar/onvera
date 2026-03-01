import { BadgeCheck, BadgeX, Bell, CalendarCheck } from 'lucide-react'
import React from 'react'

export function RecentActivity() {
    return (
        <div className='recent-activity border border-zinc-200 rounded-xl overflow-hidden'>
            <div className="flex items-center justify-between  px-3 py-2 bg-violet-50">
                <p className='text-sm font-medium'>Recent Activity</p>
                <div className="notify w-8 h-8 border border-zinc-200 bg-white rounded-full flex items-center justify-center">
                    <Bell size={16} className='text-orange-600' />
                </div>
            </div>            
            <div className="activity-list px-3 divide-y divide-zinc-100 ">
                <div className="activity-item flex items-start justify-between py-3">
                    <div className='space-y-1'>
                        <p className='text-sm flex items-center gap-1'>Client uploaded logo <BadgeCheck size={20} fill="#00c951" stroke="#fff" /></p>
                        <p className='text-xs text-muted-foreground'>Cyber-Duck UX Optimization</p>
                    </div>
                    <span className='text-xs flex items-center gap-1 mt-1 text-muted-foreground'>2 hrs ago</span>
                </div>
                <div className="activity-item flex items-start justify-between py-3">
                    <div className="space-y-1">
                        <p className='text-sm flex items-center gap-1'>Hosting access provided <BadgeCheck size={20} fill="#00c951" stroke="#fff" /></p>
                        <p className='text-xs text-muted-foreground'>CRM Dashboard Integration</p></div>
                    <span className='text-xs flex items-center gap-1 mt-1 text-muted-foreground'>6 hrs ago</span>
                </div>
                <div className="activity-item flex items-start justify-between py-3">
                    <div className="space-y-1">
                        <p className='text-sm flex items-center gap-1'>File upload failed <BadgeX size={20} fill="#fb2c36" stroke="#fff" /></p>
                        <p className='text-xs text-muted-foreground'>SEO & Digital Growth — WebFx</p></div>
                    <span className='text-xs flex items-center gap-1 mt-1 text-muted-foreground'>9 hrs ago</span>
                </div>
            </div>
        </div>
    )
}

