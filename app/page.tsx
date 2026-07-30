"use client"

import { useState, useCallback, useEffect } from "react"
import type React from "react"
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, closestCenter } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { TestBlocksSidebar } from "@/components/test-blocks-sidebar"
import { WorkflowBuilder } from "@/components/workflow-builder"
import { WorkflowControls } from "@/components/workflow-controls"
import { WorkflowManager } from "@/components/workflow-manager"
import { WorkflowExporter } from "@/components/workflow-exporter"
import { TestBlock } from "@/components/test-block"
import { TestStatus } from "@/components/test-status"
import { ValidationErrors } from "@/components/validation-errors"
import { RightPanel } from "@/components/right-panel"
import { testBlocks } from "@/lib/test-blocks"
import { validateWorkflow, type ValidationError } from "@/lib/validate-workflow"
import { useTestExecution } from "@/hooks/use-test-execution"
import { useCustomBlocks } from "@/hooks/use-custom-blocks"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useWorkflowHistory } from "@/hooks/use-workflow-history"
import { useExecutionHistory } from "@/hooks/use-execution-history"
import { useEnvVars } from "@/hooks/use-env-vars"
import { useResizable } from "@/hooks/use-resizable"
import { SettingsPanel } from "@/components/settings-panel"
import { CommandPalette } from "@/components/command-palette"
import { ShortcutCheatsheet } from "@/components/shortcut-cheatsheet"
import type { WorkflowItem, Workflow, WorkflowConfig, WorkflowFolder, TestBlockDefinition } from "@/types/workflow"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Undo2, Redo2, Settings2, Search, Code as ImportedCodeIcon, Puzzle } from "lucide-react"
import { ExtensionPickerProvider } from "@/hooks/use-extension-picker"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
// Type-only: erased at compile time, so this never pulls the `typescript` compiler
// (a dependency of lib/spec-import/*) into the client bundle.
import type { ImportedWorkflow, ImportResult } from "@/lib/spec-import/build-workflow"

// Mirrors lib/spec-import/build-workflow.ts: SETUP_WORKFLOW_PLACEHOLDER_ID.
// Duplicated as a literal (not imported) so this file never imports the spec-import
// module at runtime — that module pulls in the TypeScript compiler, which must stay
// server-only.
const SETUP_WORKFLOW_PLACEHOLDER_ID = "__stitch_import_setup__"

