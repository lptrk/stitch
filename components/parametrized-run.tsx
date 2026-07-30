"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, Play, FileText, X, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import type { Workflow, WorkflowConfig, DataRow } from "@/types/workflow"
import { useToast } from "@/hooks/use-toast"

interface ParametrizedRunProps {
  workflow: Workflow | undefined
  baseUrl: string
  isRunning: boolean
  onRunWorkflow: (config: WorkflowConfig) => Promise<void>
}

function parseCSV(text: string): { headers: string[]; rows: DataRow[] } {
  const lines = text.trim().split("\n").filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))
  })
  return { headers, rows }
}

// Find all {{placeholder}} in workflow parameters
function extractPlaceholders(workflow: Workflow): string[] {
  const placeholders = new Set<string>()
  workflow.items.forEach((item) => {
    Object.values(item.parameters || {}).forEach((val) => {
      const matches = val.match(/\{\{(\w+)\}\}/g)
      matches?.forEach((m) => placeholders.add(m.replace(/[{}]/g, "")))
    })
  })
  return [...placeholders]
}

export function ParametrizedRun({ workflow, baseUrl, isRunning, onRunWorkflow }: ParametrizedRunProps) {
  const [open, setOpen] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<DataRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Array<{ row: DataRow; status: "pending" | "running" | "success" | "failed" }>>([])
  const { toast } = useToast()

  const placeholders = workflow ? extractPlaceholders(workflow) : []

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers: h, rows: r } = parseCSV(ev.target?.result as string)
      setHeaders(h)
      setRows(r)
      // Auto-map: if placeholder name matches column name exactly
      const autoMap: Record<string, string> = {}
      placeholders.forEach((p) => { if (h.includes(p)) autoMap[p] = p })
      setMapping(autoMap)
      setResults(r.map((row) => ({ row, status: "pending" })))
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [placeholders])

  const substituteRow = (row: DataRow): Workflow => {
    if (!workflow) return workflow!
    return {
      ...workflow,
      items: workflow.items.map((item) => ({
        ...item,
        parameters: Object.fromEntries(
          Object.entries(item.parameters || {}).map(([k, v]) => [
            k,
            v.replace(/\{\{(\w+)\}\}/g, (_, name) => row[mapping[name] || name] ?? v),
          ])
        ),
      })),
    }
  }

  const handleRun = async () => {
    if (!workflow || rows.length === 0) return
    setRunning(true)
    const newResults = rows.map((row) => ({ row, status: "pending" as const }))
    setResults(newResults)

    for (let i = 0; i < rows.length; i++) {
      setResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "running" } : r))
      const substituted = substituteRow(rows[i])
      const config: WorkflowConfig = {
        baseUrl,
        workflows: { [workflow.id]: { name: substituted.name, workflow: substituted.items.map((item) => ({ block: item.blockId, parameters: item.parameters })) } },
        mainWorkflow: workflow.id,
      }
      try {
        await onRunWorkflow(config)
        setResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "success" } : r))
      } catch {
        setResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "failed" } : r))
      }
    }
    setRunning(false)
    const passed = results.filter(r => r.status === "success").length
    toast({ title: `Parametrized run complete`, description: `${passed}/${rows.length} rows passed` })
  }

  const unmapped = placeholders.filter((p) => !mapping[p])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={!workflow || workflow.items.length === 0}>
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          Run with data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Run with data – {workflow?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-auto">
          {/* Step 1: placeholders */}
          {placeholders.length === 0 ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              No placeholders found. Use {`{{variableName}}`} in your step parameters to make them data-driven.
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Placeholders in this workflow:</p>
              <div className="flex flex-wrap gap-1.5">
                {placeholders.map((p) => (
                  <Badge key={p} variant="outline" className="font-mono text-xs">{`{{${p}}}`}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: CSV upload */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Upload CSV with test data</p>
            <label className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${rows.length > 0 ? "border-green-300 bg-green-50" : "border-border hover:border-primary/50"}`}>
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {rows.length > 0 ? `${rows.length} rows loaded from CSV` : "Click to upload .csv file"}
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              {rows.length > 0 && <button onClick={(e) => { e.preventDefault(); setRows([]); setHeaders([]); setResults([]) }}><X className="w-4 h-4 text-muted-foreground hover:text-red-500" /></button>}
            </label>
            {headers.length > 0 && (
              <p className="text-xs text-muted-foreground">Columns: {headers.join(", ")}</p>
            )}
          </div>

          {/* Step 3: column mapping */}
          {headers.length > 0 && placeholders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Map placeholders to columns</p>
              <div className="space-y-1.5">
                {placeholders.map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded w-32 flex-shrink-0">{`{{${p}}}`}</code>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Select value={mapping[p] || ""} onValueChange={(v) => setMapping((prev) => ({ ...prev, [p]: v }))}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="Select column…" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {unmapped.length > 0 && (
                <p className="text-xs text-yellow-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {unmapped.length} placeholder(s) not mapped: {unmapped.join(", ")}</p>
              )}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview ({rows.length} rows)</p>
              <ScrollArea className="max-h-48 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 text-xs">#</TableHead>
                      {headers.map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}
                      {results.length > 0 && <TableHead className="text-xs">Status</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        {headers.map((h) => <TableCell key={h} className="text-xs">{row[h]}</TableCell>)}
                        {results[i] && (
                          <TableCell>
                            {results[i].status === "pending" && <span className="text-xs text-muted-foreground">–</span>}
                            {results[i].status === "running" && <span className="text-xs text-primary animate-pulse">Running…</span>}
                            {results[i].status === "success" && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Passed</span>}
                            {results[i].status === "failed" && <span className="text-xs text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRun}
            disabled={rows.length === 0 || running || isRunning || unmapped.length > 0}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            {running ? `Running row ${results.filter(r => r.status !== "pending").length}/${rows.length}…` : `Run ${rows.length} rows`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
