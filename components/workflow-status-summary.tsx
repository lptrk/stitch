"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock } from "lucide-react"
import type { WorkflowItem } from "@/types/workflow"

interface WorkflowStatusSummaryProps {
  items: WorkflowItem[]
}

export function WorkflowStatusSummary({ items }: WorkflowStatusSummaryProps) {
  const statusCounts = items.reduce(
    (acc, item) => {
      const status = item.executionStatus || "pending"
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const total = items.length
  const completed = (statusCounts.success || 0) + (statusCounts.failed || 0)
  const successRate = total > 0 ? Math.round(((statusCounts.success || 0) / total) * 100) : 0
  const totalDuration = items.reduce((sum, item) => sum + (item.executionDuration || 0), 0)

  if (total === 0) return null

  // Only show during/after a run – not on a fresh workflow with no execution yet
  const hasAnyExecutionData = items.some((item) => item.executionStatus && item.executionStatus !== "pending")
  if (!hasAnyExecutionData) return null

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted border border-border rounded-lg">
      {/* Progress bar */}
      <div className="flex-1 min-w-[120px]">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{completed}/{total} steps</span>
          {completed > 0 && <span>{successRate}% passed</span>}
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              statusCounts.failed > 0 ? "bg-red-500" : "bg-green-500"
            }`}
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {(statusCounts.success || 0) > 0 && (
          <Badge className="bg-green-500 hover:bg-green-600 gap-1 text-xs">
            <CheckCircle className="w-3 h-3" />
            {statusCounts.success} passed
          </Badge>
        )}
        {(statusCounts.failed || 0) > 0 && (
          <Badge className="bg-red-500 hover:bg-red-600 gap-1 text-xs">
            <XCircle className="w-3 h-3" />
            {statusCounts.failed} failed
          </Badge>
        )}
        {(statusCounts.running || 0) > 0 && (
          <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1 text-xs">
            <Clock className="w-3 h-3 animate-spin" />
            running
          </Badge>
        )}
        {(statusCounts.pending || 0) > 0 && completed === 0 && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock className="w-3 h-3" />
            {statusCounts.pending} pending
          </Badge>
        )}
        {totalDuration > 0 && (
          <span className="text-xs text-muted-foreground">{totalDuration}ms total</span>
        )}
      </div>
    </div>
  )
}
