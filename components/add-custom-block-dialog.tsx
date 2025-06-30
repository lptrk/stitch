"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { IconPicker } from "./icon-picker"
import type { LucideIcon } from "lucide-react"
import { Plus, Code, MousePointer, Type, Eye, Settings, Navigation, Zap, X, Tag, Palette } from "lucide-react"

interface CustomBlockData {
  name: string
  description: string
  category: string
  icon: LucideIcon
  code: string
  tags: Array<{ name: string; color: string }>
  parameters: Array<{
    id: string
    name: string
    type: "text" | "number" | "selector"
    required: boolean
    placeholder: string
  }>
}

interface AddCustomBlockDialogProps {
  onAddBlock: (blockData: CustomBlockData) => void
}

const blockCategories = [
  { id: "click", name: "Click Actions", icon: MousePointer, color: "bg-blue-500" },
  { id: "input", name: "Input Actions", icon: Type, color: "bg-green-500" },
  { id: "navigation", name: "Navigation", icon: Navigation, color: "bg-purple-500" },
  { id: "verification", name: "Verification", icon: Eye, color: "bg-orange-500" },
  { id: "utility", name: "Utility", icon: Settings, color: "bg-gray-500" },
  { id: "custom", name: "Custom", icon: Zap, color: "bg-pink-500" },
]

const codeTemplates = {
  click: `// Click on an element
console.log('Clicking:', parameters.selector)
await page.click(parameters.selector || 'button')
await page.waitForTimeout(500)`,

  input: `// Fill an input field
console.log('Filling input:', parameters.selector, 'with:', parameters.text)
await page.fill(parameters.selector || 'input', parameters.text || '')`,

  navigation: `// Navigate to a page
const url = parameters.url || '/'
console.log('Navigating to:', url)
await page.goto(url)
await page.waitForLoadState('networkidle')`,

  verification: `// Verify element is visible
console.log('Verifying element is visible:', parameters.selector)
await expect(page.locator(parameters.selector || 'body')).toBeVisible()`,

  utility: `// Wait for specified time
const delay = parseInt(parameters.delay) || 1000
console.log('Waiting for:', delay, 'ms')
await page.waitForTimeout(delay)`,

  custom: `// Your custom Playwright code here
// Available: page, parameters, expect, console
console.log('Custom block executed with parameters:', parameters)

// Example: Click and verify
// await page.click(parameters.selector)
// await expect(page.locator('.success')).toBeVisible()`,
}

const tagColorOptions = [
  { name: "Blue", value: "bg-blue-100 text-blue-800 border-blue-200", preview: "bg-blue-500" },
  { name: "Green", value: "bg-green-100 text-green-800 border-green-200", preview: "bg-green-500" },
  { name: "Purple", value: "bg-purple-100 text-purple-800 border-purple-200", preview: "bg-purple-500" },
  { name: "Orange", value: "bg-orange-100 text-orange-800 border-orange-200", preview: "bg-orange-500" },
  { name: "Red", value: "bg-red-100 text-red-800 border-red-200", preview: "bg-red-500" },
  { name: "Indigo", value: "bg-indigo-100 text-indigo-800 border-indigo-200", preview: "bg-indigo-500" },
  { name: "Pink", value: "bg-pink-100 text-pink-800 border-pink-200", preview: "bg-pink-500" },
  { name: "Cyan", value: "bg-cyan-100 text-cyan-800 border-cyan-200", preview: "bg-cyan-500" },
  { name: "Yellow", value: "bg-yellow-100 text-yellow-800 border-yellow-200", preview: "bg-yellow-500" },
  { name: "Emerald", value: "bg-emerald-100 text-emerald-800 border-emerald-200", preview: "bg-emerald-500" },
  { name: "Violet", value: "bg-violet-100 text-violet-800 border-violet-200", preview: "bg-violet-500" },
  { name: "Gray", value: "bg-gray-100 text-gray-800 border-gray-200", preview: "bg-gray-500" },
]

