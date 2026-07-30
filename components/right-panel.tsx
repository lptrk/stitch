"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BlockParameters } from "@/components/block-parameters"
import { SafeIcon } from "@/components/safe-icon"
import {
  X, CheckCircle, XCircle, Clock, Copy, ChevronDown, GitBranch,
  Variable, MessageSquare, Download, Image
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import type { WorkflowItem, Workflow } from "@/types/workflow"
import type { EnvVar } from "@/hooks/use-env-vars"

interface TestExecution {
  id: string
  status: "running" | "success" | "failed" | "idle"
  workflowName: string
  startTime?: Date
  endTime?: Date
  currentStep?: string
  totalSteps?: number
  completedSteps?: number
  logs: string[]
  error?: string
  blockResults: Record<string, any>
}

interface RightPanelProps {
  // Execution
  execution: TestExecution
  onCloseExecution: () => void
  // Selected step
  selectedItem: WorkflowItem | null
  onDeselectItem: () => void
  // For parameter editing
  workflows: Workflow[]
  currentWorkflowId: string
  envVars: EnvVar[]
  onParameterChange: (itemId: string, parameterId: string, value: string) => void
  onOutputVariableChange: (itemId: string, variable: string) => void
  onCommentChange: (itemId: string, comment: string) => void
}

export function RightPanel({
  execution,
  onCloseExecution,
  selectedItem,
  onDeselectItem,
  workflows,
  currentWorkflowId,
  envVars,
  onParameterChange,
  onOutputVariableChange,
  onCommentChange,
}: RightPanelProps) {
  const [showLogs, setShowLogs] = useState(false)
  const [showOutputVar, setShowOutputVar] = useState(!!selectedItem?.outputVariable)

  // While a run is actively in progress, keep showing live execution progress even if the
  // user clicks a step — losing the only progress view mid-run is worse than deferring the
  // properties view until the run finishes (or is idle again).
  const mode: "properties" | "execution" | "empty" =
    execution.status === "running" ? "execution" :
    selectedItem ? "properties" :
    execution.status !== "idle" ? "execution" :
    "empty"

  const progress =
    execution.totalSteps && execution.completedSteps
      ? Math.round((execution.completedSteps / execution.totalSteps) * 100)
      : 0

  const getDuration = () => {
    if (!execution.startTime) return ""
    const end = execution.endTime || new Date()
    const s = Math.round((end.getTime() - execution.startTime.getTime()) / 1000)
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
  }

  return (
    <div className="flex-shrink-0 border-l border-border bg-card flex flex-col h-full w-full">

      {/* ── Properties mode ── */}
      {mode === "properties" && selectedItem && (
        <>
          <div className="flex items-center justify-between px-4 h-9 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {selectedItem.blockId === "callWorkflow"
                ? <GitBranch className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                : <SafeIcon icon={selectedItem.block.icon} className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              }
              <span className="text-xs font-semibold text-foreground truncate">
                {selectedItem.block.name}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground flex-shrink-0" onClick={onDeselectItem}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-4 py-3 space-y-4">
              {/* Description */}
              {selectedItem.block.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{selectedItem.block.description}</p>
              )}

              <Separator />

              {/* Parameters */}
              {selectedItem.block.parameters && selectedItem.block.parameters.length > 0 ? (
                <BlockParameters
                  parameters={selectedItem.block.parameters}
                  values={selectedItem.parameters || {}}
                  workflows={workflows}
                  currentWorkflowId={currentWorkflowId}
                  envVars={envVars}
                  onChange={(paramId, value) => onParameterChange(selectedItem.id, paramId, value)}
                />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No parameters</p>
              )}

              <Separator />

              {/* Comment */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Note
                </label>
                <Textarea
                  value={selectedItem.comment || ""}
                  onChange={(e) => onCommentChange(selectedItem.id, e.target.value)}
                  placeholder="Add a note for this step…"
                  className="text-xs min-h-[60px] resize-none border-border focus:border-amber-300 bg-amber-50/50 placeholder:text-muted-foreground/70"
                />
              </div>

              {/* Output variable */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Variable className="w-3 h-3" /> Output variable
                </label>
                <Input
                  value={selectedItem.outputVariable || ""}
                  onChange={(e) => onOutputVariableChange(selectedItem.id, e.target.value)}
                  placeholder="variableName"
                  className="h-7 text-xs"
                />
                {selectedItem.outputVariable && (
                  <p className="text-[10px] text-muted-foreground">
                    Use as <code className="bg-muted px-1 rounded">{`{{${selectedItem.outputVariable}}}`}</code> in later steps
                  </p>
                )}
              </div>

              {/* Execution result for this step */}
              {selectedItem.executionStatus && selectedItem.executionStatus !== "pending" && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Last run</label>
                    <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md ${
                      selectedItem.executionStatus === "success" ? "bg-green-50 text-green-700" :
                      selectedItem.executionStatus === "failed" ? "bg-red-50 text-red-700" :
                      "bg-accent text-primary"
                    }`}>
                      {selectedItem.executionStatus === "success" && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                      {selectedItem.executionStatus === "failed" && <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                      {selectedItem.executionStatus === "running" && <Clock className="w-3.5 h-3.5 animate-spin flex-shrink-0" />}
                      <span className="capitalize">{selectedItem.executionStatus}</span>
                      {selectedItem.executionDuration && (
                        <span className="ml-auto text-muted-foreground">{selectedItem.executionDuration}ms</span>
                      )}
                    </div>
                    {selectedItem.executionError && (
                      <p className="text-[10px] text-red-600 bg-red-50 rounded p-2 leading-relaxed">
                        {selectedItem.executionError}
                      </p>
                    )}

                    {/* Screenshot preview + download */}
                    {selectedItem.executionOutput && selectedItem.executionOutput.startsWith("data:image") && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                            <Image className="w-3 h-3" /> Screenshot
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] gap-1"
                            onClick={async () => {
                              const dataUrl = selectedItem.executionOutput!
                              const isJpeg = dataUrl.includes("image/jpeg")
                              const ext = isJpeg ? "jpg" : "png"
                              const baseName = (selectedItem.parameters?.name as string)?.trim()
                                || `screenshot-step-${selectedItem.executionTimestamp
                                    ? new Date(selectedItem.executionTimestamp).toISOString().slice(0, 19).replace(/[:.]/g, "-")
                                    : Date.now()}`
                              const suggestedName = `${baseName}.${ext}`

                              // Try File System Access API (Chromium) for native folder picker
                              if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
                                try {
                                  const handle = await (window as any).showSaveFilePicker({
                                    suggestedName,
                                    types: [{
                                      description: "Image",
                                      accept: { [isJpeg ? "image/jpeg" : "image/png"]: [`.${ext}`] },
                                    }],
                                  })
                                  const res = await fetch(dataUrl)
                                  const blob = await res.blob()
                                  const writable = await handle.createWritable()
                                  await writable.write(blob)
                                  await writable.close()
                                  return
                                } catch (e) {
                                  // User cancelled or API not available – fall through to regular download
                                  if ((e as Error).name === "AbortError") return
                                }
                              }

                              // Fallback: regular anchor download
                              const a = document.createElement("a")
                              a.href = dataUrl
                              a.download = suggestedName
                              a.click()
                            }}
                          >
                            <Download className="w-3 h-3" /> Save as…
                          </Button>
                        </div>
                        <img
                          src={selectedItem.executionOutput}
                          alt="Screenshot"
                          className="w-full rounded border border-border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(selectedItem.executionOutput, "_blank")}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* ── Execution mode ── */}
      {mode === "execution" && (
        <>
          <div className="flex items-center justify-between px-4 h-9 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {execution.status === "running" && <Clock className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />}
              {execution.status === "success" && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
              {execution.status === "failed" && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
              <span className="text-xs font-semibold text-foreground truncate">{execution.workflowName}</span>
            </div>
            {execution.status !== "running" && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={onCloseExecution}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="px-4 py-3 space-y-4">
              {/* Progress */}
              {execution.status === "running" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="truncate">{execution.currentStep || "Running…"}</span>
                    <span className="flex-shrink-0 ml-2">{execution.completedSteps || 0}/{execution.totalSteps || "?"}</span>
                  </div>
                  <Progress value={progress} className="h-1" />
                </div>
              )}

              {/* Result summary */}
              {execution.status === "success" && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-md px-3 py-2">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  All {execution.totalSteps} steps passed · {getDuration()}
                </div>
              )}
              {execution.status === "failed" && execution.error && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-md px-3 py-2">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Failed · {getDuration()}
                  </div>
                  <p className="text-[10px] text-red-600 bg-red-50 rounded p-2 leading-relaxed">
                    {simplifyError(execution.error)}
                  </p>
                </div>
              )}

              {/* Logs */}
              {execution.logs.length > 0 && (
                <div className="space-y-1.5">
                  <button
                    onClick={() => setShowLogs((v) => !v)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wide font-semibold"
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${showLogs ? "rotate-180" : ""}`} />
                    Logs ({execution.logs.length})
                  </button>
                  {showLogs && (
                    <div className="relative">
                      <Button
                        variant="ghost" size="sm"
                        className="absolute top-1 right-1 h-5 px-1.5 text-[10px] text-muted-foreground z-10"
                        onClick={() => navigator.clipboard.writeText(execution.logs.join("\n"))}
                      >
                        <Copy className="w-2.5 h-2.5 mr-1" /> Copy
                      </Button>
                      <ScrollArea className="h-48 rounded-md bg-gray-950 p-2.5">
                        {execution.logs.map((log, i) => (
                          <div key={i} className="text-[10px] font-mono text-muted-foreground/70 leading-relaxed">{log}</div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* ── Empty mode ── */}
      {mode === "empty" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
          <p className="text-xs text-muted-foreground/70 font-medium">No step selected</p>
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            Click a step to edit its parameters, or run the workflow to see execution output here.
          </p>
        </div>
      )}
    </div>
  )
}

function simplifyError(error: string): string {
  if (error.includes("Timeout") || error.includes("timeout"))
    return "A step took too long – the element might not exist on the page, or the page loaded too slowly."
  if (error.includes("net::ERR") || error.includes("ERR_CONNECTION"))
    return "Could not reach the page. Make sure the app is running and the Base URL is correct."
  if (error.includes("selector") || error.includes("locator"))
    return "An element could not be found on the page. The selector might be wrong or the page structure has changed."
  if (error.includes("Expected") && error.includes("received"))
    return `Assertion failed: ${error}`
  return error
}
