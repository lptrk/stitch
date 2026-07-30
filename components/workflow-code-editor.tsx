"use client"

import { useEffect, useState } from "react"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { oneDark } from "@codemirror/theme-one-dark"
import { useTheme } from "next-themes"
import { AlertTriangle } from "lucide-react"

export interface WorkflowCodeEditorError {
  line: number
  message: string
}

interface WorkflowCodeEditorProps {
  code: string
  onChange: (code: string) => void
  errors?: WorkflowCodeEditorError[]
  readOnly?: boolean
  className?: string
}

// Matches the `font-mono text-xs` convention used for code previews elsewhere
// (see components/workflow-exporter.tsx), since CodeMirror's default font size
// is larger and would look inconsistent with the rest of the app.
const fontSizeTheme = EditorView.theme({
  "&": { fontSize: "12px" },
  ".cm-content": { fontFamily: "var(--font-mono, ui-monospace, monospace)" },
  ".cm-gutters": { fontSize: "12px" },
})

export function WorkflowCodeEditor({ code, onChange, errors = [], readOnly = false, className = "" }: WorkflowCodeEditorProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // next-themes only resolves the real theme after mount; before that, fall back to the
  // OS preference directly so the editor doesn't default to light and then flash dark.
  const isDark = mounted
    ? resolvedTheme === "dark"
    : typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches

  return (
    <div className={`flex flex-col gap-2 min-h-0 ${className}`}>
      <div className="flex-1 min-h-0 overflow-hidden rounded-md border border-border">
        <CodeMirror
          value={code}
          onChange={(value) => onChange(value)}
          readOnly={readOnly}
          height="100%"
          theme={isDark ? oneDark : "light"}
          extensions={[javascript({ typescript: true }), fontSizeTheme]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: !readOnly,
            highlightActiveLineGutter: !readOnly,
          }}
          style={{ height: "100%" }}
        />
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2 dark:bg-yellow-950/30 dark:border-yellow-900">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 font-medium text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {errors.length} line{errors.length === 1 ? "" : "s"} couldn't be matched to a block
          </div>
          <ul className="space-y-1 pl-6">
            {errors.map((error, i) => (
              <li key={i} className="text-xs text-yellow-700 dark:text-yellow-500">
                • Line {error.line}: <span className="font-medium">{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
