import type { Page } from "playwright"
import type { LucideIcon } from "lucide-react"
import type { TestBlockParameter } from "@/types/workflow"

export interface BlockParameters {
	[key: string]: any
}

export type BlockFunction = (page: Page, parameters: BlockParameters) => Promise<void>

export function validateParameters(parameters: BlockParameters, required: string[] = []): void {
	const missing = required.filter((param) => !parameters[param] || String(parameters[param]).trim() === "")
	if (missing.length > 0) {
		throw new Error(`Missing required parameters: ${missing.join(", ")}`)
	}
}

export interface CodeGenContext {
	baseUrl: string
	index: number
}

/**
 * Single source of truth for a block: UI metadata, live execution, and CI-export codegen
 * live together so adding/changing a block never requires touching three separate files.
 */
export interface BlockDefinition {
	id: string
	name: string
	description: string
	icon: LucideIcon
	color: string
	category: string
	parameters?: TestBlockParameter[]
	execute: BlockFunction
	toCode: (params: Record<string, string>, ctx: CodeGenContext) => string
	toCypress?: (params: Record<string, string>, ctx: CodeGenContext) => string
}