export function AddCustomBlockDialog({ onAddBlock }: AddCustomBlockDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    icon: Code as LucideIcon,
    code: "",
    tags: [] as Array<{ name: string; color: string }>,
  })
  const [parameters, setParameters] = useState<
    Array<{
      id: string
      name: string
      type: "text" | "number" | "selector"
      required: boolean
      placeholder: string
    }>
  >([])
  const [newTag, setNewTag] = useState("")
  const [selectedTagColor, setSelectedTagColor] = useState(tagColorOptions[0].value)

  const handleCategoryChange = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      category,
      code: codeTemplates[category as keyof typeof codeTemplates] || codeTemplates.custom,
    }))
  }

  const addParameter = () => {
    const newParam = {
      id: `param_${Date.now()}`,
      name: "",
      type: "text" as const,
      required: false,
      placeholder: "",
    }
    setParameters((prev) => [...prev, newParam])
  }

  const updateParameter = (index: number, field: string, value: any) => {
    setParameters((prev) => prev.map((param, i) => (i === index ? { ...param, [field]: value } : param)))
  }

  const removeParameter = (index: number) => {
    setParameters((prev) => prev.filter((_, i) => i !== index))
  }

  const addTag = () => {
    const trimmedTag = newTag.trim().toLowerCase()
    if (trimmedTag && !formData.tags.some((tag) => tag.name === trimmedTag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, { name: trimmedTag, color: selectedTagColor }],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag.name !== tagToRemove),
    }))
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.code) {
      alert("Please fill in all required fields (Name, Category, Code)")
      return
    }

    const blockData: CustomBlockData = {
      name: formData.name,
      description: formData.description || `Custom ${formData.category} block`,
      category: formData.category,
      icon: formData.icon,
      code: formData.code,
      tags: formData.tags,
      parameters: parameters.filter((p) => p.name.trim() !== ""),
    }

    onAddBlock(blockData)

    // Reset form
    setFormData({
      name: "",
      description: "",
      category: "",
      icon: Code,
      code: "",
      tags: [],
    })
    setParameters([])
    setNewTag("")
    setSelectedTagColor(tagColorOptions[0].value)
    setOpen(false)
  }

  const selectedCategory = blockCategories.find((cat) => cat.id === formData.category)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Plus className="w-4 h-4" />
          Add Custom Block
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Create Custom Playwright Block
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="block-name">Block Name *</Label>
              <Input
                id="block-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Login User"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="block-category">Category *</Label>
              <Select value={formData.category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {blockCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <category.icon className="w-4 h-4" />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="block-description">Description</Label>
            <Input
              id="block-description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this block does"
              className="mt-1"
            />
          </div>

          {/* Tags with Colors */}
          <div>
            <Label>Tags</Label>
            <div className="mt-2 space-y-3">
              {/* Current Tags */}
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag.name} className={`border ${tag.color} flex items-center gap-1`}>
                    <Tag className="w-3 h-3" />
                    {tag.name}
                    <button onClick={() => removeTag(tag.name)} className="ml-1 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {formData.tags.length === 0 && <span className="text-sm text-gray-500 italic">No tags added</span>}
              </div>

              {/* Add Tag */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                  />
                  <Select value={selectedTagColor} onValueChange={setSelectedTagColor}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tagColorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${color.preview}`} />
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={addTag} disabled={!newTag.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Color Preview */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Palette className="w-4 h-4" />
                  <span>Preview:</span>
                  <Badge className={`border ${selectedTagColor}`}>
                    <Tag className="w-3 h-3 mr-1" />
                    {newTag || "example"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <Label>Icon</Label>
            <div className="mt-2">
              <IconPicker
                selectedIcon={formData.icon}
                onIconSelect={(icon) => setFormData((prev) => ({ ...prev, icon }))}
                category={formData.category}
              />
            </div>
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Parameters</Label>
              <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                <Plus className="w-3 h-3 mr-1" />
                Add Parameter
              </Button>
            </div>

            {parameters.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No parameters defined</p>
            ) : (
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <div key={param.id} className="flex gap-2 items-end p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-xs">Parameter Name</Label>
                      <Input
                        value={param.name}
                        onChange={(e) => updateParameter(index, "name", e.target.value)}
                        placeholder="e.g., selector"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="w-24">
                      <Label className="text-xs">Type</Label>
                      <Select value={param.type} onValueChange={(value) => updateParameter(index, "type", value)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="selector">Selector</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        value={param.placeholder}
                        onChange={(e) => updateParameter(index, "placeholder", e.target.value)}
                        placeholder="e.g., button[type='submit']"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => updateParameter(index, "required", e.target.checked)}
                        className="rounded"
                      />
                      <Label className="text-xs">Required</Label>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParameter(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Code Editor */}
          <div>
            <Label htmlFor="block-code">Playwright Code *</Label>
            <div className="mt-2">
              <Textarea
                id="block-code"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Enter your Playwright code here..."
                className="font-mono text-sm min-h-[200px]"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: <code>page</code> (Playwright page), <code>parameters</code> (block parameters),{" "}
                <code>expect</code> (Playwright expect), <code>console</code>
              </p>
            </div>
          </div>

          {/* Preview */}
          {formData.name && selectedCategory && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="mt-2 flex items-center gap-3 p-3 bg-white border rounded-lg">
                <div className={`p-2 rounded-lg ${selectedCategory.color}`}>
                  <formData.icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{formData.name}</h4>
                  <p className="text-sm text-gray-600">
                    {formData.description || `Custom ${selectedCategory.name.toLowerCase()} block`}
                  </p>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag.name} className={`text-xs border ${tag.color} flex items-center gap-1`}>
                          <Tag className="w-2 h-2" />
                          {tag.name}
                        </Badge>
                      ))}
                      {formData.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{formData.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.category || !formData.code}>
              Create Block
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
