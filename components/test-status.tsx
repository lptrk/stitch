"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Play, AlertCircle, X, Copy } from "lucide-react"

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
}

interface TestStatusProps {
  execution: TestExecution
  onClose?: () => void
}

export function TestStatus({ execution, onClose }: TestStatusProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (execution.totalSteps && execution.completedSteps) {
      setProgress((execution.completedSteps / execution.totalSteps) * 100)
    }
  }, [execution.completedSteps, execution.totalSteps])

  const getStatusIcon = () => {
    switch (execution.status) {
      case "running":
        return <Clock className="w-4 h-4 animate-spin text-blue-600" />
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Play className="w-4 h-4" />
    }
  }

  const getStatusBadge = () => {
    switch (execution.status) {
      case "running":
        return <Badge className="bg-blue-500 hover:bg-blue-600">RUNNING</Badge>
      case "success":
        return <Badge className="bg-green-500 hover:bg-green-600">PASSED</Badge>
      case "failed":
        return <Badge className="bg-red-500 hover:bg-red-600">FAILED</Badge>
      default:
        return <Badge variant="outline">IDLE</Badge>
    }
  }

  const getDuration = () => {
    if (!execution.startTime) return ""
    const end = execution.endTime || new Date()
    const duration = Math.round((end.getTime() - execution.startTime.getTime()) / 1000)
    return `${duration}s`
  }

  const copyLogsToClipboard = () => {
    const logsText = execution.logs.join("\n")
    navigator.clipboard.writeText(logsText)
  }

  if (execution.status === "idle") {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Test: {execution.workflowName}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {getDuration() && <span className="text-sm text-gray-500">{getDuration()}</span>}
            {onClose && execution.status !== "running" && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {execution.status === "running" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>
                {execution.completedSteps || 0} / {execution.totalSteps || "?"} steps
              </span>
            </div>
            <Progress value={progress} className="w-full" />
            {execution.currentStep && (
              <p className="text-sm text-gray-600 animate-pulse">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                {execution.currentStep}
              </p>
            )}
          </div>
        )}

        {/* Success Message */}
        {execution.status === "success" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">✅ All tests passed successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {execution.status === "failed" && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">❌ Tests failed</p>
              {execution.error && (
                <p className="text-red-700 text-sm mt-1 font-mono bg-red-100 p-2 rounded">{execution.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Logs */}
        {execution.logs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Execution Log</h4>
              <Button variant="ghost" size="sm" onClick={copyLogsToClipboard}>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>
            <ScrollArea className="h-32 w-full border rounded-lg p-2 bg-gray-50">
              <div className="space-y-1">
                {execution.logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono text-gray-700">
                    <span className="text-gray-400">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
