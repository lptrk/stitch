"use client"

import { CheckCircle, XCircle, Loader2, Circle } from "lucide-react"
import type { WorkflowItem } from "@/types/workflow"

interface BlockStatusIndicatorProps {
  item: WorkflowItem
  isCurrentBlock?: boolean
  size?: "sm" | "md" | "lg"
}

export function BlockStatusIndicator({ item, isCurrentBlock = false, size = "md" }: BlockStatusIndicatorProps) {
  const status = item.executionStatus || "pending"

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  const iconSize = sizeClasses[size]

  const getStatusDisplay = () => {
    switch (status) {
      case "running":
        return {
          icon: <Loader2 className={`${iconSize} animate-spin text-blue-600`} />,
          bgColor: "bg-blue-100",
          borderColor: "border-blue-300",
          textColor: "text-blue-700",
          label: "Running...",
        }
      case "success":
        return {
          icon: <CheckCircle className={`${iconSize} text-green-600`} />,
          bgColor: "bg-green-100",
          borderColor: "border-green-300",
          textColor: "text-green-700",
          label: `Success ${item.executionDuration ? `(${item.executionDuration}ms)` : ""}`,
        }
      case "failed":
        return {
          icon: <XCircle className={`${iconSize} text-red-600`} />,
          bgColor: "bg-red-100",
          borderColor: "border-red-300",
          textColor: "text-red-700",
          label: "Failed",
        }
      case "pending":
      default:
        return {
          icon: <Circle className={`${iconSize} text-gray-400`} />,
          bgColor: isCurrentBlock ? "bg-yellow-100" : "bg-gray-100",
          borderColor: isCurrentBlock ? "border-yellow-300" : "border-gray-300",
          textColor: isCurrentBlock ? "text-yellow-700" : "text-gray-500",
          label: isCurrentBlock ? "Next" : "Pending",
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div
      className={`
      flex items-center gap-2 px-2 py-1 rounded-full border transition-all
      ${statusDisplay.bgColor} ${statusDisplay.borderColor}
    `}
    >
      {statusDisplay.icon}
      <span className={`text-xs font-medium ${statusDisplay.textColor}`}>{statusDisplay.label}</span>

      {/* Error tooltip */}
      {status === "failed" && item.executionError && (
        <div className="relative group">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-red-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {item.executionError}
          </div>
        </div>
      )}
    </div>
  )
}
