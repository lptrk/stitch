"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"

export interface SelectorPickResult {
  selector: string
  selectorInfo: {
    count: number
    tag?: string
    text?: string
    type?: string
    name?: string
    testId?: string
  }
}

export interface SelectorValidateResult {
  count: number
  error?: string
}

interface ExtensionPickerContextValue {
  extensionAvailable: boolean
  picking: string | null
  pick: (paramId: string, fieldLabel: string, baseUrl?: string) => Promise<SelectorPickResult | null>
  cancelPick: (paramId: string) => void
  validateSelector: (selector: string, baseUrl?: string) => Promise<SelectorValidateResult | null>
}

const ExtensionPickerContext = createContext<ExtensionPickerContextValue>({
  extensionAvailable: false,
  picking: null,
  pick: async () => null,
  cancelPick: () => {},
  validateSelector: async () => null,
})

export function ExtensionPickerProvider({ children }: { children: ReactNode }) {
  const [extensionAvailable, setExtensionAvailable] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)
  const callbacksRef = useRef<Map<string, (result: SelectorPickResult | null) => void>>(new Map())
  const validateCallbacksRef = useRef<Map<string, (result: SelectorValidateResult | null) => void>>(new Map())
  const validateReqCounter = useRef(0)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.origin !== window.location.origin) return
      const msg = event.data
      if (!msg?.type) return

      if (msg.type === "STITCH_EXTENSION_PONG") {
        setExtensionAvailable(true)
        return
      }

      if (msg.type === "SELECTOR_PICKED") {
        console.log("[Stitch Picker] SELECTOR_PICKED", msg.paramId, msg.selector)
        console.log("[Stitch Picker] pending callbacks:", [...callbacksRef.current.keys()])
        setPicking(null)

        // Only deliver to the callback registered for this exact paramId — silently
        // grabbing "the first pending callback" as a fallback could deliver a selector
        // pick to the wrong field if two picks ever overlap.
        const cb = callbacksRef.current.get(msg.paramId)
        if (!cb) {
          console.warn("[Stitch Picker] SELECTOR_PICKED for unknown paramId, ignoring:", msg.paramId)
          return
        }
        callbacksRef.current.delete(msg.paramId)
        cb({ selector: msg.selector, selectorInfo: msg.selectorInfo || {} })
        return
      }

      if (msg.type === "PICK_CANCELLED" || msg.type === "PICK_ERROR") {
        setPicking(null)
        const cb = callbacksRef.current.get(msg.paramId)
        if (cb) {
          callbacksRef.current.delete(msg.paramId)
          cb(null)
        }
        return
      }

      if (msg.type === "VALIDATE_SELECTOR_RESULT") {
        const cb = validateCallbacksRef.current.get(msg.requestId)
        if (cb) {
          validateCallbacksRef.current.delete(msg.requestId)
          cb({ count: msg.count ?? 0, error: msg.error })
        }
        return
      }
    }

    window.addEventListener("message", handleMessage)
    window.postMessage({ type: "STITCH_EXTENSION_PING" }, window.location.origin)
    const interval = setInterval(() => window.postMessage({ type: "STITCH_EXTENSION_PING" }, window.location.origin), 3000)

    return () => {
      window.removeEventListener("message", handleMessage)
      clearInterval(interval)
    }
  }, [])

  const pick = useCallback((paramId: string, fieldLabel: string, baseUrl?: string): Promise<SelectorPickResult | null> => {
    return new Promise((resolve) => {
      callbacksRef.current.set(paramId, resolve)
      setPicking(paramId)
      window.postMessage({ type: "STITCH_START_PICK", paramId, fieldLabel, baseUrl }, window.location.origin)
    })
  }, [])

  const cancelPick = useCallback((paramId: string) => {
    window.postMessage({ type: "STITCH_CANCEL_PICK", paramId }, window.location.origin)
    setPicking(null)
    callbacksRef.current.get(paramId)?.(null)
    callbacksRef.current.delete(paramId)
  }, [])

  // Validates a selector (typed by hand, or edited after a pick) against the live
  // app tab without requiring the user to go through the picker UI again.
  const validateSelector = useCallback((selector: string, baseUrl?: string): Promise<SelectorValidateResult | null> => {
    return new Promise((resolve) => {
      if (!selector.trim()) { resolve(null); return }
      const requestId = `v${Date.now()}_${validateReqCounter.current++}`
      const timeout = setTimeout(() => {
        validateCallbacksRef.current.delete(requestId)
        resolve(null)
      }, 4000)
      validateCallbacksRef.current.set(requestId, (result) => {
        clearTimeout(timeout)
        resolve(result)
      })
      window.postMessage({ type: "STITCH_VALIDATE_SELECTOR", requestId, selector, baseUrl }, window.location.origin)
    })
  }, [])

  return (
    <ExtensionPickerContext.Provider value={{ extensionAvailable, picking, pick, cancelPick, validateSelector }}>
      {children}
    </ExtensionPickerContext.Provider>
  )
}

export function useExtensionPicker() {
  return useContext(ExtensionPickerContext)
}
