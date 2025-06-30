"use client"

import { useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

interface BlockExecutionResult {
  blockId: string
  itemId: string
  status: "success" | "failed"
  error?: string
  duration: number
  timestamp: Date
}

interface TestExecution {
  id: string
  status: "running" | "success" | "failed" | "idle"
  workflowName: string
  startTime?: Date
  endTime?: Date
  currentStep?: string
  totalSteps?: number
  completedSteps?: number
  logs: string[]
  error?: string
  // Add block results tracking
  blockResults: Record<string, BlockExecutionResult>
  currentBlockId?: string
}

export function useTestExecution() {
  const [execution, setExecution] = useState<TestExecution>({
    id: "",
    status: "idle",
    workflowName: "",
    logs: [],
    blockResults: {},
  })
  const { toast } = useToast()

  const startExecution = useCallback(
    (workflowName: string) => {
      const executionId = `exec-${Date.now()}`

      console.log("🚀 Starting test execution:", workflowName)

      setExecution({
        id: executionId,
        status: "running",
        workflowName,
        startTime: new Date(),
        logs: [`🚀 Starting test execution: ${workflowName}`],
        totalSteps: 0,
        completedSteps: 0,
        currentStep: "Initializing...",
        blockResults: {},
      })

      toast({
        title: "Test Started",
        description: `Running workflow: ${workflowName}`,
      })

      return executionId
    },
    [toast],
  )

  const updateExecution = useCallback((updates: Partial<TestExecution>) => {
    console.log("📊 Updating test execution:", updates)

    setExecution((prev) => ({
      ...prev,
      ...updates,
      logs: updates.logs ? [...prev.logs, ...updates.logs] : prev.logs,
    }))
  }, [])

  const completeExecution = useCallback(
    (success: boolean, error?: string) => {
      console.log("🏁 Completing test execution:", success ? "SUCCESS" : "FAILED", error)

      setExecution((prev) => ({
        ...prev,
        status: success ? "success" : "failed",
        endTime: new Date(),
        error,
        logs: [
          ...prev.logs,
          success ? "✅ Test execution completed successfully" : `❌ Test execution failed: ${error}`,
        ],
      }))

      toast({
        title: success ? "Test Completed" : "Test Failed",
        description: success ? "All tests passed successfully!" : `Test failed: ${error}`,
        variant: success ? "default" : "destructive",
      })
    },
    [toast],
  )

  const resetExecution = useCallback(() => {
    console.log("🔄 Resetting test execution")

    setExecution({
      id: "",
      status: "idle",
      workflowName: "",
      logs: [],
      blockResults: {},
    })
  }, [])

  const updateBlockStatus = useCallback(
    (blockId: string, itemId: string, status: "running" | "success" | "failed", error?: string, duration?: number) => {
      console.log(`📊 Block ${blockId} status:`, status, error ? `(${error})` : "")

      setExecution((prev) => ({
        ...prev,
        currentBlockId: status === "running" ? itemId : prev.currentBlockId,
        blockResults: {
          ...prev.blockResults,
          [itemId]: {
            blockId,
            itemId,
            status: status === "running" ? "success" : status, // Don't store 'running' as final status
            error,
            duration: duration || 0,
            timestamp: new Date(),
          },
        },
      }))
    },
    [],
  )

  return {
    execution,
    startExecution,
    updateExecution,
    updateBlockStatus,
    completeExecution,
    resetExecution,
  }
}
