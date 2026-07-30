"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { TestBlockDefinition } from "@/types/workflow"
import { SafeIcon } from "@/components/safe-icon"
import { Search, CornerDownLeft, Hash } from "lucide-react"

interface CommandPaletteProps {
  blocks: TestBlockDefinition[]
  onSelect: (block: TestBlockDefinition) => void
}

const CATEGORY_ORDER = [
  "Navigation", "Interactions", "Form Inputs", "Assertions",
  "Waiting", "Screenshots", "Data Extraction",
  "Network & API", "Authentication", "Browser Context", "File Operations", "Workflow Control",
]

export function CommandPalette({ blocks, onSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const filtered = query.trim()
    ? blocks.filter(
        (b) =>
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.description.toLowerCase().includes(query.toLowerCase()) ||
          (b as any).category?.toLowerCase().includes(query.toLowerCase()),
      )
    : blocks

  // Group by category, respecting CATEGORY_ORDER
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = filtered.filter((b) => (b as any).category === cat)
    if (items.length > 0) acc.push({ category: cat, items })
    return acc
  }, [] as { category: string; items: TestBlockDefinition[] }[])

  // Flat list for keyboard nav
  const flat = grouped.flatMap((g) => g.items)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flat.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter" && flat[selectedIndex]) {
        e.preventDefault()
        onSelect(flat[selectedIndex])
        setOpen(false)
      }
    },
    [flat, selectedIndex, onSelect],
  )

  // Reset selected index when query changes
  useEffect(() => setSelectedIndex(0), [query])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[60vh]">

        {/* Search input */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border/60">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search blocks…"
            className="flex-1 text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 font-mono flex-shrink-0">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {flat.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No blocks match &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="py-1.5">
              {grouped.map(({ category, items }) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-1.5 px-3.5 pt-3 pb-1">
                    <Hash className="w-3 h-3 text-muted-foreground/70" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {category}
                    </span>
                  </div>

                  {/* Items */}
                  {items.map((block) => {
                    const idx = flat.indexOf(block)
                    const isSelected = idx === selectedIndex
                    return (
                      <div
                        key={block.id}
                        data-idx={idx}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onMouseDown={() => { onSelect(block); setOpen(false) }}
                        className={`flex items-center gap-3 px-3.5 py-2 cursor-pointer transition-colors ${
                          isSelected ? "bg-accent" : "hover:bg-accent"
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${block.color}`}>
                          <SafeIcon icon={block.icon} className="w-3.5 h-3.5 text-white" />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {block.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{block.description}</p>
                        </div>

                        {/* Enter hint on selected */}
                        {isSelected && (
                          <div className="flex items-center gap-1 text-[10px] text-primary/70 flex-shrink-0">
                            <CornerDownLeft className="w-3 h-3" />
                            <span>add</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-3.5 py-2 border-t border-border/60 bg-muted">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <kbd className="bg-card border border-border rounded px-1 font-mono">↑↓</kbd> navigate
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <kbd className="bg-card border border-border rounded px-1 font-mono">↵</kbd> add to workflow
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
            <kbd className="bg-card border border-border rounded px-1 font-mono">⌘K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  )
}
