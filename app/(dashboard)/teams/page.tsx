"use client"

import { Separator } from '@/components/ui/separator'
import {useState, useEffect} from 'react'

import TeamCard from "@/components/teamCard"
import type { Team } from "@/types/team"
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'


export default function Page() {
  const [teams, setTeams] = useState<Team[]>([])

   useEffect(() => {
  fetch('/api/teams')
    .then(res => res.json())
    .then(data => setTeams(data.teams))
}, [])
  
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col lg:flex-row items-center justify-between px-7 gap-4 lg:gap-5">
        <p className="text-sm flex-1 lg:line-clamp-2">Create a team to manage projects more effectively and keep collaboration structured.</p>
        <Button variant="gradient"><Plus /> Create Team</Button>   
      </div> 
      <Separator className="my-0 bg-gray-100" />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">
        {teams.map((team, index) => (
          <TeamCard
            key={team.id}
            slug={team.slug}
            team={team}
            index={index}
            projectsAssigned={team.projectsAssigned}
            onEdit={(id) => console.log("Edit", id)}
            onDelete={(id) => console.log("Delete", id)}
          />
      ))}
    </div>
    </div>
  )
}