"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TestBlockParameter, Workflow } from "@/types/workflow"

interface BlockParametersProps {
  parameters: TestBlockParameter[]
  values: Record<string, string>
  workflows?: Workflow[]
  currentWorkflowId?: string
  onChange: (parameterId: string, value: string) => void
}

export function BlockParameters({
  parameters,
  values,
  workflows = [],
  currentWorkflowId,
  onChange,
}: BlockParametersProps) {
  if (!parameters || parameters.length === 0) {
    return null
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="space-y-2">
        {parameters.map((param) => (
          <div key={param.id} className="flex flex-col gap-1">
            <Label htmlFor={param.id} className="text-xs text-gray-600">
              {param.name}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {param.type === "workflow" ? (
              <Select value={values[param.id] || ""} onValueChange={(value) => onChange(param.id, value)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={param.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {workflows
                    .filter((w) => w.id !== currentWorkflowId) // Don't allow calling self
                    .map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name} ({workflow.items.length} steps)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={param.id}
                type={param.type === "number" ? "number" : "text"}
                value={values[param.id] || param.defaultValue || ""}
                onChange={(e) => onChange(param.id, e.target.value)}
                placeholder={param.placeholder}
                className="h-8 text-sm"
                required={param.required}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
