import type { TestBlockDefinition } from "@/types/workflow"
import type { WorkflowItem } from "@/types/workflow"
import type { BlockDefinition, BlockFunction, CodeGenContext } from "./types"

import { navigationBlocks } from "./navigation"
import { interactionBlocks } from "./interactions"
import { formBlocks } from "./forms"
import { assertionBlocks } from "./assertions"
import { waitingBlocks } from "./waiting"
import { screenshotBlocks } from "./screenshots"
import { dataExtractionBlocks } from "./data-extraction"
import { networkBlocks } from "./network"
import { authBlocks } from "./auth"
import { browserContextBlocks } from "./browser-context"
import { fileOperationBlocks } from "./file-operations"
import { workflowControlBlocks } from "./workflow-control"
import { frameBlocks } from "./advanced/frames"
import { clipboardInputBlocks } from "./advanced/clipboard-input"
import { touchBlocks } from "./advanced/touch"
import { shadowDomBlocks } from "./advanced/shadow-dom"
import { websocketBlocks } from "./advanced/websocket"
import { diagnosticsBlocks } from "./advanced/diagnostics"

/** Single source of truth: every block Stitch knows about. */
export const allBlocks: BlockDefinition[] = [
	...navigationBlocks,
	...interactionBlocks,
	...formBlocks,
	...assertionBlocks,
	...waitingBlocks,
	...screenshotBlocks,
	...dataExtractionBlocks,
	...networkBlocks,
	...authBlocks,
	...browserContextBlocks,
	...fileOperationBlocks,
	...workflowControlBlocks,
	...frameBlocks,
	...clipboardInputBlocks,
	...touchBlocks,
	...shadowDomBlocks,
	...websocketBlocks,
	...diagnosticsBlocks,
]

if (process.env.NODE_ENV !== "production") {
	const seen = new Set<string>()
	for (const block of allBlocks) {
		if (seen.has(block.id)) {
			throw new Error(`Duplicate block id in lib/blocks/registry.ts: "${block.id}"`)
		}
		seen.add(block.id)
	}
}

const byId: Record<string, BlockDefinition> = Object.fromEntries(allBlocks.map((b) => [b.id, b]))

/** UI palette metadata — same shape as the old lib/test-blocks.ts `testBlocks` export. */
export const uiBlocks: TestBlockDefinition[] = allBlocks.map((b) => ({
	id: b.id,
	name: b.name,
	description: b.description,
	icon: b.icon,
	color: b.color,
	category: b.category,
	playwrightFunction: b.id,
	parameters: b.parameters,
}))

/** Live execution registry — same shape as the old lib/runner/blocks/index.ts `blockRegistry` export. */
export const executionRegistry: Record<string, BlockFunction> = Object.fromEntries(allBlocks.map((b) => [b.id, b.execute]))

function paramsOf(item: WorkflowItem): Record<string, string> {
	return (item.parameters as Record<string, string>) || {}
}

/** CI-export codegen dispatch — replaces the switch statements in lib/code-generators.ts. */
export function generatePlaywrightCode(item: WorkflowItem, index: number, baseUrl: string): string {
	const block = byId[item.blockId]
	if (!block) {
		if ((item as any).block?.isCustom && (item as any).block.customCode) {
			const lines = (item as any).block.customCode.split("\n").map((l: string) => `  ${l}`).join("\n")
			return `  // Custom block: ${(item as any).block.name}\n${lines}`
		}
		return `  // Block '${item.blockId}' has no mapping – implement manually`
	}
	const ctx: CodeGenContext = { baseUrl, index }
	return block.toCode(paramsOf(item), ctx)
}

export function generateCypressCode(item: WorkflowItem, index: number, baseUrl: string): string {
	const block = byId[item.blockId]
	if (!block) {
		if ((item as any).block?.isCustom && (item as any).block.customCode) {
			const lines = (item as any).block.customCode.split("\n").map((l: string) => `    ${l}`).join("\n")
			return `    // Custom block: ${(item as any).block.name}\n${lines}`
		}
		return `    // Block '${item.blockId}' has no mapping – implement manually`
	}
	if (!block.toCypress) {
		return `    // Block '${item.blockId}' has no Cypress mapping – implement manually`
	}
	const ctx: CodeGenContext = { baseUrl, index }
	return block.toCypress(paramsOf(item), ctx)
}
