"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, XCircle, Clock, Trash2, History, TrendingUp, Image, ChevronDown, ChevronRight } from "lucide-react"
import type { ExecutionRecord } from "@/hooks/use-execution-history"

interface ExecutionHistoryProps {
  history: ExecutionRecord[]
  stats: { total: number; passed: number; failed: number; avgDuration: number; successRate: number } | null
  onClear: () => void
}

export function ExecutionHistory({ history, stats, onClear }: ExecutionHistoryProps) {
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [screenshotId, setScreenshotId] = useState<string | null>(null)

  // Group by workflow name for trend view
  const byWorkflow = history.reduce((acc, r) => {
    if (!acc[r.workflowName]) acc[r.workflowName] = []
    acc[r.workflowName].push(r)
    return acc
  }, {} as Record<string, ExecutionRecord[]>)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative h-8">
          <History className="w-3.5 h-3.5 mr-1.5" />
          History
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-xs px-1 py-0 h-4">
              {history.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Execution History
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-2 p-3 bg-muted rounded-lg flex-shrink-0">
            <div className="text-center">
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Runs</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${stats.successRate >= 80 ? "text-green-600" : stats.successRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {stats.successRate}%
              </div>
              <div className="text-xs text-muted-foreground">Pass Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{stats.passed}</div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        )}

        {/* Trend bars per workflow */}
        {Object.keys(byWorkflow).length > 1 && (
          <div className="space-y-1.5 flex-shrink-0">
            <p className="text-xs font-medium text-muted-foreground">Trends per workflow (last 10 runs)</p>
            {Object.entries(byWorkflow).map(([name, runs]) => {
              const last10 = runs.slice(0, 10).reverse()
              return (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-32 truncate flex-shrink-0">{name}</span>
                  <div className="flex gap-0.5">
                    {last10.map((r) => (
                      <div
                        key={r.id}
                        title={`${new Date(r.startTime).toLocaleDateString()} – ${r.status}`}
                        className={`w-3 h-5 rounded-sm ${r.status === "success" ? "bg-green-400" : "bg-red-400"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{Math.round((last10.filter(r => r.status === "success").length / last10.length) * 100)}%</span>
                </div>
              )
            })}
          </div>
        )}

        {/* History list */}
        <ScrollArea className="flex-1 min-h-0">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No runs yet</p>
            </div>
          ) : (
            <div className="space-y-1.5 pr-2">
              {history.map((record) => (
                <div key={record.id} className={`rounded-lg border ${record.status === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                  {/* Summary row */}
                  <div
                    className="flex items-center gap-2 p-2.5 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                  >
                    {record.status === "success"
                      ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">{record.workflowName}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(record.startTime).toLocaleString()}</span>
                        <span>·</span>
                        <span>{record.passedSteps}/{record.totalSteps} steps</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{record.duration}ms</span>
                      </div>
                    </div>
                    {record.failureScreenshot && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 px-1.5 text-xs flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); setScreenshotId(record.id) }}
                      >
                        <Image className="w-3 h-3 mr-1" />
                        Screenshot
                      </Button>
                    )}
                    {expandedId === record.id ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                  </div>

                  {/* Expanded: error + step results */}
                  {expandedId === record.id && (
                    <div className="px-3 pb-3 space-y-2 border-t border-current border-opacity-10">
                      {record.error && (
                        <p className="text-xs text-red-700 bg-red-100 rounded p-2 mt-2">{record.error}</p>
                      )}
                      {record.blockResults.length > 0 && (
                        <div className="space-y-1">
                          {record.blockResults.map((br, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs min-w-0">
                              {br.status === "success"
                                ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                : <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                              }
                              <span className="text-foreground flex-1 truncate">{br.blockId}</span>
                              <span className="text-muted-foreground">{br.duration}ms</span>
                              {br.error && <span className="text-red-600 truncate max-w-[200px]">{br.error}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {history.length > 0 && (
          <div className="flex justify-end pt-2 border-t flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onClear} className="text-red-600 hover:text-red-700">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear History
            </Button>
          </div>
        )}

        {/* Screenshot modal */}
        {screenshotId && (() => {
          const record = history.find(r => r.id === screenshotId)
          return record?.failureScreenshot ? (
            <Dialog open onOpenChange={() => setScreenshotId(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Failure Screenshot – {record.workflowName}</DialogTitle></DialogHeader>
                <img src={`data:image/png;base64,${record.failureScreenshot}`} alt="failure screenshot" className="w-full rounded border" />
              </DialogContent>
            </Dialog>
          ) : null
        })()}
      </DialogContent>
    </Dialog>
  )
}
