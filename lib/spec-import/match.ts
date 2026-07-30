import ts from "typescript"
import { getLocatorSelector } from "./normalize-selector"
import { awaitedCallOf } from "./ast-utils"
import { rules } from "./rules"

export type CallKind = "pageDirect" | "keyboardDirect" | "locatorMethod" | "expectLocator" | "expectPage"

export interface ClassifiedCall {
	kind: CallKind
	method: string
	args: ts.NodeArray<ts.Expression>
	selector?: string
	/** Second locator selector, only set for two-locator calls like dragTo(target). */
	selector2?: string
	negated?: boolean
}

/** Turns `page.X(...)`, `page.keyboard.X(...)`, `<locator>.X(...)`, `expect(<locator>).X(...)`,
 * `expect(<locator>).not.X(...)` and `expect(page).X(...)` into a normalized shape rules.ts
 * can pattern-match on, independent of which locator-builder syntax was used. */
export function classifyCall(call: ts.CallExpression): ClassifiedCall | null {
	const callee = call.expression
	if (!ts.isPropertyAccessExpression(callee)) return null

	const method = callee.name.text
	let receiver: ts.Expression = callee.expression
	let negated = false

	// expect(x).not.method() — unwrap the `.not` hop before inspecting the receiver.
	if (ts.isPropertyAccessExpression(receiver) && receiver.name.text === "not") {
		negated = true
		receiver = receiver.expression
	}

	// page.method(...)
	if (ts.isIdentifier(receiver) && receiver.text === "page") {
		return { kind: "pageDirect", method, args: call.arguments, negated }
	}

	// page.keyboard.method(...)
	if (
		ts.isPropertyAccessExpression(receiver) &&
		ts.isIdentifier(receiver.expression) &&
		receiver.expression.text === "page" &&
		receiver.name.text === "keyboard"
	) {
		return { kind: "keyboardDirect", method, args: call.arguments, negated }
	}

	// expect(X).method(...)
	if (ts.isCallExpression(receiver) && ts.isIdentifier(receiver.expression) && receiver.expression.text === "expect") {
		const target = receiver.arguments[0]
		if (!target) return null
		if (ts.isIdentifier(target) && target.text === "page") {
			return { kind: "expectPage", method, args: call.arguments, negated }
		}
		const sel = getLocatorSelector(target)
		if (sel !== null) {
			return { kind: "expectLocator", method, args: call.arguments, selector: sel, negated }
		}
		return null
	}

	// <locator>.method(...) — e.g. page.locator(x).click() / page.getByRole(...).fill()
	if (ts.isCallExpression(receiver)) {
		const sel = getLocatorSelector(receiver)
		if (sel === null) return null
		let selector2: string | undefined
		if (method === "dragTo" && call.arguments[0]) {
			const s2 = getLocatorSelector(call.arguments[0])
			if (s2 !== null) selector2 = s2
		}
		return { kind: "locatorMethod", method, args: call.arguments, selector: sel, selector2, negated }
	}

	return null
}

export interface MatchResult {
	blockId: string
	parameters: Record<string, string>
}

/** Tries every v1 rule (lib/spec-import/rules.ts) against one statement; first match wins.
 * Returns null if the statement isn't an `await <call>` at all, or no rule recognizes the
 * call shape — the caller then treats the statement as unmatched (custom-block fallback). */
export function matchStatement(stmt: ts.Statement): MatchResult | null {
	const call = awaitedCallOf(stmt)
	if (!call) return null
	const classified = classifyCall(call)
	if (!classified) return null
	for (const rule of rules) {
		const result = rule(classified)
		if (result) return result
	}
	return null
}
