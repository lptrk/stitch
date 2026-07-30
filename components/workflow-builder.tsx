"use client"

import { useDroppable } from "@dnd-kit/core"
import type { WorkflowItem, Workflow, TestBlockDefinition } from "@/types/workflow"
import { WorkflowItemComponent } from "./workflow-item"
import { BlockDebugDialog } from "./block-debug-dialog"
import { FileText, Plus, Lock, Search, ClipboardList, Bot, Blocks, Code2 } from "lucide-react"
import { WorkflowStatusSummary } from "./workflow-status-summary"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import type { EnvVar } from "@/hooks/use-env-vars"
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group"
import type { WorkflowCodeEditorError } from "./workflow-code-editor"
import { workflowItemsToEditableCode } from "@/lib/code-generators"
import type { CodeBlockParseResult } from "@/lib/spec-import/parse-code-block"
import { useToast } from "@/hooks/use-toast"

// CodeMirror is sizeable (~1MB+) and most sessions never open Code mode — load it on demand
// instead of bundling it into the main page chunk.
const WorkflowCodeEditor = dynamic(
  () => import("./workflow-code-editor").then((m) => m.WorkflowCodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading editor…</div>
    ),
  },
)

interface WorkflowBuilderProps {
  items: WorkflowItem[]
  workflows?: Workflow[]
  currentWorkflowId?: string
  /** Every known block (built-in + custom) — needed to resolve blockIds parsed back out of Code mode. */
  allBlocks?: TestBlockDefinition[]
  envVars?: EnvVar[]
  baseUrl?: string
  selectedItemId?: string | null
  onSelectItem?: (id: string | null) => void
  onRemoveItem: (id: string) => void
  onParameterChange: (itemId: string, parameterId: string, value: string) => void
  onOutputVariableChange?: (itemId: string, variable: string) => void
  onCommentChange?: (itemId: string, comment: string) => void
  onQuickStart?: (template: string) => void
  /** Replaces the whole step list at once — used when applying Code mode edits back as blocks. */
  onReplaceItems?: (items: WorkflowItem[]) => void
  /** A Live Agent Session actively building/running — canvas is watch-only until it ends. */
  readOnly?: boolean
}

