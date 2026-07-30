import ts from "typescript"
import type { ParsedSpec } from "./parse"
import { matchStatement } from "./match"
import { sliceSource } from "./ast-utils"

/** JSON-safe result shape — no icons/components here (those can't cross an API boundary).
 * The client enriches each `blockId` with the real block definition (icon, name, color)
 * looked up from lib/test-blocks.ts, which is where that data actually lives. */
export interface ImportedItem {
	blockId?: string
	parameters?: Record<string, string>
	/** Set instead of blockId when one or more consecutive statements couldn't be matched
	 * to a block — the original source text, bundled so the result isn't split one-line-per-block. */
	customCode?: string
}

export interface ImportedWorkflow {
	name: string
	items: ImportedItem[]
}

export interface ImportResult {
	workflows: ImportedWorkflow[]
	setupWorkflow?: ImportedWorkflow
	stats: { matched: number; fallback: number }
}

function convertStatements(
	sourceFile: ts.SourceFile,
	statements: ts.Statement[],
): { items: ImportedItem[]; matched: number; fallback: number } {
	const items: ImportedItem[] = []
	let matched = 0
	let fallback = 0
	let pendingRaw: string[] = []

	const flushPending = () => {
		if (pendingRaw.length === 0) return
		items.push({ customCode: pendingRaw.join("\n") })
		fallback += pendingRaw.length
		pendingRaw = []
	}

	for (const stmt of statements) {
		const result = matchStatement(stmt)
		if (result) {
			flushPending()
			items.push({ blockId: result.blockId, parameters: result.parameters })
			matched++
		} else {
			pendingRaw.push(sliceSource(sourceFile, stmt))
		}
	}
	flushPending()

	return { items, matched, fallback }
}

/** Placeholder workflow id for the Setup → test `callWorkflow` link; the client resolves
 * this to the real generated id once the Setup workflow itself has one. */
export const SETUP_WORKFLOW_PLACEHOLDER_ID = "__stitch_import_setup__"

export function buildImportResult(spec: ParsedSpec): ImportResult {
	let totalMatched = 0
	let totalFallback = 0

	let setupWorkflow: ImportedWorkflow | undefined
	if (spec.beforeEachStatements.length > 0) {
		const { items, matched, fallback } = convertStatements(spec.sourceFile, spec.beforeEachStatements)
		totalMatched += matched
		totalFallback += fallback
		setupWorkflow = { name: "Setup", items }
	}

	const workflows: ImportedWorkflow[] = spec.tests.map((t) => {
		const { items, matched, fallback } = convertStatements(spec.sourceFile, t.statements)
		totalMatched += matched
		totalFallback += fallback
		const finalItems: ImportedItem[] = setupWorkflow
			? [{ blockId: "callWorkflow", parameters: { workflowId: SETUP_WORKFLOW_PLACEHOLDER_ID } }, ...items]
			: items
		return { name: t.name, items: finalItems }
	})

	return { workflows, setupWorkflow, stats: { matched: totalMatched, fallback: totalFallback } }
}
