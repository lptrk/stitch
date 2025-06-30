"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Workflow, WorkflowConfig } from "@/types/workflow"
import { Download, Upload, Play, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WorkflowControlsProps {
  workflows: Workflow[]
  currentWorkflowId: string
  baseUrl: string
  isRunning?: boolean
  onImportWorkflows: (workflows: Workflow[]) => void
  onClearCurrentWorkflow: () => void
  onRunWorkflow: (config: WorkflowConfig) => Promise<void>
}

export function WorkflowControls({
  workflows,
  currentWorkflowId,
  baseUrl,
  isRunning = false,
  onImportWorkflows,
  onClearCurrentWorkflow,
  onRunWorkflow,
}: WorkflowControlsProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const { toast } = useToast()

  const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId)

  const exportWorkflows = () => {
    const workflowConfig: WorkflowConfig = {
      baseUrl,
      workflows: workflows.reduce(
        (acc, workflow) => {
          acc[workflow.id] = {
            name: workflow.name,
            description: workflow.description,
            workflow: workflow.items.map((item) => ({
              block: item.blockId,
              parameters: item.parameters,
            })),
          }
          return acc
        },
        {} as WorkflowConfig["workflows"],
      ),
      mainWorkflow: currentWorkflowId,
    }

    const dataStr = JSON.stringify(workflowConfig, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = "workflows.json"
    link.click()

    URL.revokeObjectURL(url)

    toast({
      title: "Workflows exported",
      description: `Exported ${workflows.length} workflows to workflows.json`,
    })
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const workflowConfig: WorkflowConfig = JSON.parse(content)

        // Convert imported workflows
        const importedWorkflows: Workflow[] = Object.entries(workflowConfig.workflows).map(([id, config]) => ({
          id,
          name: config.name,
          description: config.description,
          items: config.workflow.map((item: any, index: number) => ({
            id: `${item.block}-${Date.now()}-${index}`,
            blockId: item.block,
            block: {
              id: item.block,
              name: item.block,
              description: `Imported block: ${item.block}`,
              icon: Play,
              color: "bg-gray-500",
            },
            parameters: item.parameters || {},
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        }))

        onImportWorkflows(importedWorkflows)
        setImportDialogOpen(false)

        toast({
          title: "Workflows imported",
          description: `Successfully imported ${importedWorkflows.length} workflows`,
        })
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid workflow file format",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  const runWorkflow = async () => {
    const workflowConfig: WorkflowConfig = {
      baseUrl,
      workflows: workflows.reduce(
        (acc, workflow) => {
          acc[workflow.id] = {
            name: workflow.name,
            description: workflow.description,
            workflow: workflow.items.map((item) => ({
              block: item.blockId,
              parameters: item.parameters,
            })),
          }
          return acc
        },
        {} as WorkflowConfig["workflows"],
      ),
      mainWorkflow: currentWorkflowId,
    }

    try {
      await onRunWorkflow(workflowConfig)
    } catch (error) {
      console.error("Failed to run workflow:", error)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={exportWorkflows} disabled={workflows.length === 0 || isRunning}>
        <Upload className="w-4 h-4 mr-2" />
        Export All
      </Button>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isRunning}>
            <Download className="w-4 h-4 mr-2" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Workflows</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workflow-file">Select workflows.json file</Label>
              <Input id="workflow-file" type="file" accept=".json" onChange={handleImport} className="mt-2" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="default"
        size="sm"
        onClick={runWorkflow}
        disabled={!currentWorkflow || currentWorkflow.items.length === 0 || isRunning}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Run Test
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onClearCurrentWorkflow}
        disabled={!currentWorkflow || currentWorkflow.items.length === 0 || isRunning}
        className="text-red-600 hover:text-red-700 bg-transparent"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Clear
      </Button>
    </div>
  )
}
