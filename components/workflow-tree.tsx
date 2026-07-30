"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { ChevronRight, Folder, FolderOpen, FileText, Plus, FolderPlus, Edit, Trash2, MoreHorizontal, Play, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Workflow, WorkflowFolder, WorkflowTag } from "@/types/workflow"

interface WorkflowTreeProps {
  workflows: Workflow[]
  folders: WorkflowFolder[]
  currentWorkflowId: string
  onSelectWorkflow: (id: string) => void
  onCreateWorkflow: (name: string, folderId?: string) => void
  onCreateFolder: (name: string, parentId?: string) => void
  onRenameWorkflow: (id: string, name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteWorkflow: (id: string) => void
  onDeleteFolder: (id: string) => void
  onMoveWorkflow: (workflowId: string, folderId: string | undefined) => void
  onMoveFolder: (folderId: string, parentId: string | undefined) => void
}

type ContextMenuTarget =
  | { type: "workflow"; id: string }
  | { type: "folder"; id: string }
  | { type: "root" }

interface TreeNode {
  type: "folder" | "workflow"
  id: string
  name: string
  children?: TreeNode[]
  workflow?: Workflow
  folder?: WorkflowFolder
}

function buildTree(workflows: Workflow[], folders: WorkflowFolder[], parentId?: string): TreeNode[] {
  const nodes: TreeNode[] = []

  // Sub-folders at this level
  folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((folder) => {
      nodes.push({
        type: "folder",
        id: folder.id,
        name: folder.name,
        folder,
        children: buildTree(workflows, folders, folder.id),
      })
    })

  // Workflows at this level
  workflows
    .filter((w) => w.folderId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((workflow) => {
      nodes.push({
        type: "workflow",
        id: workflow.id,
        name: workflow.name,
        workflow,
      })
    })

  return nodes
}

// Shared state/handlers every tree node needs, bundled so TreeNodeItem doesn't need
// a huge individual prop list — plain object, not React Context (tree is shallow, no need).
interface TreeCtx {
  currentWorkflowId: string
  expanded: Set<string>
  renamingId: string | null
  renameValue: string
  renameRef: React.RefObject<HTMLInputElement>
  setRenameValue: (v: string) => void
  commitRename: () => void
  setRenamingId: (id: string | null) => void
  toggleExpand: (id: string) => void
  openContextMenu: (e: React.MouseEvent, target: ContextMenuTarget) => void
  creatingIn: { parentId?: string; type: "workflow" | "folder" } | null
  createRef: React.RefObject<HTMLInputElement>
  createValue: string
  setCreateValue: (v: string) => void
  commitCreate: () => void
  setCreatingIn: (v: { parentId?: string; type: "workflow" | "folder" } | null) => void
  onSelectWorkflow: (id: string) => void
}

// A real component (not a plain function called in a loop) so useDraggable/useDroppable's
// hook-call-count stays stable per instance even as folders expand/collapse — calling those
// hooks from inside a recursive closure invoked via .map() would violate the Rules of Hooks
// the moment the visible node count changes within a single WorkflowTree render.
function TreeNodeItem({ node, depth, ctx }: { node: TreeNode; depth: number; ctx: TreeCtx }) {
  const isActive = node.type === "workflow" && node.id === ctx.currentWorkflowId
  const isExpanded = node.type === "folder" && ctx.expanded.has(node.id)
  const isRenaming = ctx.renamingId === node.id
  const indent = depth * 12

  if (node.type === "folder") {
    // Folders are both draggable (can be moved into another folder) and droppable
    // (workflows/other folders can be dropped onto them).
    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
      id: `folder:${node.id}`,
      data: { kind: "folder", id: node.id },
      disabled: isRenaming,
    })
    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: `folder-drop:${node.id}`,
      data: { kind: "folder", id: node.id },
    })
    const setRefs = (el: HTMLDivElement | null) => { setDragRef(el); setDropRef(el) }

    return (
      <div style={{ opacity: isDragging ? 0.4 : 1 }}>
        <div
          ref={setRefs}
          {...attributes}
          {...listeners}
          className={`group flex items-center gap-1 px-2 py-[3px] rounded cursor-pointer select-none transition-colors ${
            isOver ? "bg-accent ring-1 ring-primary/50" : "hover:bg-accent"
          }`}
          style={{ paddingLeft: 8 + indent, transform: CSS.Translate.toString(transform) }}
          onClick={() => ctx.toggleExpand(node.id)}
          onContextMenu={(e) => ctx.openContextMenu(e, { type: "folder", id: node.id })}
        >
          <ChevronRight className={`w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          {isExpanded
            ? <FolderOpen className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
            : <Folder className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
          }

          {isRenaming ? (
            <input
              ref={ctx.renameRef}
              value={ctx.renameValue}
              onChange={(e) => ctx.setRenameValue(e.target.value)}
              onBlur={ctx.commitRename}
              onKeyDown={(e) => { if (e.key === "Enter") ctx.commitRename(); if (e.key === "Escape") ctx.setRenamingId(null) }}
              className="flex-1 text-xs bg-card border border-primary/60 rounded px-1 py-0 outline-none min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 min-w-0 text-xs text-foreground truncate font-medium">{node.name}</span>
          )}

          <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 mr-1">
            {node.children?.length ?? 0}
          </span>

          <button
            className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-accent flex-shrink-0"
            onClick={(e) => ctx.openContextMenu(e, { type: "folder", id: node.id })}
          >
            <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        {isExpanded && (
          <div>
            {node.children?.map((child) => <TreeNodeItem key={child.id} node={child} depth={depth + 1} ctx={ctx} />)}
            {/* Inline create input */}
            {ctx.creatingIn && ctx.creatingIn.parentId === node.id && (
              <div className="flex items-center gap-1 px-2 py-[3px]" style={{ paddingLeft: 8 + (depth + 1) * 12 }}>
                {ctx.creatingIn.type === "folder"
                  ? <Folder className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                  : <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                }
                <input
                  ref={ctx.createRef}
                  value={ctx.createValue}
                  onChange={(e) => ctx.setCreateValue(e.target.value)}
                  onBlur={ctx.commitCreate}
                  onKeyDown={(e) => { if (e.key === "Enter") ctx.commitCreate(); if (e.key === "Escape") ctx.setCreatingIn(null) }}
                  placeholder={ctx.creatingIn.type === "folder" ? "Folder name" : "Workflow name"}
                  className="flex-1 text-xs bg-card border border-primary/60 rounded px-1 py-0 outline-none min-w-0"
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Workflow node — draggable only, not a drop target.
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `workflow:${node.id}`,
    data: { kind: "workflow", id: node.id },
    disabled: isRenaming,
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group flex items-center gap-1 px-2 py-[3px] rounded cursor-pointer select-none ${
        isActive ? "bg-accent text-primary" : "hover:bg-accent text-muted-foreground"
      }`}
      style={{ paddingLeft: 8 + indent + (depth === 0 ? 0 : 4), opacity: isDragging ? 0.4 : 1, transform: CSS.Translate.toString(transform) }}
      onClick={() => ctx.onSelectWorkflow(node.id)}
      onContextMenu={(e) => ctx.openContextMenu(e, { type: "workflow", id: node.id })}
    >
      <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />

      {isRenaming ? (
        <input
          ref={ctx.renameRef}
          value={ctx.renameValue}
          onChange={(e) => ctx.setRenameValue(e.target.value)}
          onBlur={ctx.commitRename}
          onKeyDown={(e) => { if (e.key === "Enter") ctx.commitRename(); if (e.key === "Escape") ctx.setRenamingId(null) }}
          className="flex-1 text-xs bg-card border border-primary/60 rounded px-1 py-0 outline-none min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 min-w-0 text-xs truncate">{node.name}</span>
      )}

      <span className={`text-[10px] flex-shrink-0 mr-1 ${isActive ? "text-primary/70" : "text-muted-foreground/70"}`}>
        {node.workflow?.items.length ?? 0}
      </span>

      <button
        className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-accent flex-shrink-0"
        onClick={(e) => ctx.openContextMenu(e, { type: "workflow", id: node.id })}
      >
        <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  )
}

