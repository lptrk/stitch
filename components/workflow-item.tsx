"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { WorkflowItem, Workflow } from "@/types/workflow"
import { Button } from "@/components/ui/button"
import { BlockParameters } from "./block-parameters"
import { GripVertical, X, GitBranch, Bug } from "lucide-react"
import { BlockStatusIndicator } from "./block-status-indicator"
import { SafeIcon } from "./safe-icon"

interface WorkflowItemProps {
  item: WorkflowItem
  index: number
  workflows?: Workflow[]
  currentWorkflowId?: string
  onRemove: () => void
  onParameterChange: (parameterId: string, value: string) => void
  onDebug?: (item: WorkflowItem) => void // New debug handler
}

export function WorkflowItemComponent({
  item,
  index,
  workflows = [],
  currentWorkflowId,
  onRemove,
  onParameterChange,
  onDebug,
}: WorkflowItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      type: "workflow-item",
      item,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isWorkflowCall = item.blockId === "callWorkflow"
  const calledWorkflow =
    isWorkflowCall && item.parameters?.workflowId ? workflows.find((w) => w.id === item.parameters.workflowId) : null

  const handleDebug = () => {
    console.log("🐛 Debug workflow item:", item.block.name)
    onDebug?.(item)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex flex-col gap-3 p-4 border rounded-lg shadow-sm transition-all
        ${isDragging ? "opacity-50 shadow-lg z-50" : "hover:shadow-md"}
        ${isWorkflowCall ? "border-l-4 border-l-violet-500 bg-violet-50" : ""}
        ${item.executionStatus === "success" ? "bg-green-50 border-green-200" : ""}
        ${item.executionStatus === "failed" ? "bg-red-50 border-red-200" : ""}
        ${item.executionStatus === "running" ? "bg-blue-50 border-blue-200 animate-pulse" : ""}
        bg-white
      `}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          {/* Step number and status */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
              {index + 1}
            </span>
            <BlockStatusIndicator item={item} isCurrentBlock={false} size="sm" />
          </div>
        </div>

        <div
          className="p-2 rounded cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isWorkflowCall ? (
              <GitBranch className="w-4 h-4 text-violet-600" />
            ) : (
              <SafeIcon icon={item.block.icon} className="w-4 h-4 text-gray-600" />
            )}
            <span className="font-medium text-gray-900">{isWorkflowCall ? "Call Workflow" : item.block.name}</span>
            {isWorkflowCall && calledWorkflow && (
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded font-medium">
                → {calledWorkflow.name}
              </span>
            )}
            {isWorkflowCall && !calledWorkflow && item.parameters?.workflowId && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                → {item.parameters.workflowId} (not found)
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {isWorkflowCall
              ? calledWorkflow
                ? `Executes "${calledWorkflow.name}" workflow (${calledWorkflow.items.length} steps)`
                : "Calls another workflow"
              : item.block.description}
          </p>
        </div>

        {/* Debug Button for Custom Blocks */}
        {onDebug && item.block.isCustom && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDebug}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            title="Debug Block"
          >
            <Bug className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Parameters section */}
      {item.block.parameters && (
        <BlockParameters
          parameters={item.block.parameters}
          values={item.parameters || {}}
          workflows={workflows}
          currentWorkflowId={currentWorkflowId}
          onChange={onParameterChange}
        />
      )}

      {/* Workflow call warning */}
      {isWorkflowCall && !calledWorkflow && item.parameters?.workflowId && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ⚠️ Warning: Workflow "{item.parameters.workflowId}" not found
        </div>
      )}
    </div>
  )
}
