"use client"

import { useState, useCallback } from "react"
import type { WorkflowItem } from "@/types/workflow"

interface HistoryState {
  items: WorkflowItem[]
  timestamp: number
}

const MAX_HISTORY = 50

export function useWorkflowHistory(currentItems: WorkflowItem[], onRestore: (items: WorkflowItem[]) => void) {
  const [past, setPast] = useState<HistoryState[]>([])
  const [future, setFuture] = useState<HistoryState[]>([])
  const [lastSnapshot, setLastSnapshot] = useState<string>("")

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  // Take a snapshot when items change (debounced by content comparison)
  const pushState = useCallback(
    (items: WorkflowItem[]) => {
      const snapshot = JSON.stringify(items.map((i) => ({ id: i.id, blockId: i.blockId, parameters: i.parameters })))
      if (snapshot === lastSnapshot) return

      setPast((prev) => {
        const newPast = [...prev, { items: JSON.parse(JSON.stringify(currentItems)), timestamp: Date.now() }]
        return newPast.slice(-MAX_HISTORY)
      })
      setFuture([])
      setLastSnapshot(snapshot)
    },
    [currentItems, lastSnapshot],
  )

  const undo = useCallback(() => {
    if (past.length === 0) return

    const previous = past[past.length - 1]
    setPast((prev) => prev.slice(0, -1))
    setFuture((prev) => [...prev, { items: JSON.parse(JSON.stringify(currentItems)), timestamp: Date.now() }])
    setLastSnapshot(JSON.stringify(previous.items.map((i) => ({ id: i.id, blockId: i.blockId, parameters: i.parameters }))))
    onRestore(previous.items)
  }, [past, currentItems, onRestore])

  const redo = useCallback(() => {
    if (future.length === 0) return

    const next = future[future.length - 1]
    setFuture((prev) => prev.slice(0, -1))
    setPast((prev) => [...prev, { items: JSON.parse(JSON.stringify(currentItems)), timestamp: Date.now() }])
    setLastSnapshot(JSON.stringify(next.items.map((i) => ({ id: i.id, blockId: i.blockId, parameters: i.parameters }))))
    onRestore(next.items)
  }, [future, currentItems, onRestore])

  // Keyboard shortcuts for undo/redo are owned by the single global keydown
  // handler in app/page.tsx — registering a second listener here caused
  // Cmd+Z to fire twice per press and skip history entries.

  return { pushState, undo, redo, canUndo, canRedo, historyLength: past.length }
}
