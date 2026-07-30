"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import type { TestBlockDefinition } from "@/types/workflow"
import { Edit, Code, Save, X, Copy, Download, Trash2, Plus, Tag, CheckCircle2 } from "lucide-react"

interface BlockInspectorDialogProps {
  block: TestBlockDefinition | null
  open: boolean
  onClose: () => void
  onSave?: (updatedBlock: TestBlockDefinition) => void
  onDelete?: (blockId: string) => void
  onDuplicate?: (block: TestBlockDefinition) => void
  readonly?: boolean
}

const CATEGORIES = [
  { id: "Navigation", name: "Navigation" },
  { id: "Interactions", name: "Interactions" },
  { id: "Form Inputs", name: "Form Inputs" },
  { id: "Assertions", name: "Assertions" },
  { id: "Waiting", name: "Waiting" },
  { id: "Screenshots", name: "Screenshots" },
  { id: "Data Extraction", name: "Data Extraction" },
  { id: "Network & API", name: "Network & API" },
  { id: "Authentication", name: "Authentication" },
  { id: "custom", name: "Custom" },
]

export function BlockInspectorDialog({ block, open, onClose, onSave, onDelete, onDuplicate, readonly = false }: BlockInspectorDialogProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<TestBlockDefinition | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (block) { setDraft({ ...block }); setEditing(false) }
  }, [block])

  if (!block || !draft) return null

  const isCustom = !!block.isCustom
  const canEdit = !readonly && isCustom && !!onSave

  const save = () => {
    if (!draft.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return }
    onSave?.(draft)
    setEditing(false)
    toast({ title: "Block saved" })
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const exportBlock = () => {
    const data = JSON.stringify({ version: "1.0", blocks: [{ ...block, iconName: block.icon?.name }] }, null, 2)
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }))
    a.download = `${block.name.toLowerCase().replace(/\s+/g, "-")}.json`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              {block.name}
              {isCustom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
            </DialogTitle>
            <div className="flex items-center gap-1.5 mr-6">
              {canEdit && !editing && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditing(true)}>
                  <Edit className="w-3 h-3" /> Edit
                </Button>
              )}
              {editing && (
                <>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setDraft({ ...block }); setEditing(false) }}>
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={save}>
                    <Save className="w-3 h-3" /> Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              {editing ? (
                <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className="text-sm resize-none" />
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{block.description || <span className="text-muted-foreground italic">No description</span>}</p>
              )}
            </div>

            <Separator />

            {/* Parameters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Parameters</Label>
                {editing && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2" onClick={() => setDraft({ ...draft, parameters: [...(draft.parameters || []), { id: `param_${Date.now()}`, name: "", type: "text", required: false, placeholder: "" }] })}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                )}
              </div>
              {(!draft.parameters || draft.parameters.length === 0) ? (
                <p className="text-xs text-muted-foreground italic">No parameters</p>
              ) : (
                <div className="space-y-2">
                  {draft.parameters.map((param, i) => (
                    <div key={param.id} className="flex items-start gap-2 p-2.5 bg-muted rounded-md border border-border/60">
                      {editing ? (
                        <>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <Input value={param.name} onChange={(e) => { const p = [...draft.parameters!]; p[i] = { ...p[i], name: e.target.value }; setDraft({ ...draft, parameters: p }) }} placeholder="Name" className="h-7 text-xs" />
                            <Select value={param.type} onValueChange={(v) => { const p = [...draft.parameters!]; p[i] = { ...p[i], type: v as any }; setDraft({ ...draft, parameters: p }) }}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["text","number","selector","boolean","textarea","select"].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input value={param.placeholder || ""} onChange={(e) => { const p = [...draft.parameters!]; p[i] = { ...p[i], placeholder: e.target.value }; setDraft({ ...draft, parameters: p }) }} placeholder="Placeholder" className="h-7 text-xs" />
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <input type="checkbox" checked={!!param.required} onChange={(e) => { const p = [...draft.parameters!]; p[i] = { ...p[i], required: e.target.checked }; setDraft({ ...draft, parameters: p }) }} className="rounded" />
                              Required
                            </label>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/70 hover:text-red-500 flex-shrink-0" onClick={() => setDraft({ ...draft, parameters: draft.parameters!.filter((_, j) => j !== i) })}>
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">{param.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{param.type}</Badge>
                            {param.required && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">required</Badge>}
                          </div>
                          {param.placeholder && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{param.placeholder}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom code */}
            {isCustom && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Code className="w-3 h-3" /> Code
                    </Label>
                    <button onClick={() => copy(draft.customCode || "")} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {editing ? (
                    <>
                      <Textarea
                        value={draft.customCode || ""}
                        onChange={(e) => setDraft({ ...draft, customCode: e.target.value })}
                        className="font-mono text-xs min-h-[200px] resize-y bg-gray-950 text-gray-100 border-gray-800"
                        placeholder="// Playwright code&#10;await page.click(parameters.selector)"
                      />
                      <p className="text-[10px] text-muted-foreground">Available: <code>page</code>, <code>parameters</code>, <code>console</code></p>
                    </>
                  ) : (
                    <pre className="text-xs font-mono bg-gray-950 text-gray-100 rounded-md p-3 overflow-x-auto max-h-64 leading-relaxed">
                      <code>{draft.customCode || "// No code defined"}</code>
                    </pre>
                  )}
                </div>
              </>
            )}

            {/* Meta */}
            <Separator />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <code className="text-muted-foreground font-mono">{block.id}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="text-muted-foreground">{isCustom ? "Custom" : "Built-in"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Function</span>
                <code className="text-muted-foreground font-mono">{block.playwrightFunction}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="text-muted-foreground">{(block as any).category || "—"}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {onDuplicate && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { onDuplicate(block); onClose() }}>
                <Copy className="w-3 h-3" /> Duplicate
              </Button>
            )}
            {isCustom && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={exportBlock}>
                <Download className="w-3 h-3" /> Export
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {onDelete && isCustom && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:border-red-300" onClick={() => { onDelete(block.id); onClose() }}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
