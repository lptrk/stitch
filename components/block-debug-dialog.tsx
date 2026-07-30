"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Bug, CheckCircle, XCircle, Loader2, AlertTriangle, Copy, Download, Image } from "lucide-react"
import type { TestBlockDefinition, WorkflowItem } from "@/types/workflow"

interface BlockDebugDialogProps {
  block: TestBlockDefinition | null
  workflowItem?: WorkflowItem | null
  open: boolean
  onClose: () => void
  onTestBlock?: (
    block: TestBlockDefinition,
    parameters: Record<string, string>,
    onEvent?: (event: { type: string; data: any }) => void
  ) => Promise<void>
}

type RunStatus = "idle" | "running" | "success" | "failed"

interface LogEntry {
  level: "info" | "error" | "warn" | "step"
  text: string
  duration?: number
}

export function BlockDebugDialog({ block, workflowItem, open, onClose, onTestBlock }: BlockDebugDialogProps) {
  const [params, setParams] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<RunStatus>("idle")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [duration, setDuration] = useState<number | null>(null)
  const [screenshot, setScreenshot] = useState<string | null>(null)

  useEffect(() => {
    if (open && block) {
      const initial: Record<string, string> = {}
      block.parameters?.forEach((p) => {
        initial[p.id] = workflowItem?.parameters?.[p.id] ?? p.defaultValue ?? ""
      })
      setParams(initial)
      setStatus("idle")
      setLogs([])
      setDuration(null)
      setScreenshot(null)
    }
  }, [open, block, workflowItem])

  if (!block) return null

  const missingRequired = (block.parameters || []).filter((p) => p.required && !params[p.id]?.trim())
  const canRun = missingRequired.length === 0 && !!onTestBlock

  const addLog = (entry: LogEntry) => setLogs((l) => [...l, entry])

  const run = async () => {
    if (!canRun) return
    setStatus("running")
    setLogs([{ level: "info", text: `Starting "${block.name}"` }])
    setDuration(null)
    setScreenshot(null)
    const start = Date.now()

    const handleEvent = ({ type, data }: { type: string; data: any }) => {
      if (type === "step-start") {
        addLog({ level: "step", text: `Running step: ${data.blockId}` })
      } else if (type === "step-complete") {
        const ms = data.duration ?? 0
        if (data.status === "success") {
          addLog({ level: "info", text: `Step passed`, duration: ms })
          if (data.screenshot) setScreenshot(data.screenshot)
        } else {
          addLog({ level: "error", text: data.error || "Step failed", duration: ms })
        }
      } else if (type === "complete") {
        const ms = Date.now() - start
        setDuration(ms)
        if (data.success) {
          setStatus("success")
          addLog({ level: "info", text: `Done in ${ms}ms` })
        } else {
          setStatus("failed")
          addLog({ level: "error", text: data.error || "Failed" })
        }
      } else if (type === "error") {
        addLog({ level: "error", text: data.message || "Unexpected error" })
      }
    }

    try {
      await onTestBlock!(block, params, handleEvent)
      if (status !== "failed") {
        const ms = Date.now() - start
        setDuration(ms)
        setStatus("success")
      }
    } catch (error) {
      const ms = Date.now() - start
      setDuration(ms)
      setStatus("failed")
      addLog({ level: "error", text: error instanceof Error ? error.message : String(error) })
    }
  }

  const setParam = (id: string, value: string) => setParams((prev) => ({ ...prev, [id]: value }))

  const downloadScreenshot = () => {
    if (!screenshot) return
    const a = document.createElement("a")
    a.href = screenshot
    a.download = `debug-${block.name.replace(/\s+/g, "-")}-${Date.now()}.png`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Bug className="w-4 h-4 text-primary" />
            Debug: {block.name}
            {block.isCustom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
            {status === "success" && <Badge className="text-xs bg-green-500">Passed</Badge>}
            {status === "failed" && <Badge variant="destructive" className="text-xs">Failed</Badge>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">

            {/* Parameters */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parameters</Label>
              {(!block.parameters || block.parameters.length === 0) ? (
                <p className="text-xs text-muted-foreground italic">No parameters – block runs immediately.</p>
              ) : (
                block.parameters.map((param) => (
                  <div key={param.id} className="space-y-1">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      {param.name}
                      {param.required && <span className="text-red-400 text-[10px]">required</span>}
                      <span className="text-muted-foreground/70 font-normal text-[10px] ml-auto">{param.type}</span>
                    </label>
                    {param.type === "boolean" ? (
                      <div className="flex items-center gap-2">
                        <Switch checked={params[param.id] === "true"} onCheckedChange={(v) => setParam(param.id, String(v))} />
                        <span className="text-xs text-muted-foreground">{params[param.id] === "true" ? "Yes" : "No"}</span>
                      </div>
                    ) : param.type === "select" ? (
                      <Select value={params[param.id] || ""} onValueChange={(v) => setParam(param.id, v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={param.placeholder} /></SelectTrigger>
                        <SelectContent>
                          {(param.options as { value: string; label: string }[] | undefined)?.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : param.type === "textarea" ? (
                      <Textarea value={params[param.id] || ""} onChange={(e) => setParam(param.id, e.target.value)} placeholder={param.placeholder} className="text-xs font-mono min-h-[72px] resize-y" />
                    ) : (
                      <Input
                        value={params[param.id] || ""}
                        onChange={(e) => setParam(param.id, e.target.value)}
                        placeholder={param.placeholder}
                        type={param.type === "number" ? "number" : "text"}
                        className={`h-8 text-xs ${param.type === "selector" ? "font-mono" : ""}`}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Missing required warning */}
            {missingRequired.length > 0 && (
              <div className="flex items-start gap-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Required: <strong>{missingRequired.map(p => p.name).join(", ")}</strong>
              </div>
            )}

            {/* Live output */}
            {logs.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                    {status === "success" && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                    {status === "failed" && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                    <span className={`text-xs font-medium ${status === "success" ? "text-green-700" : status === "failed" ? "text-red-700" : "text-primary"}`}>
                      {status === "running" ? "Running…"
                        : status === "success" ? `Passed${duration ? ` · ${duration}ms` : ""}`
                        : `Failed${duration ? ` · ${duration}ms` : ""}`}
                    </span>
                    {status === "failed" && (
                      <button
                        onClick={() => navigator.clipboard.writeText(logs.map(l => l.text).join("\n"))}
                        className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    )}
                  </div>

                  <div className="rounded-md bg-gray-950 p-3 space-y-1.5">
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className={`text-[10px] font-mono leading-relaxed flex-1 ${
                          log.level === "error" ? "text-red-400"
                          : log.level === "warn" ? "text-yellow-400"
                          : log.level === "step" ? "text-primary/70"
                          : "text-muted-foreground/70"
                        }`}>
                          {log.text}
                        </span>
                        {log.duration != null && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{log.duration}ms</span>
                        )}
                      </div>
                    ))}
                    {status === "running" && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> waiting…
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Screenshot result */}
            {screenshot && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Image className="w-3 h-3" /> Screenshot
                    </Label>
                    <button onClick={downloadScreenshot} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Download className="w-3 h-3" /> Save
                    </button>
                  </div>
                  <img
                    src={screenshot}
                    alt="Debug screenshot"
                    className="w-full rounded-md border border-border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(screenshot, "_blank")}
                  />
                </div>
              </>
            )}

            {/* Custom code preview */}
            {block.isCustom && block.customCode && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Code</Label>
                  <pre className="text-[10px] font-mono bg-gray-950 text-muted-foreground rounded-md p-3 max-h-28 overflow-y-auto leading-relaxed">
                    <code>{block.customCode}</code>
                  </pre>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between flex-shrink-0">
          <p className="text-[10px] text-muted-foreground">
            Runs against the configured base URL
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose}>Close</Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={run}
              disabled={!canRun || status === "running"}
            >
              {status === "running"
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</>
                : <><Play className="w-3 h-3" /> Run</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
