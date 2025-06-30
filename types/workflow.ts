import type { LucideIcon } from "lucide-react"

export interface TestBlockParameter {
  id: string
  name: string
  type: "text" | "number" | "url" | "selector" | "workflow"
  placeholder?: string
  required?: boolean
  defaultValue?: string
  options?: string[] // For workflow selection
}

export interface TestBlockDefinition {
  id: string
  name: string
  description: string
  icon: LucideIcon
  color: string
  playwrightFunction: string
  parameters?: TestBlockParameter[]
  customCode?: string // For custom blocks
  isCustom?: boolean // Mark custom blocks
  category?: string // For custom blocks
  tags?: Array<{ name: string; color: string }> // Tags with colors for searching and filtering
}

export interface WorkflowItem {
  id: string
  blockId: string
  block: TestBlockDefinition
  parameters?: Record<string, string>
  steps: WorkflowItem[]
  // Add execution status tracking
  executionStatus?: "pending" | "running" | "success" | "failed"
  executionError?: string
  executionDuration?: number
  executionTimestamp?: Date
}

export interface WorkflowExport {
  block: string
  parameters?: Record<string, string>
}

export interface Workflow {
  id: string
  name: string
  description?: string
  items: WorkflowItem[]
  createdAt: Date
  updatedAt: Date
}

export interface CustomBlockDefinition {
  id: string
  name: string
  code: string
  parameters: TestBlockParameter[]
  tags?: Array<{ name: string; color: string }>
}

export interface WorkflowConfig {
  baseUrl: string
  workflows: {
    [key: string]: {
      name: string
      description?: string
      workflow: WorkflowExport[]
    }
  }
  mainWorkflow: string // ID of the workflow to execute
  customBlocks?: Record<string, CustomBlockDefinition> // Custom blocks with their code
}

export interface BlockExecutionResult {
  blockId: string
  itemId: string
  status: "success" | "failed"
  error?: string
  duration: number
  timestamp: Date
}
