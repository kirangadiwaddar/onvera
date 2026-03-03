import { BadgeCheck, BadgeX, Bell } from 'lucide-react'
import projects from "@/src/mocks/data/projects.json"
import { ScrollArea } from '../ui/scroll-area'

const activities = [
    { id: 1, title: "Client uploaded logo", projectId: 10, time: "2 hrs ago", status: "success" },
    { id: 2, title: "Hosting access provided", projectId: 3, time: "6 hrs ago", status: "success" },
    { id: 3, title: "File upload failed", projectId: 7, time: "9 hrs ago", status: "error" },
    { id: 4, title: "Design approved", projectId: 10, time: "1 day ago", status: "success" },
    { id: 5, title: "API integration completed", projectId: 5, time: "2 days ago", status: "success" },
    { id: 6, title: "Invoice generated", projectId: 2, time: "3 days ago", status: "success" },
    { id: 7, title: "Domain setup failed", projectId: 8, time: "4 days ago", status: "error" },
    { id: 8, title: "Client added feedback", projectId: 4, time: "5 days ago", status: "success" },
    { id: 9, title: "Content draft rejected", projectId: 6, time: "6 days ago", status: "error" },
    { id: 10, title: "Project moved to review", projectId: 1, time: "1 week ago", status: "success" },
]

export function RecentActivity() {
    return (
        <div className='recent-activity border border-zinc-200 rounded-xl overflow-hidden h-full'>
            <div className="flex items-center justify-between p-5 py-4 bg-violet-50">
                <p className='text-sm font-medium'>Recent Activity</p>
                <div className="notify w-8 h-8 border border-zinc-200 bg-white rounded-full flex items-center justify-center">
                    <Bell size={16} className='text-orange-600' />
                </div>
            </div>
            <ScrollArea className="activity-list flex-1 overflow-y-auto max-h-105 px-3 divide-y divide-zinc-100">
                {activities.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        No data found
                    </div>
                ) : (
                    activities.map((activity) => {
                        const project = projects.projects.find(
                            (p) => p.id === activity.projectId
                        )

                        return (
                            <div
                                key={activity.id}
                                className="flex items-start justify-between py-3"
                            >
                                <div className="space-y-1">
                                    <p className="text-sm flex items-center gap-1">
                                        {activity.title}

                                        {activity.status === "success" ? (
                                            <BadgeCheck size={18} fill="#00c951" stroke="#fff" />
                                        ) : (
                                            <BadgeX size={18} fill="#fb2c36" stroke="#fff" />
                                        )}
                                    </p>

                                    <p className="text-xs text-muted-foreground truncate">
                                        {project?.title || "Unknown Project"}
                                    </p>
                                </div>

                                <span className="text-xs mt-1 text-muted-foreground">
                                    {activity.time}
                                </span>
                            </div>
                        )
                    })
                )}
            </ScrollArea>
        </div>
    )
}