export default function HomePage() {
  const [workflows, setWorkflows, isHydrated] = useLocalStorage<Workflow[]>("stitch-workflows", [
    { id: "main", name: "Main Workflow", description: "Default workflow", protected: true, items: [], createdAt: new Date(), updatedAt: new Date() },
  ])
  const [currentWorkflowId, setCurrentWorkflowId] = useLocalStorage<string>("stitch-current-workflow", "main")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useLocalStorage<string>("stitch-base-url", "http://localhost:3000")
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [folders, setFolders] = useLocalStorage<WorkflowFolder[]>("stitch-folders", [])

  // ── Live Agent Sessions ──
  // Workflows an MCP-connected agent is building/running right now, pushed over SSE from
  // /api/live-sessions/stream. Deliberately NOT written to localStorage (see the approved
  // plan) — they exist only in memory here and on the server for as long as they're live.
  type LiveWorkflow = Workflow & { liveStatus: "building" | "running" | "idle" }
  const [liveSessions, setLiveSessions] = useState<Record<string, LiveWorkflow>>({})

  useEffect(() => {
    // `block.icon` is a React component — it doesn't survive JSON.stringify over SSE
    // (arrives as `{}` client-side). Re-resolve the block from the local registry by
    // `blockId` instead of trusting the wire payload, so icons render correctly. Live
    // sessions can only ever contain non-custom blocks (enforced server-side), so
    // `testBlocks` alone is a complete lookup — no need to also check `customBlocks`.
    const resolveWireItem = (item: WorkflowItem): WorkflowItem => {
      const block = testBlocks.find((b) => b.id === item.blockId)
      return block ? { ...item, block } : item
    }

    const apiKey = process.env.NEXT_PUBLIC_API_KEY || ""
    const source = new EventSource(`/api/live-sessions/stream?apiKey=${encodeURIComponent(apiKey)}`)

    source.addEventListener("session-event", (e: MessageEvent) => {
      const payload = JSON.parse(e.data)
      if (payload.type === "snapshot" || payload.type === "session-created") {
        const s = payload.type === "snapshot" ? payload.session : { id: payload.sessionId, name: payload.name, baseUrl: payload.baseUrl, items: [], status: "building" }
        setLiveSessions((prev) => ({
          ...prev,
          [s.id]: { id: s.id, name: s.name, items: (s.items || []).map(resolveWireItem), liveStatus: s.status, createdAt: new Date(), updatedAt: new Date() },
        }))
      } else if (payload.type === "step-added") {
        setLiveSessions((prev) => {
          const session = prev[payload.sessionId]
          if (!session) return prev
          return { ...prev, [payload.sessionId]: { ...session, items: [...session.items, resolveWireItem(payload.item)] } }
        })
      } else if (payload.type === "step-status") {
        setLiveSessions((prev) => {
          const session = prev[payload.sessionId]
          if (!session) return prev
          return {
            ...prev,
            [payload.sessionId]: {
              ...session,
              items: session.items.map((item) => (item.id === payload.itemId ? { ...item, ...payload.patch } : item)),
            },
          }
        })
      } else if (payload.type === "session-status") {
        setLiveSessions((prev) => {
          const session = prev[payload.sessionId]
          if (!session) return prev
          return { ...prev, [payload.sessionId]: { ...session, liveStatus: payload.status } }
        })
      } else if (payload.type === "session-ended") {
        setLiveSessions((prev) => {
          const session = prev[payload.sessionId]
          if (!session) return prev
          return { ...prev, [payload.sessionId]: { ...session, liveStatus: "idle" } }
        })
      }
    })

    return () => source.close()
  }, [])

  const { execution, startExecution, updateExecution, completeExecution, resetExecution } = useTestExecution()
  const { customBlocks, addCustomBlock, updateCustomBlock, removeCustomBlock, clearCustomBlocks, exportCustomBlocks, importCustomBlocks } = useCustomBlocks()
  const { history: executionHistory, addRecord, clearHistory, getStats } = useExecutionHistory()
  const { envVars, addEnvVar, updateEnvVar, removeEnvVar } = useEnvVars()
  const { toast } = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const leftPanel = useResizable({ initial: 256, min: 160, max: 400, direction: "left", storageKey: "stitch-left-panel" })
  const rightPanel = useResizable({ initial: 288, min: 200, max: 480, direction: "right", storageKey: "stitch-right-panel" })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const exportWorkflows = () => {
    const { buildWorkflowConfig } = require("@/lib/code-generators")
    const config = buildWorkflowConfig(workflows, currentWorkflowId, baseUrl)
    // Augment with folder metadata so it survives import/export
    const exportData = {
      ...config,
      _stitch: {
        folders,
        workflowMeta: workflows.map((w) => ({
          id: w.id,
          folderId: w.folderId ?? null,
          description: w.description ?? null,
          tags: w.tags ?? [],
        })),
      },
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "workflows.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportWorkflowFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const { Play } = require("lucide-react")
        const config = JSON.parse(ev.target?.result as string)
        const imported: Workflow[] = Object.entries(config.workflows).map(([id, wf]: [string, any]) => {
          // Restore folderId and other meta from _stitch section if present
          const meta = config._stitch?.workflowMeta?.find((m: any) => m.id === id)
          return {
            id,
            name: wf.name,
            description: meta?.description ?? wf.description,
            folderId: meta?.folderId ?? undefined,
            tags: meta?.tags ?? [],
            items: wf.workflow.map((item: any, i: number) => ({
              id: `${item.block}-${Date.now()}-${i}`,
              blockId: item.block,
              block: { id: item.block, name: item.block, description: "", icon: Play, color: "bg-gray-500" },
              parameters: item.parameters || {},
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        })
        // Restore folders if present
        if (config._stitch?.folders?.length) {
          setFolders(config._stitch.folders)
        }
        importWorkflows(imported)
      } catch { /* invalid file */ }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  // Playwright .spec.ts import: additive (unlike handleImportWorkflowFile's JSON restore,
  // which replaces everything) — bringing in an existing test suite shouldn't wipe out
  // whatever the user is already working on.
  const handleImportSpecFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    e.target.value = ""
    if (!text.trim()) return

    try {
      const response = await fetch("/api/import-spec", {
        method: "POST",
        headers: { "Content-Type": "text/plain", "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "" },
        body: text,
      })
      const result = await response.json()
      if (!response.ok) {
        toast({ title: "Import failed", description: result.error || "Could not parse this file.", variant: "destructive" })
        return
      }
      const importResult = result as ImportResult

      const now = Date.now()
      let seq = 0

      const toWorkflow = (imported: ImportedWorkflow, resolveSetupId?: string): Workflow => {
        const wfIndex = seq++
        return {
          id: `imported-${now}-${wfIndex}`,
          name: imported.name,
          items: imported.items.map((item, i) => {
            if (item.blockId) {
              const parameters = { ...(item.parameters || {}) }
              if (item.blockId === "callWorkflow" && resolveSetupId && parameters.workflowId === SETUP_WORKFLOW_PLACEHOLDER_ID) {
                parameters.workflowId = resolveSetupId
              }
              const block = allBlocks.find((b) => b.id === item.blockId)
              return {
                id: `${item.blockId}-${now}-${wfIndex}-${i}`,
                blockId: item.blockId,
                block: block || {
                  id: item.blockId,
                  name: item.blockId,
                  description: "",
                  icon: ImportedCodeIcon,
                  color: "bg-gray-500",
                  playwrightFunction: item.blockId,
                },
                parameters,
              }
            }
            // Unmatched source, bundled as an inline (non-library) custom block so it
            // stays runnable without polluting the reusable Custom Blocks list.
            const code = item.customCode || ""
            const firstLine = (code.split("\n").find((l) => l.trim()) || "code").trim().slice(0, 40)
            const fallbackId = `custom_imported_${now}_${wfIndex}_${i}`
            return {
              id: `custom-${now}-${wfIndex}-${i}`,
              blockId: fallbackId,
              block: {
                id: fallbackId,
                name: `Unrecognized: ${firstLine}${firstLine.length >= 40 ? "…" : ""}`,
                description: "Not auto-mapped during import — original code preserved as-is.",
                icon: ImportedCodeIcon,
                color: "bg-gray-500",
                playwrightFunction: fallbackId,
                isCustom: true,
                customCode: code,
              },
              parameters: {},
            }
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }

      const setupWorkflow = importResult.setupWorkflow ? toWorkflow(importResult.setupWorkflow) : undefined
      const testWorkflows = importResult.workflows.map((w) => toWorkflow(w, setupWorkflow?.id))
      const allImported = setupWorkflow ? [setupWorkflow, ...testWorkflows] : testWorkflows

      if (allImported.length === 0) {
        toast({ title: "Nothing to import", description: "No test(...) blocks were found in this file.", variant: "destructive" })
        return
      }

      setWorkflows((prev) => [...prev, ...allImported])
      setCurrentWorkflowId(testWorkflows[0]?.id ?? allImported[0].id)

      const { matched, fallback } = importResult.stats
      toast({
        title: "Spec imported",
        description: `${matched} step${matched === 1 ? "" : "s"} recognized as blocks, ${fallback} kept as code.`,
      })
    } catch (error) {
      toast({ title: "Import failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    }
  }

  const allWorkflows = [...workflows, ...Object.values(liveSessions)]
  const currentWorkflow = allWorkflows.find((w) => w.id === currentWorkflowId)
  const isRunning = execution.status === "running"
  const allBlocks = [...testBlocks, ...customBlocks]

  const currentLiveSession = currentWorkflowId in liveSessions ? liveSessions[currentWorkflowId] : null
  // Read-only while an agent is actively building/running — see the approved plan. Once it
  // reports "idle" (end_session), the human can edit it like any other workflow.
  const isReadOnlyLive = !!currentLiveSession && currentLiveSession.liveStatus !== "idle"

  const handleRestoreItems = useCallback(
    (items: WorkflowItem[]) => {
      setWorkflows((prev) => prev.map((w) => (w.id === currentWorkflowId ? { ...w, items, updatedAt: new Date() } : w)))
    },
    [currentWorkflowId, setWorkflows],
  )

  const { pushState, undo, redo, canUndo, canRedo } = useWorkflowHistory(currentWorkflow?.items || [], handleRestoreItems)

  const updateCurrentWorkflow = useCallback(
    (items: WorkflowItem[], skipHistory = false) => {
      // Every mutation path (add/remove/reorder/parameter edits) funnels through here, so this
      // one guard is enough to enforce the read-only lock for an active live session.
      if (isReadOnlyLive) return
      if (currentWorkflowId in liveSessions) {
        setLiveSessions((prev) => {
          const session = prev[currentWorkflowId]
          if (!session) return prev
          return { ...prev, [currentWorkflowId]: { ...session, items, updatedAt: new Date() } }
        })
        return
      }
      if (!skipHistory && currentWorkflow) pushState(items)
      setWorkflows((prev) => prev.map((w) => (w.id === currentWorkflowId ? { ...w, items, updatedAt: new Date() } : w)))
      setValidationErrors([])
    },
    [currentWorkflowId, setWorkflows, pushState, currentWorkflow, isReadOnlyLive, liveSessions],
  )

  const createWorkflow = (name: string, description?: string, folderId?: string) => {
    const w: Workflow = { id: `workflow-${Date.now()}`, name, description, folderId, items: [], createdAt: new Date(), updatedAt: new Date() }
    setWorkflows((prev) => [...prev, w])
    setCurrentWorkflowId(w.id)
  }
  const deleteWorkflow = (id: string) => {
    const workflow = workflows.find((w) => w.id === id)
    if (workflow?.protected) return
    if (workflows.length <= 1) return
    setWorkflows((prev) => prev.filter((w) => w.id !== id))
    if (currentWorkflowId === id) setCurrentWorkflowId(workflows.find((w) => w.id !== id)?.id || "main")
  }
  const renameWorkflow = (id: string, name: string, description?: string) => {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, name, description, updatedAt: new Date() } : w)))
  }
  const handleWorkflowTagsChange = (id: string, tags: string[]) => {
    setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, tags, updatedAt: new Date() } : w))
  }

  const moveWorkflow = (workflowId: string, folderId: string | undefined) => {
    setWorkflows((prev) => prev.map((w) => w.id === workflowId ? { ...w, folderId, updatedAt: new Date() } : w))
  }
  const createFolder = (name: string) => {
    setFolders((prev) => [...prev, { id: `folder-${Date.now()}`, name }])
  }
  const renameFolder = (id: string, name: string) => {
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name } : f))
  }
  const deleteFolder = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id))
    setWorkflows((prev) => prev.map((w) => w.folderId === id ? { ...w, folderId: undefined } : w))
    // Also unparent child folders
    setFolders((prev) => prev.map((f) => f.parentId === id ? { ...f, parentId: undefined } : f))
  }
  const moveFolder = (folderId: string, parentId: string | undefined) => {
    setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, parentId } : f))
  }

  const handleRunWorkflow = async (config: WorkflowConfig) => {
    if (currentWorkflow) {
      const errors = validateWorkflow(currentWorkflow.items)
      if (errors.length > 0) { setValidationErrors(errors); return }
    }

    const workflowName = workflows.find((w) => w.id === config.mainWorkflow)?.name || "Unknown Workflow"

    if (currentWorkflow) {
      updateCurrentWorkflow(currentWorkflow.items.map((item) => ({
        ...item, executionStatus: "pending" as const, executionError: undefined,
        executionDuration: undefined, executionTimestamp: undefined, executionOutput: undefined,
      })), true)
    }

    const customBlocksConfig = customBlocks.reduce((acc, block) => {
      acc[block.id] = { id: block.id, name: block.name, code: block.customCode || "", parameters: block.parameters || [] }
      return acc
    }, {} as Record<string, any>)

    const configWithCustomBlocks = { ...config, customBlocks: customBlocksConfig }
    startExecution(workflowName)
    const startTime = Date.now()

    try {
      const totalSteps = Object.values(config.workflows).reduce((sum, wf) => sum + wf.workflow.length, 0)
      updateExecution({ totalSteps, completedSteps: 0, currentStep: "Connecting to test runner...", blockResults: {}, logs: ["Initializing Playwright", `Total steps: ${totalSteps}`] })

      const response = await fetch("/api/run-workflow-stream", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "" }, body: JSON.stringify(configWithCustomBlocks),
      })

      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}: Failed to connect to stream`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = "", completedSteps = 0, finalResult: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        let eventType = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) { eventType = line.slice(7) }
          else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6))
              if (eventType === "step-start") {
                // Only the workflow this step actually belongs to should have its canvas items
                // highlighted — a nested callWorkflow (e.g. an auto-generated "Setup" workflow)
                // renumbers steps from 1 within itself, which must not be mistaken for an index
                // into whatever workflow happens to be open in the editor.
                if (currentWorkflow && data.workflowId === currentWorkflowId) {
                  const items = [...currentWorkflow.items]
                  const idx = data.stepNumber - 1
                  if (items[idx]) { items[idx] = { ...items[idx], executionStatus: "running" as const }; updateCurrentWorkflow(items, true) }
                }
                updateExecution({ currentStep: `Running step ${data.globalStepNumber ?? data.stepNumber}: ${data.blockId}`, logs: [`Step ${data.globalStepNumber ?? data.stepNumber}: ${data.blockId}`] })
              } else if (eventType === "step-complete") {
                completedSteps++
                if (currentWorkflow && data.workflowId === currentWorkflowId) {
                  const items = [...currentWorkflow.items]
                  const idx = data.stepNumber - 1
                  if (items[idx]) {
                    items[idx] = { ...items[idx], executionStatus: data.status === "success" ? "success" : "failed", executionError: data.error, executionDuration: data.duration, executionTimestamp: new Date(data.timestamp), executionOutput: data.screenshot || data.output }
                    updateCurrentWorkflow(items, true)
                  }
                }
                updateExecution({ completedSteps, logs: [data.status === "success" ? `Step ${data.globalStepNumber ?? data.stepNumber} passed (${data.duration}ms)` : `Step ${data.globalStepNumber ?? data.stepNumber} failed: ${data.error}`] })
              } else if (eventType === "progress") {
                updateExecution({ completedSteps: data.current, totalSteps: data.total })
              } else if (eventType === "complete") {
                finalResult = data
              } else if (eventType === "error") {
                throw new Error(data.message)
              }
            } catch (e) { if (eventType === "error") throw e }
            eventType = ""
          }
        }
      }

      if (finalResult) {
        updateExecution({ completedSteps: totalSteps, currentStep: finalResult.success ? "All tests passed!" : "Tests failed", logs: [`Completed in ${finalResult.duration}ms`, finalResult.success ? "All assertions passed" : "Some tests failed"] })
        completeExecution(finalResult.success, finalResult.success ? undefined : finalResult.error)
        addRecord({ workflowName, workflowId: currentWorkflowId, status: finalResult.success ? "success" : "failed", startTime: new Date(startTime).toISOString(), endTime: new Date().toISOString(), duration: Date.now() - startTime, totalSteps: finalResult.totalSteps, passedSteps: finalResult.passedSteps, failedSteps: finalResult.failedSteps, error: finalResult.error, blockResults: finalResult.stepResults?.map((s: any) => ({ blockId: s.blockId, status: s.status, duration: s.duration, error: s.error })) || [] })
      } else {
        throw new Error("No result received from stream")
      }
    } catch (error) {
      // Do NOT auto-retry the whole workflow via /api/run-workflow here: steps that already
      // ran through the stream (navigations, form submits, side effects on the app under test)
      // would run a second time. Surface the failure instead and let the user re-run manually.
      toast({
        title: "Connection to the workflow runner was lost",
        description: "Some steps may have already run. Re-run the workflow manually if needed.",
        variant: "destructive",
      })

      if (currentWorkflow) {
        updateCurrentWorkflow(currentWorkflow.items.map((item) => ({ ...item, executionStatus: item.executionStatus === "pending" ? "failed" as const : item.executionStatus, executionError: item.executionStatus === "pending" ? "Test execution failed" : item.executionError })), true)
      }
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      completeExecution(false, errorMsg)
      addRecord({ workflowName, workflowId: currentWorkflowId, status: "failed", startTime: new Date(startTime).toISOString(), endTime: new Date().toISOString(), duration: Date.now() - startTime, totalSteps: currentWorkflow?.items.length || 0, passedSteps: 0, failedSteps: currentWorkflow?.items.length || 0, error: errorMsg, blockResults: [] })
    }
  }

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || !currentWorkflow) return
    const currentItems = currentWorkflow.items
    const oldIndex = currentItems.findIndex((i) => i.id === active.id)
    const newIndex = currentItems.findIndex((i) => i.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) { updateCurrentWorkflow(arrayMove(currentItems, oldIndex, newIndex)); return }
    const isNewBlock = allBlocks.some((b) => b.id === active.id)
    if (isNewBlock && (over.id === "workflow-area" || over.id === "workflow-drop-zone")) {
      const block = allBlocks.find((b) => b.id === active.id)
      if (block) {
        const defaultParams: Record<string, string> = {}
        block.parameters?.forEach((p) => { if (p.defaultValue) defaultParams[p.id] = p.defaultValue })
        updateCurrentWorkflow([...currentItems, { id: `${block.id}-${Date.now()}`, blockId: block.id, block, parameters: defaultParams, steps: [] }])
      }
    }
  }

  const removeWorkflowItem = (id: string) => {
    if (!currentWorkflow) return
    const removed = currentWorkflow.items.find((i) => i.id === id)
    updateCurrentWorkflow(currentWorkflow.items.filter((i) => i.id !== id))
    if (removed) {
      toast({
        title: `Removed "${removed.block.name}"`,
        action: (
          <ToastAction altText="Undo" onClick={undo}>
            Undo
          </ToastAction>
        ),
      })
    }
  }
  const clearCurrentWorkflow = () => updateCurrentWorkflow([])
  const handleParameterChange = (itemId: string, paramId: string, value: string) => {
    if (!currentWorkflow) return
    updateCurrentWorkflow(currentWorkflow.items.map((item) => item.id === itemId ? { ...item, parameters: { ...(item.parameters || {}), [paramId]: value } } : item))
  }
  const handleOutputVariableChange = (itemId: string, variable: string) => {
    if (!currentWorkflow) return
    updateCurrentWorkflow(currentWorkflow.items.map((item) => item.id === itemId ? { ...item, outputVariable: variable } : item))
  }
  const handleCommentChange = (itemId: string, comment: string) => {
    if (!currentWorkflow) return
    updateCurrentWorkflow(currentWorkflow.items.map((item) => item.id === itemId ? { ...item, comment } : item))
  }
  const handleQuickStart = (template: string) => {
    const makeItem = (blockId: string, params: Record<string, string> = {}): WorkflowItem => {
      const block = allBlocks.find((b) => b.id === blockId)!
      const defaultParams: Record<string, string> = {}
      block?.parameters?.forEach((p) => { if (p.defaultValue) defaultParams[p.id] = p.defaultValue })
      return { id: `${blockId}-${Date.now()}-${Math.random()}`, blockId, block, parameters: { ...defaultParams, ...params }, steps: [] }
    }
    const templates: Record<string, WorkflowItem[]> = {
      "login": [makeItem("goto", { url: "/login" }), makeItem("fill", { selector: "input[name='email']", value: "user@example.com" }), makeItem("fill", { selector: "input[name='password']", value: "password" }), makeItem("click", { selector: "button[type='submit']" }), makeItem("expectVisible", { selector: ".dashboard" })],
      "navigate-and-check": [makeItem("goto", { url: "/" }), makeItem("expectVisible", { selector: "h1" }), makeItem("expectUrl", { url: "/" }), makeItem("screenshot", { path: "screenshots/home.png" })],
      "form-submit": [makeItem("goto", { url: "/contact" }), makeItem("fill", { selector: "input[name='name']", value: "John Doe" }), makeItem("fill", { selector: "input[name='email']", value: "john@example.com" }), makeItem("fill", { selector: "textarea[name='message']", value: "Hello!" }), makeItem("click", { selector: "button[type='submit']" }), makeItem("expectVisible", { selector: ".success-message" })],
    }
    const items = templates[template]
    if (items) updateCurrentWorkflow(items)
  }
  const importWorkflows = (importedWorkflows: Workflow[]) => {
    setWorkflows(importedWorkflows)
    if (importedWorkflows.length > 0) setCurrentWorkflowId(importedWorkflows[0].id)
  }

  const activeBlock = activeId ? allBlocks.find((b) => b.id === activeId) : null

  const handleAddBlockFromPalette = useCallback(
    (block: TestBlockDefinition) => {
      if (!currentWorkflow) return
      const defaultParams: Record<string, string> = {}
      block.parameters?.forEach((p) => { if (p.defaultValue) defaultParams[p.id] = p.defaultValue })
      updateCurrentWorkflow([
        ...currentWorkflow.items,
        { id: `${block.id}-${Date.now()}`, blockId: block.id, block, parameters: defaultParams, steps: [] },
      ])
    },
    [currentWorkflow, updateCurrentWorkflow],
  )

  // ── Global keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Bail out entirely while any modal/dialog is open (Settings, Add Custom Block,
      // Block Debug/Inspector, etc.) — otherwise canvas shortcuts like Delete/D/arrow
      // keys mutate the workflow underneath the open dialog. Radix Dialog/AlertDialog
      // content is only mounted in the DOM while open, so this covers every dialog
      // without needing each one to lift its open-state up here.
      if (settingsOpen || document.querySelector('[role="dialog"], [role="alertdialog"]')) return

      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable
      const items = currentWorkflow?.items || []
      const selectedIdx = selectedItemId ? items.findIndex((i) => i.id === selectedItemId) : -1

      // ⌘Z / ⌘⇧Z – Undo/Redo (always)
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); canUndo && undo(); return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); canRedo && redo(); return
      }

      // ⌘↵ – Run workflow (always, even from input)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (!isRunning && currentWorkflow && currentWorkflow.items.length > 0) {
          const { buildWorkflowConfig } = require("@/lib/code-generators")
          handleRunWorkflow(buildWorkflowConfig(workflows, currentWorkflowId, baseUrl))
        }
        return
      }

      // Skip remaining shortcuts when typing in an input
      if (isInput) return

      // Esc – deselect
      if (e.key === "Escape") {
        setSelectedItemId(null); return
      }

      // ↑↓ – navigate steps
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault()
        if (items.length === 0) return
        if (selectedIdx === -1) {
          setSelectedItemId(items[e.key === "ArrowDown" ? 0 : items.length - 1].id)
        } else {
          const next = e.key === "ArrowDown"
            ? Math.min(selectedIdx + 1, items.length - 1)
            : Math.max(selectedIdx - 1, 0)
          setSelectedItemId(items[next].id)
        }
        return
      }

      // ⌘↑ / ⌘↓ – move step
      if ((e.metaKey || e.ctrlKey) && (e.key === "ArrowUp" || e.key === "ArrowDown") && selectedIdx !== -1) {
        e.preventDefault()
        const newIdx = e.key === "ArrowUp" ? selectedIdx - 1 : selectedIdx + 1
        if (newIdx < 0 || newIdx >= items.length) return
        updateCurrentWorkflow(arrayMove([...items], selectedIdx, newIdx))
        return
      }

      // D – duplicate selected step
      if (e.key === "d" && selectedIdx !== -1) {
        e.preventDefault()
        const item = items[selectedIdx]
        const dup = { ...item, id: `${item.blockId}-${Date.now()}` }
        const next = [...items]
        next.splice(selectedIdx + 1, 0, dup)
        updateCurrentWorkflow(next)
        setSelectedItemId(dup.id)
        return
      }

      // Backspace / Delete – remove selected step
      if ((e.key === "Backspace" || e.key === "Delete") && selectedIdx !== -1) {
        e.preventDefault()
        const next = items.filter((_, i) => i !== selectedIdx)
        updateCurrentWorkflow(next)
        setSelectedItemId(next[Math.min(selectedIdx, next.length - 1)]?.id ?? null)
        return
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [currentWorkflow, selectedItemId, isRunning, canUndo, canRedo, undo, redo, updateCurrentWorkflow, workflows, currentWorkflowId, baseUrl, handleRunWorkflow, settingsOpen])

  if (!isHydrated) return null

  return (
    <ExtensionPickerProvider>
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

        {/* ── Top bar ── */}
        <header className="flex-shrink-0 bg-card border-b border-border px-3 h-11 flex items-stretch gap-2">
          {/* Logo */}
          <div className="flex items-center gap-1.5 mr-1 flex-shrink-0 self-center">
            <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M7 2v10M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-display font-medium text-foreground text-[13px] tracking-tight">stitch</span>
          </div>

          <Separator orientation="vertical" className="h-4 self-center" />

          {/* Workflow tabs – takes remaining space */}
          <div className="flex-1 min-w-0 overflow-hidden h-full">
            <WorkflowManager
              workflows={allWorkflows}
              folders={folders}
              currentWorkflowId={currentWorkflowId}
              onCreateWorkflow={createWorkflow}
              onSelectWorkflow={setCurrentWorkflowId}
              onDeleteWorkflow={deleteWorkflow}
              onRenameWorkflow={renameWorkflow}
              onMoveWorkflow={moveWorkflow}
              onCreateFolder={createFolder}
              onRenameFolder={renameFolder}
              onDeleteFolder={deleteFolder}
              onTagsChange={handleWorkflowTagsChange}
            />
          </div>

          <Separator orientation="vertical" className="h-4 self-center" />

          {/* Primary actions – always visible */}
          <div className="flex items-center gap-1 flex-shrink-0 self-center">
            <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="h-7 w-7 p-0 text-muted-foreground">
              <Undo2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="h-7 w-7 p-0 text-muted-foreground">
              <Redo2 className="w-3 h-3" />
            </Button>

            <Separator orientation="vertical" className="h-4 mx-0.5" />

            {/* Command palette shortcut hint */}
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
              className="hidden sm:flex items-center gap-1.5 h-7 px-2 rounded-md border border-border text-muted-foreground text-xs hover:border-ring/40 hover:text-foreground transition-colors"
              title="Open command palette (⌘K)"
            >
              <Search className="w-3 h-3" />
              <span>Add block</span>
              <kbd className="text-[10px] bg-muted px-1 rounded font-mono">⌘K</kbd>
            </button>

            <Separator orientation="vertical" className="h-4 mx-0.5" />

            <WorkflowExporter workflows={workflows} baseUrl={baseUrl} currentWorkflowId={currentWorkflowId} />

            <Separator orientation="vertical" className="h-4" />

            {/* Run controls */}
            <WorkflowControls
              workflows={workflows}
              currentWorkflowId={currentWorkflowId}
              baseUrl={baseUrl}
              isRunning={isRunning}
              onRunWorkflow={handleRunWorkflow}
            />

            <Separator orientation="vertical" className="h-4" />

            <Button variant="ghost" size="sm" onClick={() => window.open("/extension-install", "_blank")} title="Install browser extension" className="h-7 w-7 p-0 text-muted-foreground">
              <Puzzle className="w-3.5 h-3.5" />
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} title="Settings" className="h-7 w-7 p-0 text-muted-foreground">
              <Settings2 className="w-3.5 h-3.5" />
            </Button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }))}
              className="h-7 w-7 flex items-center justify-center rounded-md font-display text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-colors"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
          </div>
        </header>

        {/* ── Banners ── */}
        {validationErrors.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2 bg-card border-b border-border">
            <ValidationErrors errors={validationErrors} onDismiss={() => setValidationErrors([])} />
          </div>
        )}

        {/* ── Main content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left sidebar */}
          <div style={sidebarCollapsed ? undefined : { width: leftPanel.size }} className="flex-shrink-0 min-h-0 h-full">
            <TestBlocksSidebar
              blocks={testBlocks}
              customBlocks={customBlocks}
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
              onAddCustomBlock={addCustomBlock}
              onUpdateCustomBlock={updateCustomBlock}
              onRemoveCustomBlock={removeCustomBlock}
              onExportCustomBlocks={exportCustomBlocks}
              onImportCustomBlocks={importCustomBlocks}
              onClearCustomBlocks={clearCustomBlocks}
              workflows={allWorkflows}
              folders={folders}
              currentWorkflowId={currentWorkflowId}
              onSelectWorkflow={setCurrentWorkflowId}
              onCreateWorkflow={(name, folderId) => createWorkflow(name, undefined, folderId)}
              onCreateFolder={createFolder}
              onRenameWorkflow={renameWorkflow}
              onRenameFolder={renameFolder}
              onDeleteWorkflow={deleteWorkflow}
              onDeleteFolder={deleteFolder}
              onMoveWorkflow={moveWorkflow}
              onMoveFolder={moveFolder}
            />
          </div>

          {/* Left resize handle – hidden when collapsed */}
          {!sidebarCollapsed && (
            <div
              onMouseDown={leftPanel.onMouseDown}
              className="w-1 flex-shrink-0 bg-border hover:bg-primary/50 active:bg-primary cursor-col-resize transition-colors"
            />
          )}

          {/* Canvas */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 min-w-0 bg-grid">
            <SortableContext items={currentWorkflow?.items.map((i) => i.id) || []} strategy={verticalListSortingStrategy}>
              <WorkflowBuilder
                items={currentWorkflow?.items || []}
                workflows={workflows}
                currentWorkflowId={currentWorkflowId}
                allBlocks={allBlocks}
                envVars={envVars}
                baseUrl={baseUrl}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
                onRemoveItem={removeWorkflowItem}
                onParameterChange={handleParameterChange}
                onOutputVariableChange={handleOutputVariableChange}
                onCommentChange={handleCommentChange}
                onQuickStart={handleQuickStart}
                onReplaceItems={updateCurrentWorkflow}
                readOnly={isReadOnlyLive}
              />
            </SortableContext>
          </main>

          {/* Right resize handle */}
          <div
            onMouseDown={rightPanel.onMouseDown}
            className="w-1 flex-shrink-0 bg-border hover:bg-primary/50 active:bg-primary cursor-col-resize transition-colors"
          />

          {/* Right panel */}
          <div style={{ width: rightPanel.size }} className="flex-shrink-0 min-h-0 h-full">
            <RightPanel
              execution={execution}
              onCloseExecution={resetExecution}
              selectedItem={currentWorkflow?.items.find((i) => i.id === selectedItemId) ?? null}
              onDeselectItem={() => setSelectedItemId(null)}
              workflows={workflows}
              currentWorkflowId={currentWorkflowId}
              envVars={envVars}
              onParameterChange={handleParameterChange}
              onOutputVariableChange={handleOutputVariableChange}
              onCommentChange={handleCommentChange}
            />
          </div>
        </div>

        <DragOverlay>{activeBlock ? <TestBlock block={activeBlock} isDragging /> : null}</DragOverlay>
      </DndContext>

      <CommandPalette blocks={allBlocks} onSelect={handleAddBlockFromPalette} />
      <ShortcutCheatsheet />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        baseUrl={baseUrl}
        onBaseUrlChange={setBaseUrl}
        envVars={envVars}
        onAddEnvVar={addEnvVar}
        onUpdateEnvVar={updateEnvVar}
        onRemoveEnvVar={removeEnvVar}
        workflows={workflows}
        currentWorkflowId={currentWorkflowId}
        folders={folders}
        onExportWorkflows={exportWorkflows}
        onImportWorkflows={handleImportWorkflowFile}
        onImportSpec={handleImportSpecFile}
        history={executionHistory}
        stats={getStats()}
        onClearHistory={clearHistory}
      />
    </div>
    </ExtensionPickerProvider>
  )
}
