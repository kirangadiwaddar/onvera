"use client";

import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Globe,
    Palette,
    Smartphone,
    Cloud,
    ShoppingCart,
    Megaphone,
    Brush,
    Plus,
    AppWindowMac,
    FolderOpenDot,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge"
import { getIconColor } from "@/lib/get-icon-colors";

import { getTemplatesWithCounts } from "@/lib/getTemplatesWithCounts";

// import templates from "@/src/mocks/data/templates.json"
// import type { Template } from "@/types/template"

// const templateList = templates.templates

const iconMap = {
    Globe,
    Palette,
    Smartphone,
    Cloud,
    ShoppingCart,
    Megaphone,
    Brush,
    Plus,
    AppWindowMac,
}


export default function TemplateCards() {
    const router = useRouter();

    const templates = getTemplatesWithCounts();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">
            {templates.map((template, index) => {
                const Icon = iconMap[template.icon as keyof typeof iconMap]
                return (
                    <Card
                        key={template.id}
                        className="mx-auto w-full p-0 gap-2 shadow-none bg-gradient-violet rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                        <CardHeader className="flex items-start justify-between gap-4 p-5 pb-2">
                            <div className={`h-10 w-10 p-2.5 rounded-lg flex items-center justify-center bg-white border border-violet-200`}>
                                {Icon ? (
                                    <Icon className="w-8 h-8" />
                                ) : (
                                    <div className="w-8 h-8 bg-gray-200 rounded" />
                                )}
                            </div>
                            <CardAction className="flex items-center justify-end gap-1">
                                <Badge className={`text-xs font-medium ${getIconColor(index)}`}>
                                    {template.badge}
                                </Badge>
                            </CardAction>
                        </CardHeader>

                        <CardContent className="flex-1 mb-3 px-5">
                            <CardTitle className="font-medium text-sm truncate mb-2">{template.title}</CardTitle>
                            <p className="text-xs text-muted-foreground line-clamp-2 min-w-0">
                                {template.description}
                            </p>
                        </CardContent>

                        <CardFooter className="border-t py-4! text-xs text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1 justify-start">
                                <strong className="font-medium text-black mt-0.5 text-xs flex items-center gap-1">
                                    <FolderOpenDot size={16} /> {template.projectsCreated} Projects Created
                                </strong>
                            </span>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="text-xs rounded-full"
                                        onClick={() =>
                                            router.push(`/create-project?template=${template.id}`)
                                        }
                                    >
                                        <Plus className="text-primary" strokeWidth={2} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Create Project</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardFooter>
                    </Card>
                )
            })}
            {/* );
            })} */}
        </div>
    );
}