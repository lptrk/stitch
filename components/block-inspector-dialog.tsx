"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconPicker } from "./icon-picker"
import type { TestBlockDefinition } from "@/types/workflow"
import { Eye, Edit, Code, Save, X, Copy, Download, Settings, Info, Trash2, Plus, Tag } from "lucide-react"

interface BlockInspectorDialogProps {
  block: TestBlockDefinition | null
  open: boolean
  onClose: () => void
  onSave?: (updatedBlock: TestBlockDefinition) => void
  onDelete?: (blockId: string) => void
  onDuplicate?: (block: TestBlockDefinition) => void
  readonly?: boolean
}

const blockCategories = [
  { id: "click", name: "Click Actions" },
  { id: "input", name: "Input Actions" },
  { id: "navigation", name: "Navigation" },
  { id: "verification", name: "Verification" },
  { id: "utility", name: "Utility" },
  { id: "custom", name: "Custom" },
]

export function BlockInspectorDialog({
  block,
  open,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  readonly = false,
}: BlockInspectorDialogProps) {
  const [editMode, setEditMode] = useState(false)
  const [editedBlock, setEditedBlock] = useState<TestBlockDefinition | null>(null)
  const [activeTab, setActiveTab] = useState<"info" | "parameters" | "code">("info")
  const [newTag, setNewTag] = useState("")

  useEffect(() => {
    if (block) {
      setEditedBlock({ ...block })
      setEditMode(false)
      setActiveTab("info")
    }
  }, [block])

  if (!block || !editedBlock) return null

  const isCustomBlock = block.isCustom
  const canEdit = !readonly && isCustomBlock && onSave
  const canDelete = !readonly && isCustomBlock && onDelete

  const handleSave = () => {
    if (editedBlock && onSave) {
      // Validate required fields
      if (!editedBlock.name.trim()) {
        alert("Block name is required")
        return
      }
      if (isCustomBlock && !editedBlock.customCode?.trim()) {
        alert("Custom code is required for custom blocks")
        return
      }

      onSave(editedBlock)
      setEditMode(false)
    }
  }

  const handleCancel = () => {
    setEditedBlock({ ...block })
    setEditMode(false)
  }

  const handleDuplicate = () => {
    if (onDuplicate && block) {
      const duplicatedBlock = {
        ...block,
        id: `${block.id}_copy_${Date.now()}`,
        name: `${block.name} (Copy)`,
        playwrightFunction: `${block.playwrightFunction}_copy_${Date.now()}`,
      }
      onDuplicate(duplicatedBlock)
    }
  }

  const handleExportBlock = () => {
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      blocks: [
        {
          id: block.id,
          name: block.name,
          description: block.description,
          category: (block as any).category || "custom",
          iconName: block.icon.name,
          code: block.customCode || "",
          parameters: block.parameters || [],
          tags: (block as any).tags || [],
          createdAt: new Date().toISOString(),
        },
      ],
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `${block.name.toLowerCase().replace(/\s+/g, "-")}-block.json`
    link.click()

    URL.revokeObjectURL(url)
  }

  const addParameter = () => {
    if (!editedBlock) return
    const newParam = {
      id: `param_${Date.now()}`,
      name: "",
      type: "text" as const,
      required: false,
      placeholder: "",
    }
    setEditedBlock({
      ...editedBlock,
      parameters: [...(editedBlock.parameters || []), newParam],
    })
  }

  const updateParameter = (index: number, field: string, value: any) => {
    if (!editedBlock) return
    const updatedParams = [...(editedBlock.parameters || [])]
    updatedParams[index] = { ...updatedParams[index], [field]: value }
    setEditedBlock({ ...editedBlock, parameters: updatedParams })
  }

  const removeParameter = (index: number) => {
    if (!editedBlock) return
    const updatedParams = [...(editedBlock.parameters || [])]
    updatedParams.splice(index, 1)
    setEditedBlock({ ...editedBlock, parameters: updatedParams })
  }

  const addTag = () => {
    if (!newTag.trim() || !editedBlock) return
    const currentTags = (editedBlock as any).tags || []
    if (currentTags.includes(newTag.trim())) return

    setEditedBlock({
      ...editedBlock,
      tags: [...currentTags, newTag.trim()],
    } as any)
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    if (!editedBlock) return
    const currentTags = (editedBlock as any).tags || []
    setEditedBlock({
      ...editedBlock,
      tags: currentTags.filter((tag: string) => tag !== tagToRemove),
    } as any)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Block Inspector: {block.name}
              {isCustomBlock && <Badge variant="secondary">Custom</Badge>}
              {readonly && <Badge variant="outline">Read Only</Badge>}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-8">
              {canEdit && !editMode && (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              {editMode && (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Info className="w-4 h-4 inline mr-1" />
            Info
          </button>
          <button
            onClick={() => setActiveTab("parameters")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "parameters"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="w-4 h-4 inline mr-1" />
            Parameters ({editedBlock.parameters?.length || 0})
          </button>
          {isCustomBlock && (
            <button
              onClick={() => setActiveTab("code")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "code"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Code className="w-4 h-4 inline mr-1" />
              Code
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-6">
            {/* Info Tab */}
            {activeTab === "info" && (
              <div className="space-y-6">
                {/* Block Preview */}
                <div className="p-4 border rounded-lg bg-gray-50">
                  <Label className="text-sm font-medium mb-2 block">Preview</Label>
                  <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                    <div className={`p-2 rounded-lg ${editedBlock.color}`}>
                      <editedBlock.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{editedBlock.name}</h4>
                      <p className="text-sm text-gray-600">{editedBlock.description}</p>
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="block-name">Block Name *</Label>
                    {editMode ? (
                      <Input
                        id="block-name"
                        value={editedBlock.name}
                        onChange={(e) => setEditedBlock({ ...editedBlock, name: e.target.value })}
                        className="mt-1"
                        required
                      />
                    ) : (
                      <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">{editedBlock.name}</div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="block-id">Block ID</Label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border text-sm font-mono flex items-center justify-between">
                      {editedBlock.id}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(editedBlock.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="block-description">Description</Label>
                  {editMode ? (
                    <Textarea
                      id="block-description"
                      value={editedBlock.description}
                      onChange={(e) => setEditedBlock({ ...editedBlock, description: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">{editedBlock.description}</div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <Label>Tags</Label>
                  <div className="mt-2 space-y-2">
                    {/* Current Tags */}
                    <div className="flex flex-wrap gap-2">
                      {((editedBlock as any).tags || []).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {tag}
                          {editMode && (
                            <button onClick={() => removeTag(tag)} className="ml-1 text-gray-500 hover:text-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                      {((editedBlock as any).tags || []).length === 0 && (
                        <span className="text-sm text-gray-500 italic">No tags</span>
                      )}
                    </div>

                    {/* Add Tag */}
                    {editMode && (
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add tag..."
                          className="flex-1"
                          onKeyPress={(e) => e.key === "Enter" && addTag()}
                        />
                        <Button variant="outline" size="sm" onClick={addTag} disabled={!newTag.trim()}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category & Icon */}
                {isCustomBlock && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="block-category">Category</Label>
                      {editMode ? (
                        <Select
                          value={(editedBlock as any).category || "custom"}
                          onValueChange={(value) => setEditedBlock({ ...editedBlock, category: value } as any)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {blockCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">
                          {blockCategories.find((c) => c.id === (editedBlock as any).category)?.name || "Custom"}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Icon</Label>
                      {editMode ? (
                        <div className="mt-1">
                          <IconPicker
                            selectedIcon={editedBlock.icon}
                            onIconSelect={(icon) => setEditedBlock({ ...editedBlock, icon })}
                            category={(editedBlock as any).category}
                          />
                        </div>
                      ) : (
                        <div className="mt-1 p-2 bg-gray-50 rounded border text-sm flex items-center gap-2">
                          <editedBlock.icon className="w-4 h-4" />
                          {editedBlock.icon.name}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Technical Info */}
                <div>
                  <Label>Technical Details</Label>
                  <div className="mt-1 space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded border text-sm">
                      <span>Playwright Function:</span>
                      <code className="font-mono">{editedBlock.playwrightFunction}</code>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded border text-sm">
                      <span>Type:</span>
                      <Badge variant={isCustomBlock ? "default" : "secondary"}>
                        {isCustomBlock ? "Custom Block" : "Built-in Block"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded border text-sm">
                      <span>Parameters:</span>
                      <span>{editedBlock.parameters?.length || 0} parameters</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Parameters Tab */}
            {activeTab === "parameters" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Block Parameters</Label>
                  {editMode && (
                    <Button variant="outline" size="sm" onClick={addParameter}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Parameter
                    </Button>
                  )}
                </div>

                {!editedBlock.parameters || editedBlock.parameters.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No parameters defined</p>
                    {editMode && <p className="text-sm">Click "Add Parameter" to create one</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editedBlock.parameters.map((param, index) => (
                      <div key={param.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Parameter {index + 1}</h4>
                          {editMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeParameter(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Name</Label>
                            {editMode ? (
                              <Input
                                value={param.name}
                                onChange={(e) => updateParameter(index, "name", e.target.value)}
                                className="h-8 text-sm"
                              />
                            ) : (
                              <div className="h-8 px-2 py-1 bg-gray-50 rounded border text-sm">{param.name}</div>
                            )}
                          </div>

                          <div>
                            <Label className="text-xs">Type</Label>
                            {editMode ? (
                              <Select
                                value={param.type}
                                onValueChange={(value) => updateParameter(index, "type", value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="selector">Selector</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="h-8 px-2 py-1 bg-gray-50 rounded border text-sm capitalize">
                                {param.type}
                              </div>
                            )}
                          </div>

                          <div>
                            <Label className="text-xs">Placeholder</Label>
                            {editMode ? (
                              <Input
                                value={param.placeholder || ""}
                                onChange={(e) => updateParameter(index, "placeholder", e.target.value)}
                                className="h-8 text-sm"
                              />
                            ) : (
                              <div className="h-8 px-2 py-1 bg-gray-50 rounded border text-sm">
                                {param.placeholder || "—"}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Required</Label>
                            {editMode ? (
                              <input
                                type="checkbox"
                                checked={param.required}
                                onChange={(e) => updateParameter(index, "required", e.target.checked)}
                                className="rounded"
                              />
                            ) : (
                              <Badge variant={param.required ? "default" : "outline"}>
                                {param.required ? "Required" : "Optional"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Code Tab */}
            {activeTab === "code" && isCustomBlock && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Playwright Code *</Label>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(editedBlock.customCode || "")}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Code
                  </Button>
                </div>

                {editMode ? (
                  <Textarea
                    value={editedBlock.customCode || ""}
                    onChange={(e) => setEditedBlock({ ...editedBlock, customCode: e.target.value })}
                    className="font-mono text-sm min-h-[300px]"
                    placeholder="Enter your Playwright code here..."
                    required
                  />
                ) : (
                  <div className="relative">
                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto min-h-[300px]">
                      <code>{editedBlock.customCode || "// No code defined"}</code>
                    </pre>
                  </div>
                )}

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <p className="text-blue-800">
                    <strong>Available variables:</strong> <code>page</code> (Playwright page), <code>parameters</code>{" "}
                    (block parameters), <code>expect</code> (Playwright expect), <code>console</code>
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onDuplicate && (
                <Button variant="outline" size="sm" onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-1" />
                  Duplicate
                </Button>
              )}
              {isCustomBlock && (
                <Button variant="outline" size="sm" onClick={handleExportBlock}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(block.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
