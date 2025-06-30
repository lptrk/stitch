"use client"

import { useDroppable } from "@dnd-kit/core"
import type { WorkflowItem, Workflow } from "@/types/workflow"
import { WorkflowItemComponent } from "./workflow-item"
import { BlockDebugDialog } from "./block-debug-dialog"
import { FileText, Plus } from "lucide-react"
import { WorkflowStatusSummary } from "./workflow-status-summary"
import { useState } from "react"

interface WorkflowBuilderProps {
  items: WorkflowItem[]
  workflows?: Workflow[]
  currentWorkflowId?: string
  onRemoveItem: (id: string) => void
  onParameterChange: (itemId: string, parameterId: string, value: string) => void
}

export function WorkflowBuilder({
  items,
  workflows = [],
  currentWorkflowId,
  onRemoveItem,
  onParameterChange,
}: WorkflowBuilderProps) {
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugItem, setDebugItem] = useState<WorkflowItem | null>(null)

  const { setNodeRef: setMainNodeRef, isOver: isMainOver } = useDroppable({
    id: "workflow-area",
  })

  const { setNodeRef: setDropZoneRef, isOver: isDropZoneOver } = useDroppable({
    id: "workflow-drop-zone",
  })

  const handleDebugItem = (item: WorkflowItem) => {
    console.log("🐛 Debug workflow item:", item.block.name)
    setDebugItem(item)
    setDebugOpen(true)
  }

  const handleTestBlock = async (block: any, parameters: Record<string, string>) => {
    console.log("🧪 Testing workflow item block:", block.name, "with parameters:", parameters)

    // Create a test workflow configuration
    const testConfig = {
      baseUrl: "https://example.com",
      workflows: {
        test: {
          name: "Workflow Item Test",
          description: "Testing single workflow item",
          workflow: [
            {
              block: "goto",
              parameters: { url: "/" },
            },
            {
              block: block.id,
              parameters: parameters,
            },
          ],
        },
      },
      mainWorkflow: "test",
      customBlocks: block.isCustom
        ? {
            [block.id]: {
              id: block.id,
              name: block.name,
              code: block.customCode || "",
              parameters: block.parameters || [],
            },
          }
        : {},
    }

    try {
      console.log("🚀 Sending workflow item test request...")
      const response = await fetch("/api/run-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testConfig),
      })

      const result = await response.json()
      console.log("📥 Workflow item test result:", result)
    } catch (error) {
      console.error("❌ Workflow item test error:", error)
      throw error
    }
  }

  return (
    <>
      <div
        ref={setMainNodeRef}
        className={`
          min-h-96 border-2 border-dashed rounded-lg p-6 transition-colors
          ${isMainOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white"}
        `}
      >
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Test Workflow ({items.length} steps)</h3>
        </div>

        {/* Workflow Status Summary */}
        {items.length > 0 && (
          <div className="mb-4">
            <WorkflowStatusSummary items={items} />
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <FileText className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600">Drag test blocks here to build your workflow</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <WorkflowItemComponent
                key={item.id}
                item={item}
                index={index}
                workflows={workflows}
                currentWorkflowId={currentWorkflowId}
                onRemove={() => onRemoveItem(item.id)}
                onParameterChange={(parameterId, value) => onParameterChange(item.id, parameterId, value)}
                onDebug={handleDebugItem}
              />
            ))}

            {/* Always visible drop zone at the bottom */}
            <div
              ref={setDropZoneRef}
              className={`
                flex items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors
                ${isDropZoneOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"}
              `}
            >
              <div className="flex items-center gap-2 text-gray-500">
                <Plus className="w-5 h-5" />
                <span className="text-sm">Drop new test blocks here</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Dialog for Workflow Items */}
      <BlockDebugDialog
        block={debugItem?.block || null}
        workflowItem={debugItem}
        open={debugOpen}
        onClose={() => {
          console.log("❌ Closing workflow item debug dialog")
          setDebugOpen(false)
          setDebugItem(null)
        }}
        onTestBlock={handleTestBlock}
      />
    </>
  )
}
