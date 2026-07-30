"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Play, AlertCircle, X, Copy, ChevronDown } from "lucide-react"

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

interface TestStatusProps {
  execution: TestExecution
  onClose?: () => void
}

export function TestStatus({ execution, onClose }: TestStatusProps) {
  const [showTechnical, setShowTechnical] = useState(false)

  if (execution.status === "idle") return null

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

  const copyLogs = () => navigator.clipboard.writeText(execution.logs.join("\n"))

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${
      execution.status === "success" ? "bg-green-50 border-green-200" :
      execution.status === "failed"  ? "bg-red-50 border-red-200" :
      "bg-accent border-primary/30"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {execution.status === "running" && <Clock className="w-4 h-4 animate-spin text-primary" />}
          {execution.status === "success" && <CheckCircle className="w-4 h-4 text-green-600" />}
          {execution.status === "failed"  && <XCircle className="w-4 h-4 text-red-600" />}
          <span className="font-medium text-sm">{execution.workflowName}</span>
          {execution.status === "running" && (
            <Badge className="bg-primary text-primary-foreground text-xs">Running…</Badge>
          )}
          {execution.status === "success" && (
            <Badge className="bg-green-500 text-xs">All steps passed</Badge>
          )}
          {execution.status === "failed" && (
            <Badge className="bg-red-500 text-xs">Test failed</Badge>
          )}
          {getDuration() && <span className="text-xs text-muted-foreground">{getDuration()}</span>}
        </div>
        {onClose && execution.status !== "running" && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Progress bar (running only) */}
      {execution.status === "running" && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{execution.currentStep || "Running…"}</span>
            <span>{execution.completedSteps || 0} / {execution.totalSteps || "?"} steps</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Simple result message */}
      {execution.status === "success" && (
        <p className="text-sm text-green-800">
          All {execution.totalSteps} steps completed successfully.
        </p>
      )}

      {execution.status === "failed" && execution.error && (
        <div className="space-y-1">
          <p className="text-sm text-red-800 font-medium">What went wrong:</p>
          <p className="text-sm text-red-700 bg-red-100 rounded p-2">
            {simplifyError(execution.error)}
          </p>
        </div>
      )}

      {/* Technical log toggle */}
      {execution.logs.length > 0 && (
        <div>
          <button
            onClick={() => setShowTechnical((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showTechnical ? "rotate-180" : ""}`} />
            {showTechnical ? "Hide" : "Show"} technical details
          </button>

          {showTechnical && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={copyLogs} className="h-6 text-xs">
                  <Copy className="w-3 h-3 mr-1" /> Copy logs
                </Button>
              </div>
              <ScrollArea className="h-32 border rounded bg-gray-900 p-2">
                {execution.logs.map((log, i) => (
                  <div key={i} className="text-xs font-mono text-muted-foreground/70">{log}</div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Translate technical error messages into plain language
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
