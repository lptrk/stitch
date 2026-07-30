"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle, Crosshair, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import type { TestBlockParameter, Workflow } from "@/types/workflow"
import { useExtensionPicker } from "@/hooks/use-extension-picker"
import type { EnvVar } from "@/hooks/use-env-vars"
import { wouldCreateCycle } from "@/lib/workflow-graph"

const SELECTOR_HELP = `A selector identifies which element on the page to interact with.

Examples:
  button              → any button
  #submit-btn         → element with id="submit-btn"
  .login-form         → element with class="login-form"
  input[name='email'] → email input field
  [data-testid='ok']  → element with data-testid attribute

Tip: Type @ to instantly start the element picker, or click the crosshair button.`

interface BlockParametersProps {
  parameters: TestBlockParameter[]
  values: Record<string, string>
  workflows?: Workflow[]
  currentWorkflowId?: string
  baseUrl?: string
  envVars?: EnvVar[]
  onChange: (parameterId: string, value: string) => void
}

export function BlockParameters({
  parameters,
  values,
  workflows = [],
  currentWorkflowId,
  baseUrl,
  envVars = [],
  onChange,
}: BlockParametersProps) {
  if (!parameters || parameters.length === 0) return null

  const { extensionAvailable, picking, pick, validateSelector } = useExtensionPicker()
  const [matchInfo, setMatchInfo] = useState<Record<string, { count: number; ok: boolean; error?: string } | null>>({})
  const [slashMenu, setSlashMenu] = useState<{ paramId: string; query: string } | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({})
  const validateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const latestValueRef = useRef<Record<string, string>>({})

  // Debounced live-validation for manually typed/edited selectors (picked selectors are
  // already validated at pick time). Reuses the same extension round-trip as the picker.
  const scheduleValidate = useCallback((paramId: string, value: string) => {
    latestValueRef.current[paramId] = value
    if (validateTimers.current[paramId]) clearTimeout(validateTimers.current[paramId])
    if (!extensionAvailable || !value.trim()) return
    validateTimers.current[paramId] = setTimeout(async () => {
      const result = await validateSelector(value, baseUrl)
      if (!result || latestValueRef.current[paramId] !== value) return // stale or no answer
      setMatchInfo((prev) => ({
        ...prev,
        [paramId]: { count: result.count, ok: result.count === 1 && !result.error, error: result.error },
      }))
    }, 500)
  }, [extensionAvailable, validateSelector, baseUrl])

  useEffect(() => {
    return () => { Object.values(validateTimers.current).forEach(clearTimeout) }
  }, [])

  const validVars = envVars.filter((v) => v.name)
  const filteredVars = slashMenu
    ? validVars.filter((v) => v.name.toLowerCase().includes(slashMenu.query.toLowerCase()))
    : []

  // Auto-focus first required empty field on mount
  useEffect(() => {
    const first = parameters.find(
      (p) => p.required && !values[p.id] &&
        ["text", "url", "selector", "textarea", "number"].includes(p.type)
    )
    if (first) requestAnimationFrame(() => inputRefs.current[first.id]?.focus())
  // Only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const closeSlashMenu = useCallback(() => { setSlashMenu(null); setSlashIndex(0) }, [])

  const injectVar = useCallback((paramId: string, envVar: EnvVar) => {
    const input = inputRefs.current[paramId]
    if (!input) { closeSlashMenu(); return }
    const current = input.value
    const pos = input.selectionStart ?? current.length
    const slashPos = current.lastIndexOf("/", pos - 1)
    const before = slashPos >= 0 ? current.slice(0, slashPos) : current
    const after = current.slice(pos)
    onChange(paramId, before + envVar.value + after)
    closeSlashMenu()
    requestAnimationFrame(() => {
      input.focus()
      const newPos = before.length + envVar.value.length
      input.setSelectionRange(newPos, newPos)
    })
  }, [onChange, closeSlashMenu])

  const handlePick = useCallback(async (param: TestBlockParameter) => {
    if (!extensionAvailable) { window.open("/extension-install", "_blank"); return }
    const result = await pick(param.id, param.name)
    if (result) {
      onChange(param.id, result.selector)
      setMatchInfo((prev) => ({
        ...prev,
        [param.id]: { count: result.selectorInfo.count, ok: result.selectorInfo.count === 1 },
      }))
    }
  }, [extensionAvailable, pick, onChange])

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent, paramId: string) => {
    if (slashMenu && slashMenu.paramId === paramId) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex((i) => Math.min(i + 1, filteredVars.length - 1)); return }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex((i) => Math.max(i - 1, 0)); return }
      if (e.key === "Enter" && filteredVars[slashIndex]) { e.preventDefault(); injectVar(paramId, filteredVars[slashIndex]); return }
      if (e.key === "Escape") { e.preventDefault(); closeSlashMenu(); return }
    }
  }, [slashMenu, filteredVars, slashIndex, injectVar, closeSlashMenu])

  // Selector fields: @ triggers picker immediately
  const handleSelectorKeyDown = useCallback((e: React.KeyboardEvent, param: TestBlockParameter) => {
    handleTextKeyDown(e, param.id)
    if (e.key === "@" && !picking) {
      e.preventDefault()
      const input = inputRefs.current[param.id]
      if (input) {
        const pos = input.selectionStart ?? 0
        onChange(param.id, input.value.slice(0, pos) + input.value.slice(pos))
      }
      handlePick(param)
    }
  }, [handleTextKeyDown, picking, onChange, handlePick])

  const handleTextChange = useCallback((paramId: string, value: string, inputEl: HTMLInputElement | HTMLTextAreaElement | null) => {
    onChange(paramId, value)
    if (!inputEl || validVars.length === 0) return
    const pos = inputEl.selectionStart ?? value.length
    const slashPos = value.lastIndexOf("/", pos - 1)
    if (slashPos >= 0 && pos - slashPos <= 20) {
      const beforeSlash = value.slice(0, slashPos)
      if (beforeSlash.endsWith("http:") || beforeSlash.endsWith("https:")) return
      setSlashMenu({ paramId, query: value.slice(slashPos + 1, pos) })
      setSlashIndex(0)
    } else {
      closeSlashMenu()
    }
  }, [onChange, validVars.length, closeSlashMenu])

  const getValue = (param: TestBlockParameter): string => {
    if (param.id in values) return values[param.id]
    return param.defaultValue ?? ""
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="space-y-3">
        {parameters.map((param) => {
          const value = getValue(param)
          const isPicking = picking === param.id
          const match = matchInfo[param.id]
          const isSlashOpen = slashMenu?.paramId === param.id && filteredVars.length > 0

          return (
            <div key={param.id} className="flex flex-col gap-1">
              <Label htmlFor={param.id} className="text-xs text-muted-foreground flex items-center gap-1">
                {param.name}
                {param.required && <span className="text-red-500">*</span>}
                {param.type === "selector" && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs whitespace-pre-line text-xs">
                        {SELECTOR_HELP}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </Label>

              {param.type === "workflow" ? (
                <Select value={value} onValueChange={(v) => onChange(param.id, v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={param.placeholder} /></SelectTrigger>
                  <SelectContent>
                    {workflows.filter((w) => w.id !== currentWorkflowId).map((workflow) => {
                      const cyclic = !!currentWorkflowId && wouldCreateCycle(workflows, currentWorkflowId, workflow.id)
                      return (
                        <SelectItem key={workflow.id} value={workflow.id} disabled={cyclic}>
                          {workflow.name} ({workflow.items.length} steps){cyclic ? " — would create a circular reference" : ""}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

              ) : param.type === "select" ? (
                <Select value={value} onValueChange={(v) => onChange(param.id, v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(param.options as { value: string; label: string }[])?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              ) : param.type === "boolean" ? (
                <div className="flex items-center gap-2 h-8">
                  <Switch
                    id={param.id}
                    checked={value === "true"}
                    onCheckedChange={(checked) => onChange(param.id, String(checked))}
                  />
                  <span className="text-xs text-muted-foreground">{value === "true" ? "Yes" : "No"}</span>
                </div>

              ) : param.type === "textarea" ? (
                <div className="relative">
                  <Textarea
                    id={param.id}
                    ref={(el) => { inputRefs.current[param.id] = el }}
                    value={value}
                    onChange={(e) => handleTextChange(param.id, e.target.value, e.target)}
                    onKeyDown={(e) => handleTextKeyDown(e, param.id)}
                    onBlur={() => setTimeout(closeSlashMenu, 150)}
                    placeholder={param.placeholder}
                    className="text-sm min-h-[80px] font-mono"
                    required={param.required}
                  />
                  {isSlashOpen && <SlashDropdown vars={filteredVars} selectedIndex={slashIndex} onSelect={(v) => injectVar(param.id, v)} />}
                </div>

              ) : param.type === "selector" ? (
                <div className="flex gap-1.5">
                  <div className="flex-1 relative">
                    <Input
                      id={param.id}
                      ref={(el) => { inputRefs.current[param.id] = el }}
                      value={value}
                      onChange={(e) => {
                        handleTextChange(param.id, e.target.value, e.target)
                        setMatchInfo((prev) => ({ ...prev, [param.id]: null }))
                        scheduleValidate(param.id, e.target.value)
                      }}
                      onKeyDown={(e) => handleSelectorKeyDown(e, param)}
                      onBlur={() => setTimeout(closeSlashMenu, 150)}
                      placeholder={param.placeholder ?? "selector  –  or type @ to pick"}
                      className={`h-8 text-xs font-mono ${match ? (match.ok ? "border-green-400" : "border-yellow-400") : ""}`}
                      required={param.required}
                    />
                    {match && (
                      <div className="absolute right-2 top-1.5">
                        {match.ok
                          ? <CheckCircle className="w-4 h-4 text-green-500" />
                          : <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        }
                      </div>
                    )}
                    {isSlashOpen && <SlashDropdown vars={filteredVars} selectedIndex={slashIndex} onSelect={(v) => injectVar(param.id, v)} />}
                  </div>

                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-8 w-8 p-0 flex-shrink-0 ${isPicking ? "border-primary bg-accent" : ""} ${!extensionAvailable ? "opacity-50" : ""}`}
                          onClick={() => handlePick(param)}
                          disabled={isPicking}
                          type="button"
                        >
                          {isPicking
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            : <Crosshair className="w-3.5 h-3.5" />
                          }
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-[220px]">
                        {!extensionAvailable
                          ? "Extension not detected – click to install"
                          : isPicking
                          ? "Switch to your app tab and click an element (Esc to cancel)"
                          : "Pick element from app  ·  or type @ in the field"
                        }
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

              ) : (
                <div className="relative">
                  <Input
                    id={param.id}
                    ref={(el) => { inputRefs.current[param.id] = el }}
                    type={param.type === "number" ? "number" : "text"}
                    value={value}
                    onChange={(e) => handleTextChange(param.id, e.target.value, e.target)}
                    onKeyDown={(e) => handleTextKeyDown(e, param.id)}
                    onBlur={() => setTimeout(closeSlashMenu, 150)}
                    placeholder={param.placeholder}
                    className="h-8 text-sm"
                    required={param.required}
                  />
                  {isSlashOpen && <SlashDropdown vars={filteredVars} selectedIndex={slashIndex} onSelect={(v) => injectVar(param.id, v)} />}
                </div>
              )}

              {param.type === "selector" && match && (
                <p className={`text-xs ${match.ok ? "text-green-600" : "text-yellow-600"}`}>
                  {match.error
                    ? `Invalid selector: ${match.error}`
                    : match.ok
                    ? "Unique element found"
                    : match.count === 0
                    ? "No elements match on the app tab"
                    : `${match.count} elements match – try a more specific selector`}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SlashDropdown({ vars, selectedIndex, onSelect }: {
  vars: EnvVar[]
  selectedIndex: number
  onSelect: (v: EnvVar) => void
}) {
  return (
    <div className="absolute z-50 top-full mt-1 left-0 w-full min-w-[180px] bg-card border border-border rounded-md shadow-lg overflow-hidden">
      <div className="px-2 py-1 border-b border-border/60">
        <span className="text-xs text-muted-foreground">Variables</span>
      </div>
      <ul className="py-1 max-h-48 overflow-y-auto">
        {vars.map((v, i) => (
          <li
            key={v.id}
            className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm ${i === selectedIndex ? "bg-accent text-primary" : "text-foreground hover:bg-accent"}`}
            onMouseDown={(e) => { e.preventDefault(); onSelect(v) }}
          >
            <span className="font-medium">{v.name}</span>
            <span className="text-xs text-muted-foreground ml-3 truncate max-w-[100px]">{"•".repeat(Math.min(v.value.length, 8))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
