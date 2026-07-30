"use client"

import { useDraggable } from "@dnd-kit/core"
import type { TestBlockDefinition } from "@/types/workflow"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, MoreVertical, Copy, Trash2, GripVertical, Bug, Code, Edit, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    const closeKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false) }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", closeKey)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", closeKey)
    }
  }, [menuOpen])

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 })
    setMenuOpen((v) => !v)
  }

  const renderIcon = () => {
    const IconComponent = block.icon
    try {
      if (IconComponent) return <IconComponent className="w-3 h-3 text-white" />
      return <Code className="w-3 h-3 text-white" />
    } catch {
      return <Code className="w-3 h-3 text-white" />
    }
  }

  const showActions = onInspect || onDebug || (block.isCustom && (onEdit || onDelete || onDuplicate))

  return (
    <>
      <Card
        style={style}
        className={`group relative transition-all hover:shadow-md w-full ${isDragging ? "opacity-75 shadow-lg" : ""}`}
      >
        <div className="flex items-center gap-2 p-2">
          {draggable && (
            <div
              ref={setNodeRef}
              className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-accent transition-colors flex-shrink-0"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-3 h-3 text-muted-foreground/70" />
            </div>
          )}

          <div className={`p-1 rounded ${block.color} flex-shrink-0`}>{renderIcon()}</div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground truncate text-xs">{block.name}</h4>
            {block.isCustom && (
              <Badge variant="secondary" className="text-xs px-1 py-0 h-4 mt-0.5">Custom</Badge>
            )}
          </div>

          {block.description && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-shrink-0 text-muted-foreground/70 hover:text-muted-foreground cursor-help p-0.5" onClick={(e) => e.stopPropagation()}>
                    <Info className="w-3 h-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[220px] text-xs leading-relaxed">
                  <p className="font-medium text-foreground mb-0.5">{block.name}</p>
                  <p className="text-muted-foreground">{block.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {showActions && (
            <div className="flex-shrink-0 hidden group-hover:flex items-center">
              {onDebug && block.isCustom && (
                <Button
                  variant="ghost" size="sm"
                  onClick={(e) => { e.stopPropagation(); onDebug(block) }}
                  className="h-7 w-7 p-0 hover:bg-accent mr-0.5"
                  type="button" title="Debug"
                >
                  <Bug className="w-3.5 h-3.5 text-primary" />
                </Button>
              )}
              <Button
                ref={triggerRef}
                variant="ghost" size="sm"
                className="h-7 w-7 p-0 hover:bg-accent"
                type="button"
                onClick={openMenu}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {menuOpen && typeof document !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 50 }}
          className="w-40 bg-card border border-border rounded-md shadow-lg py-1 text-sm"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {onInspect && (
            <button
              onClick={() => { onInspect(block); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground"
            >
              <Eye className="w-3.5 h-3.5 flex-shrink-0" /> Inspect
            </button>
          )}
          {onDebug && (
            <button
              onClick={() => { onDebug(block); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground"
            >
              <Bug className="w-3.5 h-3.5 flex-shrink-0 text-primary" /> Debug
            </button>
          )}
          {block.isCustom && onEdit && (
            <button
              onClick={() => { onEdit(block); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground"
            >
              <Edit className="w-3.5 h-3.5 flex-shrink-0" /> Edit
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={() => { onDuplicate(block); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground"
            >
              <Copy className="w-3.5 h-3.5 flex-shrink-0" /> Duplicate
            </button>
          )}
          {block.isCustom && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-left text-red-600">
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{block.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the custom block. Any workflow steps using it will break.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setMenuOpen(false)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => { onDelete(block.id); setMenuOpen(false) }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
