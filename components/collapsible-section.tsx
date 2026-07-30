"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  badge?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function CollapsibleSection({ title, children, defaultExpanded = true, badge, icon, action }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 justify-between p-0 h-auto font-medium text-foreground hover:text-foreground hover:bg-transparent"
        >
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
            {badge}
          </div>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </Button>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {isExpanded && <div className="space-y-2 animate-in slide-in-from-top-2 duration-150">{children}</div>}
    </div>
  )
}
