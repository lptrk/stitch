"use client"

import { useState, useCallback, useEffect, useRef } from "react"

interface UseResizableOptions {
  initial: number
  min: number
  max: number
  direction: "left" | "right" // left = dragging right handle of left panel, right = dragging left handle of right panel
  storageKey?: string
}

export function useResizable({ initial, min, max, direction, storageKey }: UseResizableOptions) {
  const [size, setSize] = useState(() => {
    if (!storageKey) return initial
    try {
      const v = localStorage.getItem(storageKey)
      return v ? Number(v) : initial
    } catch {
      return initial
    }
  })
  const dragging = useRef(false)
  const startX = useRef(0)
  const startSize = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startSize.current = size
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [size])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = direction === "left"
        ? e.clientX - startX.current
        : startX.current - e.clientX
      const next = Math.min(max, Math.max(min, startSize.current + delta))
      setSize(next)
      if (storageKey) {
        try { localStorage.setItem(storageKey, String(next)) } catch {}
      }
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [direction, min, max, storageKey])

  return { size, onMouseDown }
}
