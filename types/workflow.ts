import type { LucideIcon } from "lucide-react"

export interface TestBlockParameter {
	id: string
	name: string
	type: "text" | "number" | "url" | "selector" | "workflow" | "boolean" | "select" | "textarea"
	placeholder?: string
	required?: boolean
	defaultValue?: string
	options?: string[] | { value: string; label: string }[]
}

export interface TestBlockDefinition {
	id: string
	name: string
	description: string
	icon: LucideIcon
	color: string
	playwrightFunction: string
	parameters?: TestBlockParameter[]
	customCode?: string
	isCustom?: boolean
	category?: string
	tags?: Array<{ name: string; color: string }>
}

export interface WorkflowItem {
	id: string
	blockId: string
	block: TestBlockDefinition
	parameters?: Record<string, string>
	steps?: WorkflowItem[]
	// Step comment – visible in the canvas, exported as code comment
	comment?: string
	// Output variable for data flow
	outputVariable?: string
	// Execution status
	executionStatus?: "pending" | "running" | "success" | "failed"
	executionError?: string
	executionDuration?: number
	executionTimestamp?: Date
	executionOutput?: string
}

export type WorkflowTag = "Smoke" | "Regression" | "Critical" | "WIP" | "Flaky" | string

export const WORKFLOW_TAG_COLORS: Record<string, string> = {
	Smoke:      "bg-blue-100 text-blue-700 border-blue-200",
	Regression: "bg-purple-100 text-purple-700 border-purple-200",
	Critical:   "bg-red-100 text-red-700 border-red-200",
	WIP:        "bg-yellow-100 text-yellow-700 border-yellow-200",
	Flaky:      "bg-orange-100 text-orange-700 border-orange-200",
}

export interface WorkflowFolder {
	id: string
	name: string
	parentId?: string  // undefined = root level
	color?: string
}

export interface Workflow {
	id: string
	name: string
	description?: string
	items: WorkflowItem[]
	tags?: WorkflowTag[]
	folderId?: string
	protected?: boolean  // cannot be deleted
	createdAt: Date
	updatedAt: Date
}

export interface WorkflowExport {
	block: string
	parameters?: Record<string, string>
	comment?: string
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
	mainWorkflow: string
	customBlocks?: Record<string, CustomBlockDefinition>
}

export interface BlockExecutionResult {
	blockId: string
	itemId: string
	status: "success" | "failed"
	error?: string
	duration: number
	timestamp: Date
}

// For "Run with data" parametrization
export interface DataRow {
	[key: string]: string
}

export interface ParametrizedRunConfig {
	workflowId: string
	dataRows: DataRow[]
	// Maps parameter placeholders like {{email}} to column names
	columnMapping: Record<string, string>
}
