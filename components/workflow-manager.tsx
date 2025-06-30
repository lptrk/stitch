"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Workflow } from "@/types/workflow"
import { Plus, Edit, Trash2, Play } from "lucide-react"

interface WorkflowManagerProps {
  workflows: Workflow[]
  currentWorkflowId: string
  onCreateWorkflow: (name: string, description?: string) => void
  onSelectWorkflow: (id: string) => void
  onDeleteWorkflow: (id: string) => void
  onRenameWorkflow: (id: string, name: string, description?: string) => void
}

export function WorkflowManager({
  workflows,
  currentWorkflowId,
  onCreateWorkflow,
  onSelectWorkflow,
  onDeleteWorkflow,
  onRenameWorkflow,
}: WorkflowManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [newWorkflowName, setNewWorkflowName] = useState("")
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("")

  const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId)

  const handleCreateWorkflow = () => {
    if (newWorkflowName.trim()) {
      onCreateWorkflow(newWorkflowName.trim(), newWorkflowDescription.trim() || undefined)
      setNewWorkflowName("")
      setNewWorkflowDescription("")
      setCreateDialogOpen(false)
    }
  }

  const handleEditWorkflow = () => {
    if (editingWorkflow && newWorkflowName.trim()) {
      onRenameWorkflow(editingWorkflow.id, newWorkflowName.trim(), newWorkflowDescription.trim() || undefined)
      setEditDialogOpen(false)
      setEditingWorkflow(null)
      setNewWorkflowName("")
      setNewWorkflowDescription("")
    }
  }

  const openEditDialog = (workflow: Workflow) => {
    setEditingWorkflow(workflow)
    setNewWorkflowName(workflow.name)
    setNewWorkflowDescription(workflow.description || "")
    setEditDialogOpen(true)
  }

  return (
    <div className="flex items-center gap-4">
      {/* Current Workflow Selector */}
      <div className="flex items-center gap-2">
        <Label htmlFor="workflow-select" className="text-sm font-medium">
          Current Workflow:
        </Label>
        <Select value={currentWorkflowId} onValueChange={onSelectWorkflow}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select workflow" />
          </SelectTrigger>
          <SelectContent>
            {workflows.map((workflow) => (
              <SelectItem key={workflow.id} value={workflow.id}>
                <div className="flex items-center gap-2">
                  <Play className="w-3 h-3" />
                  {workflow.name} ({workflow.items.length} steps)
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Create New Workflow */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="workflow-description">Description (optional)</Label>
              <Textarea
                id="workflow-description"
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                placeholder="Enter workflow description..."
                className="mt-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkflow} disabled={!newWorkflowName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Current Workflow */}
      {currentWorkflow && (
        <Button variant="ghost" size="sm" onClick={() => openEditDialog(currentWorkflow)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      )}

      {/* Delete Current Workflow */}
      {currentWorkflow && workflows.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteWorkflow(currentWorkflowId)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-workflow-name">Workflow Name</Label>
              <Input
                id="edit-workflow-name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-workflow-description">Description (optional)</Label>
              <Textarea
                id="edit-workflow-description"
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                placeholder="Enter workflow description..."
                className="mt-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditWorkflow} disabled={!newWorkflowName.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
