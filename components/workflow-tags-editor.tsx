"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X, Plus, Tag } from "lucide-react"
import { WORKFLOW_TAG_COLORS, type WorkflowTag } from "@/types/workflow"

const PRESET_TAGS: WorkflowTag[] = ["Smoke", "Regression", "Critical", "WIP", "Flaky"]

interface WorkflowTagsEditorProps {
  tags: WorkflowTag[]
  onChange: (tags: WorkflowTag[]) => void
  readonly?: boolean
}

export function WorkflowTagsEditor({ tags, onChange, readonly = false }: WorkflowTagsEditorProps) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState("")

  const add = (tag: WorkflowTag) => {
    if (!tags.includes(tag)) onChange([...tags, tag])
  }

  const remove = (tag: WorkflowTag) => onChange(tags.filter((t) => t !== tag))

  const addCustom = () => {
    const t = custom.trim()
    if (t && !tags.includes(t)) { onChange([...tags, t]); setCustom("") }
  }

  const tagColor = (tag: string) =>
    WORKFLOW_TAG_COLORS[tag] || "bg-muted text-foreground border-border"

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className={`text-xs px-1.5 py-0 border ${tagColor(tag)} flex items-center gap-1`}>
          {tag}
          {!readonly && (
            <button onClick={() => remove(tag)} className="ml-0.5 hover:opacity-70">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </Badge>
      ))}

      {!readonly && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Tag className="w-3 h-3 mr-1" />
              Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2 space-y-2" align="start">
            <p className="text-xs font-medium text-muted-foreground">Preset tags</p>
            <div className="flex flex-wrap gap-1">
              {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => { add(tag); setOpen(false) }}
                  className={`text-xs px-2 py-0.5 rounded-full border ${tagColor(tag)} hover:opacity-80`}
                >
                  {tag}
                </button>
              ))}
              {PRESET_TAGS.every((t) => tags.includes(t)) && (
                <span className="text-xs text-muted-foreground">All preset tags added</span>
              )}
            </div>
            <div className="flex gap-1">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Custom tag…"
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
              />
              <Button size="sm" className="h-7 px-2" onClick={addCustom} disabled={!custom.trim()}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
