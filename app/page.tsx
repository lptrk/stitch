"use client"

import { useState } from "react"
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, closestCenter } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { TestBlocksSidebar } from "@/components/test-blocks-sidebar"
import { WorkflowBuilder } from "@/components/workflow-builder"
import { WorkflowControls } from "@/components/workflow-controls"
import { WorkflowManager } from "@/components/workflow-manager"
import { WorkflowExporter } from "@/components/workflow-exporter"
import { TestBlock } from "@/components/test-block"
import { BaseUrlInput } from "@/components/base-url-input"
import { TestStatus } from "@/components/test-status"
import { testBlocks } from "@/lib/test-blocks"
import { useTestExecution } from "@/hooks/use-test-execution"
import { useCustomBlocks } from "@/hooks/use-custom-blocks"
import type { WorkflowItem, Workflow, WorkflowConfig } from "@/types/workflow"

export default function HomePage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: "main",
      name: "Main Workflow",
      description: "Default workflow",
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])
  const [currentWorkflowId, setCurrentWorkflowId] = useState("main")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000")

  const { execution, startExecution, updateExecution, completeExecution, resetExecution } = useTestExecution()
  const {
    customBlocks,
    addCustomBlock,
    updateCustomBlock,
    removeCustomBlock,
    clearCustomBlocks,
    exportCustomBlocks,
    importCustomBlocks,
  } = useCustomBlocks()

  const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId)
  const isRunning = execution.status === "running"

  // Combine built-in and custom blocks
  const allBlocks = [...testBlocks, ...customBlocks]

  /* ------------------------------------------------------------- *
   * workflow management
   * ------------------------------------------------------------- */
  const createWorkflow = (name: string, description?: string) => {
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name,
      description,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setWorkflows((prev) => [...prev, newWorkflow])
    setCurrentWorkflowId(newWorkflow.id)
  }

  const deleteWorkflow = (id: string) => {
    if (workflows.length <= 1) return
    setWorkflows((prev) => prev.filter((w) => w.id !== id))
    if (currentWorkflowId === id) {
      setCurrentWorkflowId(workflows.find((w) => w.id !== id)?.id || "main")
    }
  }

  const renameWorkflow = (id: string, name: string, description?: string) => {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, name, description, updatedAt: new Date() } : w)))
  }

  const updateCurrentWorkflow = (items: WorkflowItem[]) => {
    setWorkflows((prev) => prev.map((w) => (w.id === currentWorkflowId ? { ...w, items, updatedAt: new Date() } : w)))
  }

  /* ------------------------------------------------------------- *
   * test execution
   * ------------------------------------------------------------- */
  const handleRunWorkflow = async (config: WorkflowConfig) => {
    const workflowName = workflows.find((w) => w.id === config.mainWorkflow)?.name || "Unknown Workflow"

    console.log("🎯 Starting Playwright test:", workflowName)

    // Reset all block statuses before starting
    if (currentWorkflow) {
      console.log("🔄 Resetting block statuses...")
      const resetItems = currentWorkflow.items.map((item) => ({
        ...item,
        executionStatus: "pending" as const,
        executionError: undefined,
        executionDuration: undefined,
        executionTimestamp: undefined,
      }))
      updateCurrentWorkflow(resetItems)
    }

    // Create custom blocks config with correct mapping
    const customBlocksConfig = customBlocks.reduce(
      (acc, block) => {
        console.log("🎨 Adding custom block to config:", {
          blockId: block.id,
          playwrightFunction: block.playwrightFunction,
          name: block.name,
        })

        // Use the block's ID as the key (this matches what's used in workflow items)
        acc[block.id] = {
          id: block.id,
          name: block.name,
          code: block.customCode || "",
          parameters: block.parameters || [],
        }
        return acc
      },
      {} as Record<string, any>,
    )

    console.log("🎨 Custom blocks config:", Object.keys(customBlocksConfig))

    // Add custom blocks to config
    const configWithCustomBlocks = {
      ...config,
      customBlocks: customBlocksConfig,
    }

    const executionId = startExecution(workflowName)

    try {
      const totalSteps = Object.values(config.workflows).reduce((sum, workflow) => sum + workflow.workflow.length, 0)

      updateExecution({
        totalSteps,
        completedSteps: 0,
        currentStep: "Starting Playwright test runner...",
        blockResults: {},
        logs: [
          "🎭 Initializing Playwright",
          `📊 Total steps: ${totalSteps}`,
          `🎨 Custom blocks: ${Object.keys(configWithCustomBlocks.customBlocks).length}`,
        ],
      })

      console.log("📤 Sending request to API...")
      const response = await fetch("/api/run-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configWithCustomBlocks),
      })

      const result = await response.json()
      console.log("📥 API Response received:", result)

      if (result.testResult) {
        const { passed, exitCode, duration, output, error, blockResults } = result.testResult

        console.log("📊 Processing block results:", blockResults)

        // Update workflow items with execution results
        if (currentWorkflow && blockResults && Array.isArray(blockResults) && blockResults.length > 0) {
          console.log("🔄 Updating workflow items with results...")
          console.log("📋 Current workflow items:", currentWorkflow.items.length)
          console.log("📊 Block results to process:", blockResults.length)

          const updatedItems = currentWorkflow.items.map((item, index) => {
            // Find matching block result by step number (1-based)
            const blockResult = blockResults.find((br: any) => br.stepNumber === index + 1)

            console.log(`🔍 Item ${index + 1}:`, {
              itemId: item.id,
              blockId: item.blockId,
              blockResult: blockResult,
            })

            if (blockResult) {
              console.log(`✅ Updating item ${index + 1} with status:`, blockResult.status)
              return {
                ...item,
                executionStatus: blockResult.status,
                executionError: blockResult.error,
                executionDuration: blockResult.duration,
                executionTimestamp: new Date(blockResult.timestamp),
              }
            } else {
              console.log(`⚠️ No result found for item ${index + 1}, marking as failed`)
              return {
                ...item,
                executionStatus: "failed" as const,
                executionError: "No execution result received",
              }
            }
          })

          console.log("🔄 Applying updated items to workflow...")
          console.log(
            "📊 Updated items status:",
            updatedItems.map((item, i) => ({ index: i + 1, status: item.executionStatus })),
          )

          updateCurrentWorkflow(updatedItems)
        } else {
          console.warn("⚠️ No block results to process:", {
            hasCurrentWorkflow: !!currentWorkflow,
            hasBlockResults: !!blockResults,
            isArray: Array.isArray(blockResults),
            length: blockResults?.length,
          })
        }

        updateExecution({
          completedSteps: totalSteps,
          currentStep: passed ? "All Playwright tests passed!" : "Playwright tests failed",
          logs: [
            `🏁 Test completed in ${duration}ms`,
            `📊 Exit code: ${exitCode}`,
            `🎯 Block results: ${blockResults?.length || 0} blocks executed`,
            passed ? "✅ All assertions passed!" : "❌ Test assertions failed!",
            ...(output ? [`📤 Output: ${output.slice(-300)}`] : []),
            ...(error ? [`📥 Error: ${error.slice(-300)}`] : []),
          ],
        })

        completeExecution(passed, passed ? undefined : `Tests failed: ${error || "Unknown error"}`)
      } else {
        throw new Error(result.message || "Failed to start test")
      }
    } catch (error) {
      console.error("❌ Test execution error:", error)

      // Mark all pending blocks as failed
      if (currentWorkflow) {
        const failedItems = currentWorkflow.items.map((item) => ({
          ...item,
          executionStatus: item.executionStatus === "pending" ? ("failed" as const) : item.executionStatus,
          executionError: item.executionStatus === "pending" ? "Test execution failed" : item.executionError,
        }))
        updateCurrentWorkflow(failedItems)
      }

      completeExecution(false, error instanceof Error ? error.message : "Unknown error")
    }
  }

  /* ------------------------------------------------------------- *
   * dnd handlers
   * ------------------------------------------------------------- */
  const handleDragStart = (event: DragStartEvent) => {
    console.log("🎯 Drag started:", event.active.id)
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    console.log("🎯 Drag ended:", { activeId: active.id, overId: over?.id })
    setActiveId(null)
    if (!over || !currentWorkflow) return

    const currentItems = currentWorkflow.items

    // Reordering existing items
    const oldIndex = currentItems.findIndex((i) => i.id === active.id)
    const newIndex = currentItems.findIndex((i) => i.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reorderedItems = arrayMove(currentItems, oldIndex, newIndex)
      updateCurrentWorkflow(reorderedItems)
      return
    }

    // Adding new block
    const isNewBlock = allBlocks.some((b) => b.id === active.id)
    const droppedOnWorkflow = over.id === "workflow-area" || over.id === "workflow-drop-zone"

    if (isNewBlock && droppedOnWorkflow) {
      const block = allBlocks.find((b) => b.id === active.id)
      if (block) {
        console.log("➕ Adding block to workflow:", block.name)
        const defaultParams: Record<string, string> = {}
        block.parameters?.forEach((p) => {
          if (p.defaultValue) defaultParams[p.id] = p.defaultValue
        })

        const newItem: WorkflowItem = {
          id: `${block.id}-${Date.now()}`,
          blockId: block.id,
          block,
          parameters: defaultParams,
        }
        updateCurrentWorkflow([...currentItems, newItem])
      }
    }
  }

  /* ------------------------------------------------------------- *
   * other helpers
   * ------------------------------------------------------------- */
  const removeWorkflowItem = (id: string) => {
    if (!currentWorkflow) return
    const updatedItems = currentWorkflow.items.filter((i) => i.id !== id)
    updateCurrentWorkflow(updatedItems)
  }

  const clearCurrentWorkflow = () => {
    updateCurrentWorkflow([])
  }

  const handleParameterChange = (itemId: string, paramId: string, value: string) => {
    if (!currentWorkflow) return
    const updatedItems = currentWorkflow.items.map((item) =>
      item.id === itemId
        ? {
          ...item,
          parameters: { ...(item.parameters || {}), [paramId]: value },
        }
        : item,
    )
    updateCurrentWorkflow(updatedItems)
  }

  const importWorkflows = (importedWorkflows: Workflow[]) => {
    setWorkflows(importedWorkflows)
    if (importedWorkflows.length > 0) {
      setCurrentWorkflowId(importedWorkflows[0].id)
    }
  }

  const activeBlock = activeId ? allBlocks.find((b) => b.id === activeId) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-screen">
          {/* Sidebar with blocks */}
          <TestBlocksSidebar
            blocks={testBlocks}
            customBlocks={customBlocks}
            onAddCustomBlock={addCustomBlock}
            onUpdateCustomBlock={updateCustomBlock}
            onRemoveCustomBlock={removeCustomBlock}
            onExportCustomBlocks={exportCustomBlocks}
            onImportCustomBlocks={importCustomBlocks}
            onClearCustomBlocks={clearCustomBlocks}
          />

          {/* Main area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Stitch</h1>
                  <p className="text-gray-600">Visual test builder with custom blocks support</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <BaseUrlInput value={baseUrl} onChange={setBaseUrl} />
                  <WorkflowExporter workflows={workflows} baseUrl={baseUrl} currentWorkflowId={currentWorkflowId} />
                  <WorkflowControls
                    workflows={workflows}
                    currentWorkflowId={currentWorkflowId}
                    baseUrl={baseUrl}
                    isRunning={isRunning}
                    onImportWorkflows={importWorkflows}
                    onClearCurrentWorkflow={clearCurrentWorkflow}
                    onRunWorkflow={handleRunWorkflow}
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <WorkflowManager
                  workflows={workflows}
                  currentWorkflowId={currentWorkflowId}
                  onCreateWorkflow={createWorkflow}
                  onSelectWorkflow={setCurrentWorkflowId}
                  onDeleteWorkflow={deleteWorkflow}
                  onRenameWorkflow={renameWorkflow}
                />
              </div>
            </header>

            {/* Test Status */}
            {execution.status !== "idle" && (
              <div className="p-4 bg-white border-b border-gray-200">
                <TestStatus execution={execution} onClose={resetExecution} />
              </div>
            )}

            {/* Workflow Builder */}
            <main className="flex-1 p-6 overflow-y-auto">
              <SortableContext
                items={currentWorkflow?.items.map((i) => i.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <WorkflowBuilder
                  items={currentWorkflow?.items || []}
                  workflows={workflows}
                  currentWorkflowId={currentWorkflowId}
                  onRemoveItem={removeWorkflowItem}
                  onParameterChange={handleParameterChange}
                />
              </SortableContext>
            </main>
          </div>
        </div>

        <DragOverlay>{activeBlock ? <TestBlock block={activeBlock} isDragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
