import ts from "typescript"
import { matchStatement } from "./match"
import { sliceSource } from "./ast-utils"

export interface CodeBlockMatchError {
	line: number
	code: string
	message: string
}

export interface CodeBlockParseItem {
	blockId: string
	parameters: Record<string, string>
}

export interface CodeBlockParseResult {
	items: CodeBlockParseItem[]
	errors: CodeBlockMatchError[]
}

/** Recognizes `await callWorkflow('Some Workflow');` (or unawaited) — the shape
 * workflowItemsToEditableCode (lib/code-generators.ts) emits for a callWorkflow step, since
 * that block's normal toCode() is just a comment (no parseable statement, see that file's
 * docblock). This is intentionally separate from lib/spec-import/rules.ts's matchStatement:
 * that file serves the full-spec-file import feature (a real hand-written Playwright test
 * would never contain a `callWorkflow(...)` call), so this stays local to the Code Mode
 * round-trip instead of teaching the shared matcher a fake API. Resolving the workflow name
 * back to an id happens client-side (the caller has the workflow list, this module doesn't). */
function matchCallWorkflow(stmt: ts.Statement): { workflowName: string } | null {
	if (!ts.isExpressionStatement(stmt)) return null
	let expr = stmt.expression
	if (ts.isAwaitExpression(expr)) expr = expr.expression
	if (!ts.isCallExpression(expr)) return null
	if (!ts.isIdentifier(expr.expression) || expr.expression.text !== "callWorkflow") return null
	const arg = expr.arguments[0]
	if (!arg || !ts.isStringLiteralLike(arg)) return null
	return { workflowName: arg.text }
}

/** Parses a bare sequence of step statements (no test()/beforeEach() wrapper — just the lines
 * that would normally live inside one test body, e.g. `await page.goto('/login');`) and matches
 * each one to a known Stitch block. Unlike lib/spec-import/build-workflow.ts's convertStatements
 * (which is lenient and bundles unmatched statements as a customCode fallback block), this is
 * strict: any unmatched statement is a hard error, since the caller (the Code Mode -> Block Mode
 * switch) refuses to apply the result at all when errors is non-empty. */
export function parseCodeToBlockItems(code: string): CodeBlockParseResult {
	let sourceFile: ts.SourceFile
	try {
		sourceFile = ts.createSourceFile("workflow-editor.ts", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	} catch {
		return { items: [], errors: [{ line: 1, code, message: "Could not parse this code as valid TypeScript/JavaScript" }] }
	}

	const items: CodeBlockParseItem[] = []
	const errors: CodeBlockMatchError[] = []

	for (const stmt of sourceFile.statements) {
		if (stmt.kind === ts.SyntaxKind.EmptyStatement) continue

		const callWorkflow = matchCallWorkflow(stmt)
		if (callWorkflow) {
			items.push({ blockId: "callWorkflow", parameters: { workflowName: callWorkflow.workflowName } })
			continue
		}

		const result = matchStatement(stmt)
		if (result) {
			items.push({ blockId: result.blockId, parameters: result.parameters })
		} else {
			const line = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile)).line + 1
			errors.push({ line, code: sliceSource(sourceFile, stmt), message: "No matching Stitch block for this statement" })
		}
	}

	if (code.trim().length > 0 && sourceFile.statements.length === 0) {
		errors.push({ line: 1, code, message: "Could not parse this code as valid TypeScript/JavaScript" })
	}

	return { items, errors }
}
