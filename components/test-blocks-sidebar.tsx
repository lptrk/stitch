"use client"

import type React from "react"
import { useState, useMemo } from "react"
import type { TestBlockDefinition } from "@/types/workflow"
import { TestBlock } from "./test-block"
import { AddCustomBlockDialog } from "./add-custom-block-dialog"
import { BlockInspectorDialog } from "./block-inspector-dialog"
import { BlockDebugDialog } from "./block-debug-dialog"
import { BlockSearchCombobox } from "./block-search-combobox"
import { CollapsibleSection } from "./collapsible-section"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Blocks, Zap, Upload, Download, Code, ChevronDown, PanelLeftClose, PanelLeftOpen, AlertTriangle, GitBranch, Gitlab } from "lucide-react"
import * as LucideIcons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { WorkflowTree } from "./workflow-tree"
import { GitlabTree } from "./gitlab-tree"
import type { Workflow, WorkflowFolder } from "@/types/workflow"

const BASIC_CATEGORIES = ["Navigation", "Interactions", "Form Inputs", "Assertions", "Waiting", "Screenshots", "Data Extraction"]
const ADVANCED_CATEGORIES = ["Network & API", "Authentication", "Browser Context", "File Operations", "Workflow Control"]

interface TestBlocksSidebarProps {
  blocks: TestBlockDefinition[]
  customBlocks: TestBlockDefinition[]
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onAddCustomBlock: (blockData: any) => void
  onRemoveCustomBlock: (blockId: string) => void
  onUpdateCustomBlock?: (updatedBlock: TestBlockDefinition) => void
  onExportCustomBlocks: () => number
  onImportCustomBlocks: (data: any, iconMap: any) => number
  onClearCustomBlocks: () => void
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

export function TestBlocksSidebar({
  blocks, customBlocks, collapsed, onCollapsedChange,
  onAddCustomBlock, onRemoveCustomBlock, onUpdateCustomBlock,
  onExportCustomBlocks, onImportCustomBlocks, onClearCustomBlocks,
  workflows, folders, currentWorkflowId,
  onSelectWorkflow, onCreateWorkflow, onCreateFolder,
  onRenameWorkflow, onRenameFolder,
  onDeleteWorkflow, onDeleteFolder,
  onMoveWorkflow, onMoveFolder,
}: TestBlocksSidebarProps) {
  const [activeTab, setActiveTab] = useState<"blocks" | "workflows" | "repository">("blocks")
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<TestBlockDefinition | null>(null)
  const [filteredBuiltInBlocks, setFilteredBuiltInBlocks] = useState<TestBlockDefinition[]>(blocks)
  const [filteredCustomBlocks, setFilteredCustomBlocks] = useState<TestBlockDefinition[]>(customBlocks)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const { toast } = useToast()

  const allBlocks = useMemo(() => [...blocks, ...customBlocks], [blocks, customBlocks])

  useMemo(() => {
    setFilteredBuiltInBlocks(blocks)
    setFilteredCustomBlocks(customBlocks)
  }, [blocks, customBlocks])

  const handleFilterChange = (filtered: TestBlockDefinition[]) => {
    setFilteredBuiltInBlocks(filtered.filter((b) => !b.isCustom))
    setFilteredCustomBlocks(filtered.filter((b) => b.isCustom))
  }

  const createIconMap = (): Record<string, LucideIcon> => {
    const map: Record<string, LucideIcon> = {}
    Object.entries(LucideIcons).forEach(([name, icon]) => {
      if (typeof icon === "function" && name !== "createLucideIcon") map[name] = icon as LucideIcon
    })
    return map
  }

  const handleExport = () => {
    try {
      const count = onExportCustomBlocks()
      toast({ title: "Blocks exported", description: `Exported ${count} custom blocks` })
    } catch {
      toast({ title: "Export failed", variant: "destructive" })
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const count = onImportCustomBlocks(data, createIconMap())
        setImportDialogOpen(false)
        toast({ title: "Blocks imported", description: `Imported ${count} custom blocks` })
      } catch {
        toast({ title: "Import failed", variant: "destructive" })
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleSaveBlock = (updatedBlock: TestBlockDefinition) => {
    if (onUpdateCustomBlock) {
      onUpdateCustomBlock(updatedBlock)
      toast({ title: "Block updated", description: `Updated "${updatedBlock.name}"` })
    }
  }

  const handleDeleteBlock = (blockId: string) => {
    const block = customBlocks.find((b) => b.id === blockId)
    if (block) {
      onRemoveCustomBlock(blockId)
      setInspectorOpen(false)
      setDebugOpen(false)
      setSelectedBlock(null)
      toast({ title: "Block deleted", description: `Deleted "${block.name}"` })
    }
  }

  const handleDuplicateBlock = (block: TestBlockDefinition) => {
    onAddCustomBlock({
      name: `${block.name} (Copy)`,
      description: block.description,
      category: (block as any).category || "custom",
      icon: block.icon,
      code: block.customCode || "",
      parameters: block.parameters || [],
      tags: (block as any).tags || [],
    })
    toast({ title: "Block duplicated", description: `Created copy of "${block.name}"` })
  }

  // Note: no `onEvent` param — /api/run-workflow is a single-shot JSON endpoint (unlike
  // run-workflow-stream), so BlockDebugDialog gets no live step events for this path and falls
  // back to its own post-await status. That fallback only works if this function actually
  // rejects on failure — it used to swallow failures into its own toast and resolve normally,
  // which made the dialog always show "Passed" while this toast correctly said "failed" for the
  // same run. The dialog already renders Passed/Failed inline, so this is the single source of
  // truth now; no separate toast on top of it.
  const handleTestBlock = async (block: TestBlockDefinition, parameters: Record<string, string>) => {
    const testConfig = {
      baseUrl: "https://example.com",
      workflows: {
        test: {
          name: "Block Test",
          workflow: [{ block: "goto", parameters: { url: "/" } }, { block: block.id, parameters }],
        },
      },
      mainWorkflow: "test",
      customBlocks: block.isCustom
        ? { [block.id]: { id: block.id, name: block.name, code: block.customCode || "", parameters: block.parameters || [] } }
        : {},
    }
    const response = await fetch("/api/run-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "" },
      body: JSON.stringify(testConfig),
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.testResult?.error || result.message || "Block test failed")
    }
  }

  if (collapsed) {
    return (
      <div className="bg-card border-r border-border flex flex-col items-center w-10 flex-shrink-0 h-full">
        <div className="flex items-center justify-center w-full h-9 border-b border-border flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onCollapsedChange(false)} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" title="Expand sidebar">
            <PanelLeftOpen className="w-3.5 h-3.5" />
          </Button>
        </div>
        <span className="text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-widest rotate-90 whitespace-nowrap mt-6 select-none">Library</span>
      </div>
    )
  }

  return (
    <>
      <div className="bg-card border-r border-border flex flex-col flex-shrink-0 min-h-0 h-full w-full">

        {/* Header: tabs + collapse */}
        <div className="flex items-stretch h-9 border-b border-border flex-shrink-0 min-w-0">
          <button
            onClick={() => setActiveTab("blocks")}
            title="Blocks"
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 text-xs border-b-2 transition-colors ${
              activeTab === "blocks" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Blocks className="w-3 h-3 flex-shrink-0" /> <span className="truncate">Blocks</span>
          </button>
          <button
            onClick={() => setActiveTab("workflows")}
            title="Workflows"
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 text-xs border-b-2 transition-colors ${
              activeTab === "workflows" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitBranch className="w-3 h-3 flex-shrink-0" /> <span className="truncate">Workflows</span>
          </button>
          <button
            onClick={() => setActiveTab("repository")}
            title="Repository"
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 text-xs border-b-2 transition-colors ${
              activeTab === "repository" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Gitlab className="w-3 h-3 flex-shrink-0" /> <span className="truncate">Repository</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => onCollapsedChange(true)} className="h-full w-8 p-0 flex-shrink-0 text-muted-foreground hover:text-foreground rounded-none" title="Collapse">
            <PanelLeftClose className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Blocks tab */}
        {activeTab === "blocks" && (
          <>
            <div className="p-3 border-b border-border">
              <BlockSearchCombobox blocks={allBlocks} onFilterChange={handleFilterChange} placeholder="Search blocks…" />
            </div>

            <ScrollArea className="flex-1 overflow-hidden">
              <div className="p-3 space-y-4 min-w-0">
                <CollapsibleSection
                  title="Library"
                  icon={<Blocks className="w-3.5 h-3.5" />}
                  badge={<Badge variant="outline" className="text-xs">{filteredBuiltInBlocks.length}</Badge>}
                  defaultExpanded={true}
                >
                  {filteredBuiltInBlocks.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">No blocks match your search</div>
                  ) : (
                    <div className="space-y-4">
                      {BASIC_CATEGORIES.map((category) => {
                        const categoryBlocks = filteredBuiltInBlocks.filter((b) => b.category === category)
                        if (categoryBlocks.length === 0) return null
                        return (
                          <CollapsibleSection key={category} title={category} defaultExpanded={true}>
                            <div className="space-y-2">
                              {categoryBlocks.map((block) => (
                                <TestBlock key={block.id} block={block} draggable onInspect={(b) => { setSelectedBlock(b); setInspectorOpen(true) }} onDebug={(b) => { setSelectedBlock(b); setDebugOpen(true) }} />
                              ))}
                            </div>
                          </CollapsibleSection>
                        )
                      })}
                      {ADVANCED_CATEGORIES.some((cat) => filteredBuiltInBlocks.some((b) => b.category === cat)) && (
                        <>
                          <button
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md hover:border-ring/50 transition-colors"
                          >
                            <span>Advanced blocks</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                          </button>
                          {showAdvanced && (
                            <div className="space-y-4">
                              {ADVANCED_CATEGORIES.map((category) => {
                                const categoryBlocks = filteredBuiltInBlocks.filter((b) => b.category === category)
                                if (categoryBlocks.length === 0) return null
                                return (
                                  <CollapsibleSection key={category} title={category} defaultExpanded={false}>
                                    <div className="space-y-2">
                                      {categoryBlocks.map((block) => (
                                        <TestBlock key={block.id} block={block} draggable onInspect={(b) => { setSelectedBlock(b); setInspectorOpen(true) }} onDebug={(b) => { setSelectedBlock(b); setDebugOpen(true) }} />
                                      ))}
                                    </div>
                                  </CollapsibleSection>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CollapsibleSection>

                {customBlocks.length > 0 && (
                  <>
                    <Separator />
                    <CollapsibleSection
                      title="Custom Blocks"
                      icon={<Zap className="w-3.5 h-3.5" />}
                      badge={<Badge variant="secondary" className="text-xs">{filteredCustomBlocks.length}</Badge>}
                      defaultExpanded={true}
                      action={<AddCustomBlockDialog onAddBlock={onAddCustomBlock} />}
                    >
                      {filteredCustomBlocks.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">No custom blocks match your search</div>
                      ) : (
                        <div className="space-y-3">
                          {filteredCustomBlocks.map((block) => (
                            <TestBlock
                              key={block.id} block={block} draggable
                              onInspect={(b) => { setSelectedBlock(b); setInspectorOpen(true) }}
                              onEdit={(b) => { setSelectedBlock(b); setInspectorOpen(true) }}
                              onDelete={handleDeleteBlock}
                              onDuplicate={handleDuplicateBlock}
                              onDebug={(b) => { setSelectedBlock(b); setDebugOpen(true) }}
                            />
                          ))}
                        </div>
                      )}
                    </CollapsibleSection>
                  </>
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border bg-secondary">
              <div className="flex gap-2">
                <AddCustomBlockDialog onAddBlock={onAddCustomBlock} />
                {customBlocks.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 bg-transparent text-xs h-7">
                      <Upload className="w-3 h-3 mr-1" /> Export
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent text-xs h-7" onClick={() => setImportDialogOpen(true)}>
                      <Download className="w-3 h-3 mr-1" /> Import
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Workflows tab */}
        {activeTab === "workflows" && (
          <WorkflowTree
            workflows={workflows}
            folders={folders}
            currentWorkflowId={currentWorkflowId}
            onSelectWorkflow={onSelectWorkflow}
            onCreateWorkflow={onCreateWorkflow}
            onCreateFolder={onCreateFolder}
            onRenameWorkflow={onRenameWorkflow}
            onRenameFolder={onRenameFolder}
            onDeleteWorkflow={onDeleteWorkflow}
            onDeleteFolder={onDeleteFolder}
            onMoveWorkflow={onMoveWorkflow}
            onMoveFolder={onMoveFolder}
          />
        )}

        {/* Repository tab */}
        {activeTab === "repository" && <GitlabTree />}
      </div>

      <BlockInspectorDialog
        block={selectedBlock}
        open={inspectorOpen}
        onClose={() => { setInspectorOpen(false); setSelectedBlock(null) }}
        onSave={selectedBlock?.isCustom ? handleSaveBlock : undefined}
        onDelete={selectedBlock?.isCustom ? handleDeleteBlock : undefined}
        onDuplicate={handleDuplicateBlock}
        readonly={false}
      />

      <BlockDebugDialog
        block={selectedBlock}
        open={debugOpen}
        onClose={() => { setDebugOpen(false); setSelectedBlock(null) }}
        onTestBlock={handleTestBlock}
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Code className="w-4 h-4" /> Import Custom Blocks
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Importing replaces all existing custom blocks.
            </p>
            <div>
              <Label htmlFor="import-file" className="text-xs">Select custom-blocks.json</Label>
              <Input id="import-file" type="file" accept=".json" onChange={handleImport} className="mt-1 text-xs" />
            </div>
            <p className="text-xs text-muted-foreground">Only import blocks from trusted sources – custom blocks contain executable code.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
