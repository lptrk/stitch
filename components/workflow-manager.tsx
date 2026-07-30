"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { WorkflowTagsEditor } from "@/components/workflow-tags-editor"
import type { Workflow, WorkflowFolder, WorkflowTag } from "@/types/workflow"
import { Plus, ChevronDown, Edit, Trash2, Folder, FolderOpen, FolderPlus, Inbox } from "lucide-react"
import { createPortal } from "react-dom"
import { DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

interface WorkflowManagerProps {
  workflows: Workflow[]
  folders: WorkflowFolder[]
  currentWorkflowId: string
  onCreateWorkflow: (name: string, description?: string, folderId?: string) => void
  onSelectWorkflow: (id: string) => void
  onDeleteWorkflow: (id: string) => void
  onRenameWorkflow: (id: string, name: string, description?: string) => void
  onMoveWorkflow: (workflowId: string, folderId: string | undefined) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onTagsChange?: (id: string, tags: WorkflowTag[]) => void
}

// Folder colors — every class name a complete literal (never assembled via string
// interpolation) so Tailwind's JIT scanner, which matches whole tokens in the source text, can
// actually find and generate them. `borderActive`/`bgActive`/`borderDim` are reused on workflow
// tabs inside the folder so grouped workflows visually read as belonging to it, not just the
// folder pill itself.
const FOLDER_COLORS = [
  { text: "text-blue-500", borderActive: "border-blue-500", bgActive: "bg-blue-500/10", borderDim: "border-blue-500/40" },
  { text: "text-violet-500", borderActive: "border-violet-500", bgActive: "bg-violet-500/10", borderDim: "border-violet-500/40" },
  { text: "text-green-500", borderActive: "border-green-500", bgActive: "bg-green-500/10", borderDim: "border-green-500/40" },
  { text: "text-orange-500", borderActive: "border-orange-500", bgActive: "bg-orange-500/10", borderDim: "border-orange-500/40" },
  { text: "text-pink-500", borderActive: "border-pink-500", bgActive: "bg-pink-500/10", borderDim: "border-pink-500/40" },
  { text: "text-teal-500", borderActive: "border-teal-500", bgActive: "bg-teal-500/10", borderDim: "border-teal-500/40" },
]

// Module scope (not defined inside WorkflowManager's body) so useDraggable's internal
// transform/dragging state survives parent re-renders — a component redefined fresh on every
// render of its parent gets a new type identity, forcing React to unmount/remount every tab
// instance (and reset its drag state) on any unrelated WorkflowManager re-render.
function WorkflowTab({
  w, isCurrent, onSelect, onContextMenu, onMenuClick, folderColor,
}: {
  w: Workflow
  isCurrent: boolean
  onSelect: (id: string) => void
  onContextMenu: (e: React.MouseEvent, w: Workflow) => void
  onMenuClick: (e: React.MouseEvent, w: Workflow) => void
  folderColor?: { borderActive: string; bgActive: string; borderDim: string }
}) {
  const liveStatus = (w as { liveStatus?: "building" | "running" | "idle" }).liveStatus
  const isLive = liveStatus === "building" || liveStatus === "running"
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `workflow:${w.id}`,
    data: { kind: "workflow", id: w.id },
  })
  // Workflows inside a folder pick up that folder's color (dimmed when not the active tab) so
  // they read as belonging to it, matching the folder pill's own icon color.
  const colorClasses = folderColor
    ? isCurrent
      ? `text-foreground font-medium ${folderColor.borderActive} ${folderColor.bgActive}`
      : `text-muted-foreground ${folderColor.borderDim} hover:text-foreground hover:bg-accent/60`
    : isCurrent
      ? "text-foreground font-medium border-primary bg-muted"
      : "text-muted-foreground border-transparent hover:text-foreground hover:border-ring/50 hover:bg-accent/60"
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(w.id)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, w) }}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className={`group relative flex items-center gap-1.5 px-3 text-xs whitespace-nowrap transition-all border-b-2 ${colorClasses}`}
    >
      {isLive && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" title="An agent is building/running this live" />
      )}
      {w.name}
      <span className={`text-[10px] px-1 rounded font-mono tabular-nums ${
        isCurrent ? "text-muted-foreground" : "text-muted-foreground/70"
      }`}>
        {w.items.length}
      </span>
      {/* Inline ··· on hover */}
      <span
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-muted-foreground/70 hover:text-foreground"
        onClick={(e) => onMenuClick(e, w)}
      >
        ···
      </span>
    </button>
  )
}

