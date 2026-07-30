"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

const SHORTCUTS = [
  {
    group: "Global",
    items: [
      { keys: ["⌘K", "Ctrl+K"], desc: "Add block" },
      { keys: ["⌘↵", "Ctrl+Enter"], desc: "Run workflow" },
      { keys: ["⌘Z", "Ctrl+Z"], desc: "Undo" },
      { keys: ["⌘⇧Z", "Ctrl+Y"], desc: "Redo" },
      { keys: ["?"], desc: "Show shortcuts" },
      { keys: ["Esc"], desc: "Deselect / close" },
    ],
  },
  {
    group: "Canvas",
    items: [
      { keys: ["↑↓"], desc: "Navigate steps" },
      { keys: ["⌘↑↓", "Ctrl+↑↓"], desc: "Move step" },
      { keys: ["D"], desc: "Duplicate step" },
      { keys: ["⌫"], desc: "Delete step" },
    ],
  },
  {
    group: "Parameter fields",
    items: [
      { keys: ["Tab"], desc: "Next field" },
      { keys: ["⇧Tab"], desc: "Previous field" },
      { keys: ["@"], desc: "Start element picker" },
      { keys: ["/"], desc: "Insert env variable" },
      { keys: ["⌘↵", "Ctrl+Enter"], desc: "Run from field" },
    ],
  },
]

export function ShortcutCheatsheet() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable
      if (e.key === "?" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative bg-card rounded-xl shadow-2xl border border-border w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
          <span className="text-sm font-semibold text-foreground">Keyboard Shortcuts</span>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-x divide-border">
          {SHORTCUTS.map((group) => (
            <div key={group.group} className="px-4 py-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group.group}</p>
              {group.items.map((item) => (
                <div key={item.desc} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{item.desc}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-0.5">
                        {i > 0 && <span className="text-[9px] text-muted-foreground/70 mx-0.5">/</span>}
                        <kbd className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono text-muted-foreground whitespace-nowrap">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="px-5 py-2.5 border-t border-border/60 bg-muted text-center">
          <span className="text-[10px] text-muted-foreground">Press <kbd className="bg-card border border-border rounded px-1 font-mono">?</kbd> to toggle</span>
        </div>
      </div>
    </div>
  )
}