export function WorkflowTree({
  workflows, folders, currentWorkflowId,
  onSelectWorkflow, onCreateWorkflow, onCreateFolder,
  onRenameWorkflow, onRenameFolder,
  onDeleteWorkflow, onDeleteFolder,
  onMoveWorkflow, onMoveFolder,
}: WorkflowTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renamingType, setRenamingType] = useState<"workflow" | "folder" | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [contextMenu, setContextMenu] = useState<{ target: ContextMenuTarget; x: number; y: number } | null>(null)
  const [creatingIn, setCreatingIn] = useState<{ parentId?: string; type: "workflow" | "folder" } | null>(null)
  const [createValue, setCreateValue] = useState("")
  // Controlled (not AlertDialogTrigger-based) so the confirmation isn't torn down by the
  // context menu's own "close on any outside mousedown" listener before it can open.
  const [confirmDelete, setConfirmDelete] = useState<{ type: "workflow" | "folder"; id: string; name: string } | null>(null)
  const renameRef = useRef<HTMLInputElement>(null)
  const createRef = useRef<HTMLInputElement>(null)

  // Auto-expand folders that contain the active workflow
  useEffect(() => {
    const activeWorkflow = workflows.find((w) => w.id === currentWorkflowId)
    if (!activeWorkflow?.folderId) return
    const toExpand = new Set<string>()
    let folderId: string | undefined = activeWorkflow.folderId
    while (folderId) {
      toExpand.add(folderId)
      folderId = folders.find((f) => f.id === folderId)?.parentId
    }
    setExpanded((prev) => new Set([...prev, ...toExpand]))
  }, [currentWorkflowId])

  useEffect(() => {
    if (renamingId) setTimeout(() => renameRef.current?.focus(), 10)
  }, [renamingId])

  useEffect(() => {
    if (creatingIn) setTimeout(() => createRef.current?.focus(), 10)
  }, [creatingIn])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [contextMenu])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const startRename = (id: string, type: "workflow" | "folder", currentName: string) => {
    setRenamingId(id); setRenamingType(type); setRenameValue(currentName); setContextMenu(null)
  }

  const commitRename = () => {
    if (renameValue.trim() && renamingId) {
      if (renamingType === "workflow") onRenameWorkflow(renamingId, renameValue.trim())
      else if (renamingType === "folder") onRenameFolder(renamingId, renameValue.trim())
    }
    setRenamingId(null); setRenamingType(null)
  }

  const startCreate = (type: "workflow" | "folder", parentId?: string) => {
    if (parentId) setExpanded((prev) => new Set([...prev, parentId]))
    setCreatingIn({ type, parentId }); setCreateValue(""); setContextMenu(null)
  }

  const commitCreate = () => {
    if (createValue.trim() && creatingIn) {
      if (creatingIn.type === "workflow") onCreateWorkflow(createValue.trim(), creatingIn.parentId)
      else onCreateFolder(createValue.trim(), creatingIn.parentId)
    }
    setCreatingIn(null)
  }

  const openContextMenu = (e: React.MouseEvent, target: ContextMenuTarget) => {
    e.preventDefault(); e.stopPropagation()
    setContextMenu({ target, x: e.clientX, y: e.clientY })
  }

  // Drag-and-drop: alternative to the "Move to" context-menu submenu, not a replacement —
  // both call the exact same onMoveWorkflow/onMoveFolder props, no separate mutation path.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const activeData = active.data.current as { kind: "workflow" | "folder"; id: string } | undefined
    const overData = over.data.current as { kind: "folder" | "root"; id?: string } | undefined
    if (!activeData || !overData) return
    if (activeData.kind === "workflow") {
      if (overData.kind === "root") onMoveWorkflow(activeData.id, undefined)
      else if (overData.kind === "folder" && overData.id) onMoveWorkflow(activeData.id, overData.id)
    } else if (activeData.kind === "folder") {
      if (overData.kind === "root") {
        onMoveFolder(activeData.id, undefined)
      } else if (overData.kind === "folder" && overData.id && overData.id !== activeData.id) {
        // Guard against creating a cycle — same check already used by the context-menu submenu.
        if (!isDescendant(overData.id, activeData.id, folders)) onMoveFolder(activeData.id, overData.id)
      }
    }
  }

  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({
    id: "root-drop",
    data: { kind: "root" },
  })

  const tree = buildTree(workflows, folders, undefined)

  const ctx: TreeCtx = {
    currentWorkflowId, expanded, renamingId, renameValue, renameRef,
    setRenameValue, commitRename, setRenamingId, toggleExpand, openContextMenu,
    creatingIn, createRef, createValue, setCreateValue, commitCreate, setCreatingIn,
    onSelectWorkflow,
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <div className="flex flex-col h-full">
      {/* Tree header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-border flex-shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Workflows</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" title="New workflow" onClick={() => startCreate("workflow")}>
            <Plus className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" title="New folder" onClick={() => startCreate("folder")}>
            <FolderPlus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Root drop zone — drag a workflow/folder here to un-file it to the top level */}
      <div
        ref={setRootDropRef}
        className={`flex items-center gap-1.5 px-3 py-1 text-[10px] border-b transition-colors ${
          isRootOver ? "bg-accent border-primary/50 text-primary" : "border-border/60 text-muted-foreground/70"
        }`}
      >
        <Inbox className="w-3 h-3" /> Root — drop here to remove from folder
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1" onContextMenu={(e) => { if (e.target === e.currentTarget) openContextMenu(e, { type: "root" }) }}>
        {tree.map((node) => <TreeNodeItem key={node.id} node={node} depth={0} ctx={ctx} />)}

        {/* Root-level inline create */}
        {creatingIn && creatingIn.parentId === undefined && (
          <div className="flex items-center gap-1 px-2 py-[3px]">
            {creatingIn.type === "folder"
              ? <Folder className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
              : <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            }
            <input
              ref={createRef}
              value={createValue}
              onChange={(e) => setCreateValue(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") setCreatingIn(null) }}
              placeholder={creatingIn.type === "folder" ? "Folder name" : "Workflow name"}
              className="flex-1 text-xs bg-card border border-primary/60 rounded px-1 py-0 outline-none"
            />
          </div>
        )}

        {tree.length === 0 && !creatingIn && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">No workflows yet</p>
            <button onClick={() => startCreate("workflow")} className="mt-2 text-xs text-primary hover:text-primary">
              + New workflow
            </button>
          </div>
        )}
      </div>

      {/* Context menu portal */}
      {contextMenu && typeof document !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 50 }}
          className="w-48 bg-card border border-border rounded-md shadow-lg py-1 text-sm"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {contextMenu.target.type === "workflow" && (() => {
            const w = workflows.find((x) => x.id === (contextMenu.target as any).id)!
            return (
              <>
                <button onClick={() => { onSelectWorkflow(w.id); setContextMenu(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground text-xs">
                  <Play className="w-3.5 h-3.5" /> Open
                </button>
                <button onClick={() => startRename(w.id, "workflow", w.name)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground text-xs">
                  <Edit className="w-3.5 h-3.5" /> Rename
                </button>
                <div className="border-t border-border/60 my-1" />
                <div className="px-3 pb-1">
                  <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide">Move to</p>
                  <button onClick={() => { onMoveWorkflow(w.id, undefined); setContextMenu(null) }} className={`w-full text-left text-xs py-1 hover:text-primary ${!w.folderId ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    Root
                  </button>
                  {folders.map((f, fi) => (
                    <button key={f.id} onClick={() => { onMoveWorkflow(w.id, f.id); setContextMenu(null) }} className={`w-full text-left text-xs py-1 hover:text-primary flex items-center gap-1 ${w.folderId === f.id ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      <Folder className="w-3 h-3 text-primary/70" />
                      {getFolderPath(f.id, folders)}
                    </button>
                  ))}
                </div>
                {workflows.length > 1 && !w.protected && (
                  <>
                    <div className="border-t border-border/60 my-1" />
                    <button onClick={() => { setConfirmDelete({ type: "workflow", id: w.id, name: w.name }); setContextMenu(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-left text-red-600 text-xs">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                )}
              </>
            )
          })()}

          {contextMenu.target.type === "folder" && (() => {
            const f = folders.find((x) => x.id === (contextMenu.target as any).id)!
            return (
              <>
                <button onClick={() => startCreate("workflow", f.id)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground text-xs">
                  <Plus className="w-3.5 h-3.5" /> New workflow here
                </button>
                <button onClick={() => startCreate("folder", f.id)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground text-xs">
                  <FolderPlus className="w-3.5 h-3.5" /> New subfolder
                </button>
                <button onClick={() => startRename(f.id, "folder", f.name)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground text-xs">
                  <Edit className="w-3.5 h-3.5" /> Rename
                </button>
                <div className="border-t border-border/60 my-1" />
                <div className="px-3 pb-1">
                  <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide">Move to</p>
                  <button onClick={() => { onMoveFolder(f.id, undefined); setContextMenu(null) }} className={`w-full text-left text-xs py-1 hover:text-primary ${!f.parentId ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    Root
                  </button>
                  {folders.filter((x) => x.id !== f.id && !isDescendant(x.id, f.id, folders)).map((pf) => (
                    <button key={pf.id} onClick={() => { onMoveFolder(f.id, pf.id); setContextMenu(null) }} className={`w-full text-left text-xs py-1 hover:text-primary flex items-center gap-1 ${f.parentId === pf.id ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      <Folder className="w-3 h-3 text-primary/70" />
                      {getFolderPath(pf.id, folders)}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border/60 my-1" />
                <button onClick={() => { setConfirmDelete({ type: "folder", id: f.id, name: f.name }); setContextMenu(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-left text-red-600 text-xs">
                  <Trash2 className="w-3.5 h-3.5" /> Delete folder
                </button>
              </>
            )
          })()}

          {contextMenu.target.type === "root" && (
            <>
              <button onClick={() => startCreate("workflow")} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground text-xs">
                <Plus className="w-3.5 h-3.5" /> New workflow
              </button>
              <button onClick={() => startCreate("folder")} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground text-xs">
                <FolderPlus className="w-3.5 h-3.5" /> New folder
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {confirmDelete?.type === "folder" ? "folder" : "workflow"} "{confirmDelete?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.type === "folder"
                ? "This will permanently delete the folder. Workflows inside it are not deleted, but will move to the root."
                : "This will permanently delete the workflow and all of its steps. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete?.type === "folder") onDeleteFolder(confirmDelete.id)
                else if (confirmDelete) onDeleteWorkflow(confirmDelete.id)
                setConfirmDelete(null)
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </DndContext>
  )
}

// Get full path like "Parent / Child"
function getFolderPath(folderId: string, folders: WorkflowFolder[]): string {
  const parts: string[] = []
  let current = folders.find((f) => f.id === folderId)
  while (current) {
    parts.unshift(current.name)
    current = current.parentId ? folders.find((f) => f.id === current!.parentId) : undefined
  }
  return parts.join(" / ")
}

// Check if targetId is a descendant of ancestorId (to prevent circular moves)
function isDescendant(targetId: string, ancestorId: string, folders: WorkflowFolder[]): boolean {
  let current = folders.find((f) => f.id === targetId)
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true
    current = folders.find((f) => f.id === current!.parentId)
  }
  return false
}
