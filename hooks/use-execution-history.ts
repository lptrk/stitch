"use client"

import { useState, useCallback, useEffect } from "react"

export interface ExecutionRecord {
  id: string
  workflowName: string
  workflowId: string
  status: "success" | "failed"
  startTime: string
  endTime: string
  duration: number
  totalSteps: number
  passedSteps: number
  failedSteps: number
  error?: string
  failureScreenshot?: string // base64 PNG
  blockResults: Array<{
    blockId: string
    status: "success" | "failed"
    duration: number
    error?: string
  }>
}

const STORAGE_KEY = "stitch-execution-history"
const MAX_RECORDS = 100

export function useExecutionHistory() {
  const [history, setHistory] = useState<ExecutionRecord[]>([])

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setHistory(JSON.parse(stored))
      }
    } catch (e) {
      console.warn("Failed to load execution history:", e)
    }
  }, [])

  const save = useCallback((records: ExecutionRecord[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (e) {
      console.warn("Failed to save execution history:", e)
    }
  }, [])

  const addRecord = useCallback(
    (record: Omit<ExecutionRecord, "id">) => {
      const newRecord: ExecutionRecord = { ...record, id: `exec-${Date.now()}` }
      setHistory((prev) => {
        const updated = [newRecord, ...prev].slice(0, MAX_RECORDS)
        save(updated)
        return updated
      })
      return newRecord
    },
    [save],
  )

  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.warn("Failed to clear execution history:", e)
    }
  }, [])

  const getStats = useCallback(() => {
    if (history.length === 0) return null
    const total = history.length
    const passed = history.filter((r) => r.status === "success").length
    const failed = history.filter((r) => r.status === "failed").length
    const avgDuration = Math.round(history.reduce((sum, r) => sum + r.duration, 0) / total)
    const successRate = Math.round((passed / total) * 100)
    return { total, passed, failed, avgDuration, successRate }
  }, [history])

  return { history, addRecord, clearHistory, getStats }
}
