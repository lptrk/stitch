"use client"

import { useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Info, Globe, Upload, Download, History, FileCode } from "lucide-react"
import { BaseUrlInput } from "@/components/base-url-input"
import { GitlabSettingsSection } from "@/components/gitlab-settings-section"
import { ExecutionHistory } from "@/components/execution-history"
import type { EnvVar } from "@/hooks/use-env-vars"
import type { Workflow, WorkflowFolder } from "@/types/workflow"
import type { ExecutionRecord } from "@/hooks/use-execution-history"

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  // Base URL
  baseUrl: string
  onBaseUrlChange: (url: string) => void
  // Env Vars
  envVars: EnvVar[]
  onAddEnvVar: () => void
  onUpdateEnvVar: (id: string, field: "name" | "value", value: string) => void
  onRemoveEnvVar: (id: string) => void
  // Workflows Save/Load
  workflows: Workflow[]
  folders: WorkflowFolder[]
  currentWorkflowId: string
  onExportWorkflows: () => void
  onImportWorkflows: (e: React.ChangeEvent<HTMLInputElement>) => void
  onImportSpec: (e: React.ChangeEvent<HTMLInputElement>) => void
  // History
  history: ExecutionRecord[]
  stats: { total: number; passed: number; failed: number; avgDuration: number; successRate: number } | null
  onClearHistory: () => void
}

export function SettingsPanel({
  open, onClose,
  baseUrl, onBaseUrlChange,
  envVars, onAddEnvVar, onUpdateEnvVar, onRemoveEnvVar,
  workflows, folders, currentWorkflowId, onExportWorkflows, onImportWorkflows, onImportSpec,
  history, stats, onClearHistory,
}: SettingsPanelProps) {
  const importRef = useRef<HTMLInputElement>(null)
  const importSpecRef = useRef<HTMLInputElement>(null)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b">
          <SheetTitle className="text-sm font-semibold">Settings</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-6">

            {/* Base URL */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Base URL</Label>
              </div>
              <BaseUrlInput
                value={baseUrl}
                onChange={onBaseUrlChange}
                showIcon={false}
                placeholder="https://your-app.intern"
                className="h-8 text-sm w-full"
              />
              <p className="text-xs text-muted-foreground">
                The root URL all relative paths are resolved against when running workflows.
              </p>
            </section>

            <Separator />

            <GitlabSettingsSection />

            <Separator />

            {/* Workflows */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workflows</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onExportWorkflows}>
                  <Upload className="w-3.5 h-3.5" />
                  Save to file
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => importRef.current?.click()}>
                  <Download className="w-3.5 h-3.5" />
                  Load from file
                </Button>
                <input ref={importRef} type="file" accept=".json" className="hidden" onChange={onImportWorkflows} />
              </div>
              <p className="text-xs text-muted-foreground">
                {Array.isArray(workflows) ? workflows.length : 0} workflow{(!Array.isArray(workflows) || workflows.length !== 1) ? "s" : ""}
                {Array.isArray(folders) && folders.length > 0 ? `, ${folders.length} folder${folders.length !== 1 ? "s" : ""}` : ""} loaded.
                {" "}Folders and grouping are preserved on export.
              </p>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 w-full" onClick={() => importSpecRef.current?.click()}>
                <FileCode className="w-3.5 h-3.5" />
                Import Playwright spec
              </Button>
              <input ref={importSpecRef} type="file" accept=".ts,.js" className="hidden" onChange={onImportSpec} />
              <p className="text-xs text-muted-foreground">
                Best-effort: recognized steps become real blocks, everything else is kept as code. Added as new workflow(s) alongside your existing ones.
              </p>
            </section>

            <Separator />

            {/* Env Vars */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Environment Variables</Label>
                <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1" onClick={onAddEnvVar}>
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary/70" />
                Type <kbd className="bg-muted border border-border px-1 rounded font-mono text-[10px]">/</kbd> in any parameter field to insert a variable. Values are stored locally in your browser only.
              </p>

              {envVars.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
                  <p className="text-xs text-muted-foreground">No variables defined yet</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary h-7" onClick={onAddEnvVar}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add first variable
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_24px] gap-2 px-1">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Name</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Value</span>
                  </div>
                  {envVars.map((v) => (
                    <div key={v.id} className="grid grid-cols-[1fr_1fr_24px] gap-2 items-center">
                      <Input
                        value={v.name}
                        onChange={(e) => onUpdateEnvVar(v.id, "name", e.target.value.replace(/\s/g, "_").toUpperCase())}
                        placeholder="API_URL"
                        className="h-7 text-xs font-mono"
                      />
                      <Input
                        value={v.value}
                        onChange={(e) => onUpdateEnvVar(v.id, "value", e.target.value)}
                        placeholder="value"
                        className="h-7 text-xs"
                        type="password"
                      />
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-red-500" onClick={() => onRemoveEnvVar(v.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {envVars.filter((v) => v.name).length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {envVars.filter((v) => v.name).map((v) => (
                        <code
                          key={v.id}
                          className="text-[10px] bg-accent border border-primary/20 text-primary px-1.5 py-0.5 rounded font-mono cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => navigator.clipboard.writeText(`{{${v.name}}}`)}
                          title="Click to copy"
                        >
                          /{v.name}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <Separator />

            {/* Execution History */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Run History
                </Label>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No runs yet</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Last run: <span className="font-medium text-foreground">{history[0].workflowName}</span>{" "}
                  {history[0].status === "success" ? "passed" : "failed"} ·{" "}
                  {new Date(history[0].startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              <ExecutionHistory history={history} stats={stats} onClear={onClearHistory} />
            </section>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