export function WorkflowBuilder({
  items,
  workflows = [],
  currentWorkflowId,
  allBlocks = [],
  envVars = [],
  baseUrl = "http://localhost:3000",
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  onParameterChange,
  onOutputVariableChange,
  onCommentChange,
  onQuickStart,
  onReplaceItems,
  readOnly = false,
}: WorkflowBuilderProps) {
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugItem, setDebugItem] = useState<WorkflowItem | null>(null)
  const { toast } = useToast()

  const [mode, setMode] = useState<"blocks" | "code">("blocks")
  const [codeDraft, setCodeDraft] = useState("")
  const [codeErrors, setCodeErrors] = useState<WorkflowCodeEditorError[]>([])
  const [isApplying, setIsApplying] = useState(false)

  // A live session can start while the user is mid-edit in Code mode — bail back to the
  // (watch-only) block view rather than leaving an uncommitted code draft stranded.
  useEffect(() => {
    if (readOnly && mode === "code") setMode("blocks")
  }, [readOnly, mode])

  const handleModeChange = async (next: string) => {
    if (!next || next === mode || isApplying) return
    if (next === "code") {
      setCodeDraft(workflowItemsToEditableCode(items, baseUrl, workflows))
      setCodeErrors([])
      setMode("code")
      return
    }
    // Switching back to Block mode: strict parse (server-side — the parser depends on the
    // `typescript` package, which should never end up in the client bundle) — any unmatched
    // statement blocks the switch.
    setIsApplying(true)
    let result: CodeBlockParseResult
    try {
      const response = await fetch("/api/parse-code-block", {
        method: "POST",
        headers: { "Content-Type": "text/plain", "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "" },
        body: codeDraft,
      })
      const body = await response.json()
      if (!response.ok) {
        setIsApplying(false)
        toast({ title: "Couldn't parse the code", description: body?.error || `HTTP ${response.status}`, variant: "destructive" })
        return
      }
      result = body as CodeBlockParseResult
    } catch {
      setIsApplying(false)
      toast({ title: "Couldn't reach the parser", description: "Check your connection and try again.", variant: "destructive" })
      return
    }
    setIsApplying(false)
    if (result.errors.length > 0) {
      setCodeErrors(result.errors)
      toast({
        title: "Can't switch to Block mode yet",
        description: `${result.errors.length} line${result.errors.length === 1 ? "" : "s"} couldn't be matched to a known block. Fix or remove them first.`,
        variant: "destructive",
      })
      return
    }
    const now = Date.now()
    const rebuilt: WorkflowItem[] = []
    const unknown = new Set<string>()
    const badWorkflowRefs = new Set<string>()
    result.items.forEach((parsed, i) => {
      // callWorkflow round-trips through Code mode by workflow *name* (its id is an opaque,
      // unstable string a human editing code shouldn't have to type) — resolve it back here,
      // client-side, since the server-side parser has no access to the workflow list.
      if (parsed.blockId === "callWorkflow") {
        const name = parsed.parameters.workflowName
        const target = workflows.find((w) => w.name === name)
        if (!target || target.id === currentWorkflowId) {
          badWorkflowRefs.add(name ?? "(unnamed)")
          return
        }
        const block = allBlocks.find((b) => b.id === "callWorkflow")
        if (!block) {
          unknown.add("callWorkflow")
          return
        }
        rebuilt.push({
          id: `callWorkflow-${now}-${i}`,
          blockId: "callWorkflow",
          block,
          parameters: { workflowId: target.id },
        })
        return
      }
      const block = allBlocks.find((b) => b.id === parsed.blockId)
      if (!block) {
        unknown.add(parsed.blockId)
        return
      }
      rebuilt.push({
        id: `${parsed.blockId}-${now}-${i}`,
        blockId: parsed.blockId,
        block,
        parameters: parsed.parameters,
      })
    })
    if (badWorkflowRefs.size > 0) {
      toast({
        title: "Can't switch to Block mode yet",
        description: `callWorkflow references a workflow that doesn't exist (or itself): ${[...badWorkflowRefs].join(", ")}.`,
        variant: "destructive",
      })
      return
    }
    if (unknown.size > 0) {
      toast({
        title: "Can't switch to Block mode yet",
        description: `Unknown block id${unknown.size === 1 ? "" : "s"}: ${[...unknown].join(", ")}.`,
        variant: "destructive",
      })
      return
    }
    onReplaceItems?.(rebuilt)
    setCodeErrors([])
    setMode("blocks")
  }

  const { setNodeRef: setMainNodeRef, isOver: isMainOver } = useDroppable({
    id: "workflow-area",
  })

  const { setNodeRef: setDropZoneRef, isOver: isDropZoneOver } = useDroppable({
    id: "workflow-drop-zone",
  })

  const handleDebugItem = (item: WorkflowItem) => {

    setDebugItem(item)
    setDebugOpen(true)
  }

  const handleTestBlock = async (
    block: any,
    parameters: Record<string, string>,
    onEvent?: (event: { type: string; data: any }) => void
  ) => {
    const testConfig = {
      baseUrl,
      workflows: {
        test: {
          name: `Debug: ${block.name}`,
          workflow: [{ block: block.id, parameters }],
        },
      },
      mainWorkflow: "test",
      customBlocks: block.isCustom
        ? { [block.id]: { id: block.id, name: block.name, code: block.customCode || "", parameters: block.parameters || [] } }
        : {},
    }

    const response = await fetch("/api/run-workflow-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "" },
      body: JSON.stringify(testConfig),
    })

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let failed = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""
      let eventType = ""
      for (const line of lines) {
        if (line.startsWith("event: ")) { eventType = line.slice(7); continue }
        if (line.startsWith("data: ") && eventType) {
          try {
            const data = JSON.parse(line.slice(6))
            onEvent?.({ type: eventType, data })
            if (eventType === "error") { failed = true; throw new Error(data.message) }
            if (eventType === "complete" && !data.success) { failed = true; throw new Error(data.error || "Step failed") }
          } catch (e) { if (failed) throw e }
          eventType = ""
        }
      }
    }
  }

  return (
    <>
      <div
        ref={setMainNodeRef}
        className={`min-h-full transition-colors ${
          isMainOver ? "bg-accent/50" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Steps
            {items.length > 0 && <span className="ml-1.5 text-muted-foreground/70 font-normal normal-case tracking-normal">{items.length}</span>}
          </h3>
          {!readOnly && (
            <ToggleGroup type="single" value={mode} onValueChange={handleModeChange} disabled={isApplying} size="sm">
              <ToggleGroupItem value="blocks" aria-label="Block mode" className="h-6 px-2 text-xs gap-1">
                <Blocks className="w-3 h-3" /> Blocks
              </ToggleGroupItem>
              <ToggleGroupItem value="code" aria-label="Code mode" className="h-6 px-2 text-xs gap-1">
                <Code2 className="w-3 h-3" /> {isApplying ? "Applying…" : "Code"}
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>

        {/* Live Agent Session lock */}
        {readOnly && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md border border-primary/30 bg-accent text-xs text-accent-foreground">
            <Bot className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-primary" />
            An agent is building/running this workflow live — read-only until it finishes.
          </div>
        )}

        {mode === "code" ? (
          <div className="h-[60vh] min-h-[400px]">
            <WorkflowCodeEditor code={codeDraft} onChange={setCodeDraft} errors={codeErrors} className="h-full" />
          </div>
        ) : (
        <>
        {/* Status summary */}
        {items.length > 0 && (
          <div className="mb-3">
            <WorkflowStatusSummary items={items} />
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-20 space-y-5">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium text-muted-foreground">No steps yet</h3>
              <p className="text-xs text-muted-foreground">
                Drag a block from the sidebar, press <kbd className="bg-muted border border-border rounded px-1 font-mono text-[10px]">⌘K</kbd> to search, or start with a template:
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { id: "login", Icon: Lock, label: "Login flow" },
                { id: "navigate-and-check", Icon: Search, label: "Navigate & verify" },
                { id: "form-submit", Icon: ClipboardList, label: "Fill & submit" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => onQuickStart?.(t.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-md text-xs text-muted-foreground hover:border-primary/50 hover:text-primary hover:shadow-sm transition-all"
                >
                  <t.Icon className="w-3 h-3" /> {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item, index) => (
              <WorkflowItemComponent
                key={item.id}
                item={item}
                index={index}
                workflows={workflows}
                isSelected={selectedItemId === item.id}
                onSelect={() => onSelectItem?.(selectedItemId === item.id ? null : item.id)}
                onRemove={() => onRemoveItem(item.id)}
                onDebug={handleDebugItem}
                readOnly={readOnly}
              />
            ))}

            {/* Drop zone – compact strip at bottom */}
            <div
              ref={setDropZoneRef}
              className={`flex items-center justify-center h-10 border border-dashed rounded-md transition-colors ${
                isDropZoneOver ? "border-primary/60 bg-accent" : "border-border hover:border-ring/50"
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <Plus className="w-3.5 h-3.5" /> Drop block here
              </span>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Debug Dialog for Workflow Items */}
      <BlockDebugDialog
        block={debugItem?.block || null}
        workflowItem={debugItem}
        open={debugOpen}
        onClose={() => {

          setDebugOpen(false)
          setDebugItem(null)
        }}
        onTestBlock={handleTestBlock}
      />
    </>
  )
}
