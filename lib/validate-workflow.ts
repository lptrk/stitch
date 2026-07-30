"use client"

import type { WorkflowItem } from "@/types/workflow"

export interface ValidationError {
  itemId: string
  itemIndex: number
  blockName: string
  parameterName: string
  message: string
}

export function validateWorkflow(items: WorkflowItem[]): ValidationError[] {
  const errors: ValidationError[] = []

  items.forEach((item, index) => {
    if (!item.block.parameters) return

    item.block.parameters.forEach((param) => {
      if (param.required) {
        const value = item.parameters?.[param.id]
        if (!value || value.trim() === "") {
          errors.push({
            itemId: item.id,
            itemIndex: index,
            blockName: item.block.name,
            parameterName: param.name,
            message: `"${param.name}" is required in step ${index + 1} (${item.block.name})`,
          })
        }
      }
    })
  })

  return errors
}