// Folder pill is a drop target for workflows being dragged in — module scope for the same
// reason as WorkflowTab above (useDroppable also holds per-instance state).
function FolderDropZone({ folderId, children }: { folderId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-drop:${folderId}`,
    data: { kind: "folder", id: folderId },
  })
  return (
    <div ref={setNodeRef} className={`flex items-stretch rounded-sm transition-colors ${isOver ? "bg-accent ring-1 ring-primary/50" : ""}`}>
      {children}
    </div>
  )
}

export function WorkflowManager({
  workflows, folders, currentWorkflowId,
  onCreateWorkflow, onSelectWorkflow, onDeleteWorkflow, onRenameWorkflow,
  onMoveWorkflow, onCreateFolder, onRenameFolder, onDeleteFolder, onTagsChange,
}: WorkflowManagerProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [editingFolder, setEditingFolder] = useState<WorkflowFolder | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [createInFolder, setCreateInFolder] = useState<string | undefined>()
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ type: "workflow" | "folder"; id: string; name: string } | null>(null)

  // Workflow action menu (portal-based like test-block)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [menuWorkflow, setMenuWorkflow] = useState<Workflow | null>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => { if (!menuTriggerRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    const closeKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false) }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", closeKey)
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", closeKey) }
  }, [menuOpen])

  const openMenu = (e: React.MouseEvent, w: Workflow) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left - 80 })
    setMenuWorkflow(w)
    setMenuOpen(true)
  }

  const current = workflows.find((w) => w.id === currentWorkflowId)
  const ungrouped = workflows.filter((w) => !w.folderId)
  const toggleFolder = (id: string) => setCollapsedFolders((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const openCreate = (folderId?: string) => {
    setName(""); setDescription(""); setCreateInFolder(folderId); setCreateDialogOpen(true)
  }
  const openEdit = (w: Workflow) => {
    setEditingWorkflow(w); setEditingFolder(null)
    setName(w.name); setDescription(w.description || "")
    setEditDialogOpen(true); setMenuOpen(false)
  }
  const openEditFolder = (f: WorkflowFolder) => {
    setEditingFolder(f); setEditingWorkflow(null)
    setName(f.name); setDescription("")
    setEditDialogOpen(true)
  }

  const handleCreate = () => {
    if (!name.trim()) return
    onCreateWorkflow(name.trim(), description.trim() || undefined, createInFolder)
    setCreateDialogOpen(false)
  }
  const handleEdit = () => {
    if (!name.trim()) return
    if (editingWorkflow) onRenameWorkflow(editingWorkflow.id, name.trim(), description.trim() || undefined)
    else if (editingFolder) onRenameFolder(editingFolder.id, name.trim())
    setEditDialogOpen(false)
  }
  const handleCreateFolder = () => {
    if (!name.trim()) return
    onCreateFolder(name.trim())
    setFolderDialogOpen(false)
    setName("")
  }

  // Drag-and-drop: alternative to the "Move to folder" menu item, not a replacement — both
  // call the exact same onMoveWorkflow prop, no separate mutation path.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const activeData = active.data.current as { kind: "workflow"; id: string } | undefined
    const overData = over.data.current as { kind: "folder" | "root"; id?: string } | undefined
    if (!activeData || !overData) return
    if (overData.kind === "root") onMoveWorkflow(activeData.id, undefined)
    else if (overData.kind === "folder" && overData.id) onMoveWorkflow(activeData.id, overData.id)
  }

  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({
    id: "root-drop",
    data: { kind: "root" },
  })

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <>
      <div className="flex items-stretch h-full overflow-x-auto gap-0">

        {/* Root drop zone — drag a workflow here to remove it from its folder. Its own
            dedicated element (not the whole bar) so it never spatially overlaps a folder
            droppable and collision detection never has to choose between the two. */}
        <div
          ref={setRootDropRef}
          title="Drop a workflow here to remove it from its folder"
          className={`flex items-center px-2 flex-shrink-0 border-b-2 transition-colors ${
            isRootOver ? "bg-accent border-primary/50 text-primary" : "border-transparent text-muted-foreground/40"
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
        </div>

        {/* Ungrouped workflows */}
        {ungrouped.map((w) => (
          <WorkflowTab key={w.id} w={w} isCurrent={w.id === currentWorkflowId} onSelect={onSelectWorkflow} onContextMenu={openMenu} onMenuClick={openMenu} />
        ))}

        {/* Folders */}
        {folders.map((folder, fi) => {
          const folderWorkflows = workflows.filter((w) => w.folderId === folder.id)
          const isCollapsed = collapsedFolders.has(folder.id)
          const colorClass = FOLDER_COLORS[fi % FOLDER_COLORS.length]
          const hasActive = folderWorkflows.some((w) => w.id === currentWorkflowId)

          return (
            <div key={folder.id} className="flex items-stretch">
              {/* Folder separator */}
              <div className="w-px bg-muted mx-1 self-center h-4" />

              {/* Folder pill / toggle — a drop target for workflows dragged in */}
              <FolderDropZone folderId={folder.id}>
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className={`flex items-center gap-1.5 px-2.5 text-xs whitespace-nowrap transition-all border-b-2 ${
                    hasActive && isCollapsed
                      ? "text-foreground font-medium border-primary bg-muted"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/60"
                  }`}
                >
                  {isCollapsed
                    ? <Folder className={`w-3 h-3 ${colorClass.text}`} />
                    : <FolderOpen className={`w-3 h-3 ${colorClass.text}`} />
                  }
                  <span className="font-medium">{folder.name}</span>
                  <span className="text-[10px] text-muted-foreground/70 font-mono">{folderWorkflows.length}</span>
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform text-muted-foreground/70 ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>

                {/* Folder action: rename / delete / add workflow */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-full px-1.5 rounded-none text-muted-foreground/70 hover:text-foreground hover:bg-accent border-b-2 border-transparent">
                      <ChevronDown className="w-2.5 h-2.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem onClick={() => openCreate(folder.id)}>
                      <Plus className="w-3.5 h-3.5 mr-2" /> Add workflow
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditFolder(folder)}>
                      <Edit className="w-3.5 h-3.5 mr-2" /> Rename folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setConfirmDelete({ type: "folder", id: folder.id, name: folder.name })} className="text-red-600">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Expanded: show workflows inline, colored to match this folder */}
                {!isCollapsed && folderWorkflows.map((w) => (
                  <WorkflowTab key={w.id} w={w} isCurrent={w.id === currentWorkflowId} onSelect={onSelectWorkflow} onContextMenu={openMenu} onMenuClick={openMenu} folderColor={colorClass} />
                ))}
              </FolderDropZone>
            </div>
          )
        })}

        {/* Divider */}
        <div className="w-px bg-muted mx-1 self-center h-4" />

        {/* New workflow */}
        <Button
          variant="ghost" size="sm"
          onClick={() => openCreate()}
          className="h-full px-2.5 rounded-none text-xs text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0 border-b-2 border-transparent gap-1"
        >
          <Plus className="w-3 h-3" /> New
        </Button>

        {/* New folder */}
        <Button
          variant="ghost" size="sm"
          onClick={() => { setName(""); setFolderDialogOpen(true) }}
          className="h-full px-2 rounded-none text-muted-foreground/70 hover:text-foreground hover:bg-accent flex-shrink-0 border-b-2 border-transparent"
          title="New folder"
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Workflow action menu (portal) */}
      {menuOpen && menuWorkflow && typeof document !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 50 }}
          className="w-52 bg-card border border-border rounded-md shadow-lg py-1 text-sm"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button onClick={() => { openEdit(menuWorkflow) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground">
            <Edit className="w-3.5 h-3.5" /> Rename
          </button>

          {/* Move to folder */}
          {folders.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Move to folder</p>
              </div>
              {menuWorkflow.folderId && (
                <button onClick={() => { onMoveWorkflow(menuWorkflow.id, undefined); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-muted-foreground text-xs">
                  — No folder
                </button>
              )}
              {folders.filter(f => f.id !== menuWorkflow.folderId).map((f) => (
                <button key={f.id} onClick={() => { onMoveWorkflow(menuWorkflow.id, f.id); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left text-foreground text-xs">
                  <Folder className={`w-3 h-3 ${FOLDER_COLORS[folders.indexOf(f) % FOLDER_COLORS.length].text}`} />
                  {f.name}
                </button>
              ))}
            </>
          )}

          {onTagsChange && (
            <div className="px-3 py-1.5 border-t border-border/60 mt-1">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Tags</p>
              <WorkflowTagsEditor tags={menuWorkflow.tags || []} onChange={(tags) => { onTagsChange(menuWorkflow.id, tags) }} />
            </div>
          )}

          {workflows.length > 1 && !menuWorkflow.protected && (
            <>
              <div className="border-t border-border/60 mt-1" />
              <button onClick={() => { setConfirmDelete({ type: "workflow", id: menuWorkflow.id, name: menuWorkflow.name }); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-left text-red-600">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Create workflow dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {createInFolder ? `New workflow in "${folders.find(f => f.id === createInFolder)?.name}"` : "New workflow"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-name" className="text-xs">Name</Label>
              <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Login flow" className="mt-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            </div>
            <div>
              <Label htmlFor="new-desc" className="text-xs">Description (optional)</Label>
              <Textarea id="new-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this workflow test?" className="mt-1" rows={2} />
            </div>
            {!createInFolder && folders.length > 0 && (
              <div>
                <Label className="text-xs">Folder (optional)</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {folders.map((f, fi) => (
                    <button
                      key={f.id}
                      onClick={() => setCreateInFolder(createInFolder === f.id ? undefined : f.id)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs transition-colors ${
                        createInFolder === f.id ? "border-primary/60 bg-accent text-primary" : "border-border text-muted-foreground hover:border-ring/50"
                      }`}
                    >
                      <Folder className={`w-3 h-3 ${FOLDER_COLORS[fi % FOLDER_COLORS.length].text}`} />
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={!name.trim()}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename dialog (workflow or folder) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingFolder ? "Rename folder" : "Rename workflow"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-name" className="text-xs">Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleEdit()} />
            </div>
            {editingWorkflow && (
              <div>
                <Label htmlFor="edit-desc" className="text-xs">Description (optional)</Label>
                <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleEdit} disabled={!name.trim()}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New folder dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">New folder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="folder-name" className="text-xs">Name</Label>
              <Input id="folder-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Smoke Tests" className="mt-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateFolder} disabled={!name.trim()}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
    </DndContext>
  )
}
