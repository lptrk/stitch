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
}

export function CollapsibleSection({ title, children, defaultExpanded = true, badge, icon }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between p-0 h-auto font-medium text-gray-700 hover:text-gray-900"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
          {badge}
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {isExpanded && <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">{children}</div>}
    </div>
  )
}
