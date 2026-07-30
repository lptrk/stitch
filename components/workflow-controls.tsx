"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ParametrizedRun } from "@/components/parametrized-run"
import { Play, Loader2 } from "lucide-react"
import type { Workflow, WorkflowConfig } from "@/types/workflow"
import { buildWorkflowConfig } from "@/lib/code-generators"
import { useToast } from "@/hooks/use-toast"

interface WorkflowControlsProps {
  workflows: Workflow[]
  currentWorkflowId: string
  baseUrl: string
  isRunning?: boolean
  onRunWorkflow: (config: WorkflowConfig) => Promise<void>
}

export function WorkflowControls({
  workflows,
  currentWorkflowId,
  baseUrl,
  isRunning = false,
  onRunWorkflow,
}: WorkflowControlsProps) {
  const { toast } = useToast()
  const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId)
  const canRun = !!currentWorkflow && currentWorkflow.items.length > 0 && !isRunning

  const runWorkflow = async () => {
    const workflowConfig = buildWorkflowConfig(workflows, currentWorkflowId, baseUrl)
    try {
      await onRunWorkflow(workflowConfig)
    } catch (error) {
      toast({ title: "Failed to run workflow", variant: "destructive" })
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <ParametrizedRun
        workflow={currentWorkflow}
        baseUrl={baseUrl}
        isRunning={isRunning}
        onRunWorkflow={onRunWorkflow}
      />

      <Separator orientation="vertical" className="h-4" />

      <Button
        size="sm"
        onClick={runWorkflow}
        disabled={!canRun}
        className="h-7 px-3 gap-1.5 text-xs"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            Run
          </>
        )}
      </Button>
    </div>
  )
}
