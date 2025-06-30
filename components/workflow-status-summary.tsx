"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, BarChart3 } from "lucide-react"
import type { WorkflowItem } from "@/types/workflow"

interface WorkflowStatusSummaryProps {
  items: WorkflowItem[]
  isRunning?: boolean
}

export function WorkflowStatusSummary({ items, isRunning = false }: WorkflowStatusSummaryProps) {
  const statusCounts = items.reduce(
    (acc, item) => {
      const status = item.executionStatus || "pending"
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Debug logging
  console.log("📊 WorkflowStatusSummary - Items:", items.length)
  console.log("📊 WorkflowStatusSummary - Status counts:", statusCounts)
  console.log(
    "📊 WorkflowStatusSummary - Items with status:",
    items.map((item) => ({
      id: item.id,
      blockId: item.blockId,
      status: item.executionStatus,
      error: item.executionError,
      duration: item.executionDuration,
    })),
  )

  const totalItems = items.length
  const completedItems = (statusCounts.success || 0) + (statusCounts.failed || 0)
  const successRate = totalItems > 0 ? Math.round(((statusCounts.success || 0) / totalItems) * 100) : 0

  if (totalItems === 0) {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="w-4 h-4" />
          Workflow Status Summary ({totalItems} blocks)
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>
              {completedItems} / {totalItems} blocks
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {statusCounts.success > 0 && (
            <Badge className="bg-green-500 hover:bg-green-600 gap-1">
              <CheckCircle className="w-3 h-3" />
              {statusCounts.success} Passed
            </Badge>
          )}

          {statusCounts.failed > 0 && (
            <Badge className="bg-red-500 hover:bg-red-600 gap-1">
              <XCircle className="w-3 h-3" />
              {statusCounts.failed} Failed
            </Badge>
          )}

          {statusCounts.running > 0 && (
            <Badge className="bg-blue-500 hover:bg-blue-600 gap-1">
              <Clock className="w-3 h-3 animate-spin" />
              {statusCounts.running} Running
            </Badge>
          )}

          {statusCounts.pending > 0 && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {statusCounts.pending} Pending
            </Badge>
          )}
        </div>

        {/* Success Rate */}
        {completedItems > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span>Success Rate:</span>
            <span
              className={`font-medium ${successRate >= 80 ? "text-green-600" : successRate >= 50 ? "text-yellow-600" : "text-red-600"}`}
            >
              {successRate}%
            </span>
          </div>
        )}

        {/* Execution Time Summary */}
        {items.some((item) => item.executionDuration) && (
          <div className="text-xs text-gray-500">
            Total execution time: {items.reduce((sum, item) => sum + (item.executionDuration || 0), 0)}ms
          </div>
        )}

        {/* Debug Info */}
        <div className="text-xs text-gray-400 border-t pt-2">Debug: {JSON.stringify(statusCounts)}</div>
      </CardContent>
    </Card>
  )
}
