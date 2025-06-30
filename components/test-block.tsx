"use client"

import { useDraggable } from "@dnd-kit/core"
import type { TestBlockDefinition } from "@/types/workflow"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, MoreVertical, Copy, Trash2, Tag, GripVertical, Bug, Code, Edit } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface TestBlockProps {
  block: TestBlockDefinition
  draggable?: boolean
  isDragging?: boolean
  onInspect?: (block: TestBlockDefinition) => void
  onEdit?: (block: TestBlockDefinition) => void
  onDelete?: (blockId: string) => void
  onDuplicate?: (block: TestBlockDefinition) => void
  onDebug?: (block: TestBlockDefinition) => void
}

const tagColors = {
  authentication: "bg-blue-100 text-blue-800 border-blue-200",
  form: "bg-green-100 text-green-800 border-green-200",
  navigation: "bg-purple-100 text-purple-800 border-purple-200",
  validation: "bg-orange-100 text-orange-800 border-orange-200",
  api: "bg-red-100 text-red-800 border-red-200",
  database: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ui: "bg-pink-100 text-pink-800 border-pink-200",
  interaction: "bg-cyan-100 text-cyan-800 border-cyan-200",
  wait: "bg-yellow-100 text-yellow-800 border-yellow-200",
  assertion: "bg-emerald-100 text-emerald-800 border-emerald-200",
  screenshot: "bg-violet-100 text-violet-800 border-violet-200",
  debug: "bg-gray-100 text-gray-800 border-gray-200",
  default: "bg-slate-100 text-slate-800 border-slate-200",
}

const getTagColor = (tag: string): string => {
  return tagColors[tag as keyof typeof tagColors] || tagColors.default
}

export function TestBlock({
                            block,
                            draggable = false,
                            isDragging = false,
                            onInspect,
                            onEdit,
                            onDelete,
                            onDuplicate,
                            onDebug,
                          }: TestBlockProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: block.id,
    disabled: !draggable,
  })

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    }
    : undefined

  // ✅ KORRIGIERTES & VEREINFACHTES ICON-RENDERING
  const renderIcon = () => {
    const IconComponent = block.icon
    // Wenn eine Icon-Komponente existiert, rendere sie.
    // Der try-catch fängt alle Fehler ab, falls es keine gültige Komponente ist.
    try {
      if (IconComponent) {
        return <IconComponent className="w-4 h-4 text-white" />
      }
      // Fallback, wenn kein Icon definiert ist.
      return <Code className="w-4 h-4 text-white" />
    } catch (error) {
      // Fallback bei einem Render-Fehler.
      console.error(`Error rendering icon for block: "${block.name}"`, error)
      return <Code className="w-4 h-4 text-white" />
    }
  }

  const handleInspect = () => onInspect?.(block)
  const handleEdit = () => onEdit?.(block)
  const handleDelete = () => {
    if (confirm(`Delete "${block.name}"? This cannot be undone.`)) onDelete?.(block.id)
  }
  const handleDuplicate = () => onDuplicate?.(block)
  const handleDebug = () => onDebug?.(block)

  const showActions = onInspect || onDebug || (block.isCustom && (onEdit || onDelete || onDuplicate))
  const blockTags = block.tags || []

  return (
    <Card
      style={style}
      className={`group relative transition-all hover:shadow-md ${isDragging ? "opacity-75 shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-3 p-4">
        {draggable && (
          <div
            ref={setNodeRef}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}

        <div className={`p-2 rounded-lg ${block.color} flex-shrink-0`}>{renderIcon()}</div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{block.name}</h4>
          <p className="text-sm text-gray-600 truncate">{block.description}</p>

          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {block.isCustom && (
              <Badge variant="secondary" className="text-xs">
                Custom
              </Badge>
            )}
            {blockTags.slice(0, 2).map((tag: any) => {
              const tagName = typeof tag === "string" ? tag : tag.name
              const tagColor = typeof tag === "object" && tag.color ? tag.color : getTagColor(tagName)
              return (
                <Badge key={tagName} className={`text-xs border ${tagColor} flex items-center gap-1`}>
                  <Tag className="w-2 h-2" />
                  {tagName}
                </Badge>
              )
            })}
            {blockTags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{blockTags.length - 2}
              </Badge>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDebug && block.isCustom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDebug}
                className="h-8 w-8 p-0 hover:bg-blue-100 mr-1"
                type="button"
                title="Debug Block"
              >
                <Bug className="w-4 h-4 text-blue-600" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100" type="button">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onInspect && (
                  <DropdownMenuItem onClick={handleInspect} className="cursor-pointer">
                    <Eye className="w-4 h-4 mr-2" />
                    Inspect
                  </DropdownMenuItem>
                )}
                {onDebug && (
                  <DropdownMenuItem onClick={handleDebug} className="cursor-pointer">
                    <Bug className="w-4 h-4 mr-2 text-blue-600" />
                    Debug Block
                  </DropdownMenuItem>
                )}
                {block.isCustom && onEdit && (
                  <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onClick={handleDuplicate} className="cursor-pointer">
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {block.isCustom && onDelete && (
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600 cursor-pointer">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </Card>
  )
}
