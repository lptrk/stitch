"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { WorkflowItem, Workflow } from "@/types/workflow"
import { Button } from "@/components/ui/button"
import { GripVertical, X, GitBranch, Bug, MessageSquare } from "lucide-react"
import { BlockStatusIndicator } from "./block-status-indicator"
import { SafeIcon } from "./safe-icon"

interface WorkflowItemProps {
  item: WorkflowItem
  index: number
  workflows?: Workflow[]
  isSelected?: boolean
  onSelect: () => void
  onRemove: () => void
  onDebug?: (item: WorkflowItem) => void
  readOnly?: boolean
}

export function WorkflowItemComponent({
  item,
  index,
  workflows = [],
  isSelected = false,
  onSelect,
  onRemove,
  onDebug,
  readOnly = false,
}: WorkflowItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "workflow-item", item },
    disabled: readOnly,
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  const isWorkflowCall = item.blockId === "callWorkflow"
  const calledWorkflow = isWorkflowCall && item.parameters?.workflowId
    ? workflows.find((w) => w.id === item.parameters!.workflowId)
    : null

  const hasRequiredEmpty = (item.block.parameters || []).some(
    (p) => p.required && !item.parameters?.[p.id]
  )

  const borderColor =
    isSelected ? "border-primary/60 shadow-md ring-1 ring-primary/30" :
    item.executionStatus === "success" ? "border-green-200" :
    item.executionStatus === "failed" ? "border-red-200" :
    item.executionStatus === "running" ? "border-primary/30 animate-pulse" :
    hasRequiredEmpty ? "border-orange-300" :
    "border-border hover:border-ring/50"

  const bgColor =
    isSelected ? "bg-accent/70" :
    item.executionStatus === "success" ? "bg-green-50" :
    item.executionStatus === "failed" ? "bg-red-50" :
    item.executionStatus === "running" ? "bg-accent" :
    isWorkflowCall ? "bg-violet-50" :
    "bg-card"

  // Compact param preview
  const paramPreview = item.block.parameters && item.block.parameters.length > 0
    ? item.block.parameters
        .filter((p) => item.parameters?.[p.id])
        .slice(0, 2)
        .map((p) => item.parameters![p.id])
        .join(" · ")
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-3 py-2 border rounded-lg transition-all cursor-pointer min-w-0 ${
        isDragging ? "opacity-50 shadow-lg z-50" : ""
      } ${borderColor} ${bgColor}`}
      onClick={onSelect}
    >
      {/* Step number */}
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}>
        {index + 1}
      </span>

      {/* Status */}
      <BlockStatusIndicator item={item} isCurrentBlock={false} size="sm" />

      {/* Drag handle */}
      <div
        className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-accent flex-shrink-0"
        {...attributes} {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/70" />
      </div>

      {/* Icon + name + preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isWorkflowCall
            ? <GitBranch className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
            : <SafeIcon icon={item.block.icon} className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          }
          <span className={`font-medium text-xs truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
            {isWorkflowCall ? "Call Workflow" : item.block.name}
          </span>
          {isWorkflowCall && calledWorkflow && (
            <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded flex-shrink-0">
              → {calledWorkflow.name}
            </span>
          )}
          {hasRequiredEmpty && !isSelected && (
            <span className="text-[10px] text-orange-500 flex-shrink-0">required</span>
          )}
        </div>
        {paramPreview && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono leading-tight">{paramPreview}</p>
        )}
        {item.comment && (
          <p className="text-[10px] text-amber-500 truncate mt-0.5 flex items-center gap-1">
            <MessageSquare className="w-3 h-3 flex-shrink-0" />
            {item.comment}
          </p>
        )}
      </div>

      {/* Actions – only on hover */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDebug && item.block.isCustom && (
          <Button
            variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); onDebug(item) }}
            className="h-6 w-6 p-0 text-primary/70 hover:text-primary"
            title="Debug"
          >
            <Bug className="w-3 h-3" />
          </Button>
        )}
        {!readOnly && (
          <Button
            variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
