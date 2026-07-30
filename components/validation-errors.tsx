"use client"

import { AlertTriangle, X } from "lucide-react"
import type { ValidationError } from "@/lib/validate-workflow"

interface ValidationErrorsProps {
  errors: ValidationError[]
  onDismiss?: () => void
}

export function ValidationErrors({ errors, onDismiss }: ValidationErrorsProps) {
  if (errors.length === 0) return null

  return (
    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Please fill in the required fields before running
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-yellow-600 hover:text-yellow-800">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <ul className="space-y-1 pl-6">
        {errors.map((error, i) => (
          <li key={i} className="text-xs text-yellow-700">
            • Step {error.itemIndex + 1} ({error.blockName}): <span className="font-medium">{error.parameterName}</span> is required
          </li>
        ))}
      </ul>
    </div>
  )
}
