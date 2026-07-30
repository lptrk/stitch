import ts from "typescript"
import { findObjectArg, objProp, strArg } from "./ast-utils"
import type { ClassifiedCall, MatchResult } from "./match"

/**
 * v1 import rule table — the inverse of the `toCode` functions in lib/blocks/*.ts, for the
 * ~27 blocks most likely to appear in a hand-written Playwright spec. Each rule inspects a
 * ClassifiedCall and either returns a match or null (not applicable) — first match wins.
 * Deliberately not part of lib/blocks/BlockDefinition: not every block needs import support,
 * and AST-matching code has no reason to ship in the client bundle.
 */
export type ImportRule = (call: ClassifiedCall) => MatchResult | null

function numFrom(expr: ts.Expression | undefined): string | undefined {
	return expr && ts.isNumericLiteral(expr) ? expr.text : undefined
}
function strFrom(expr: ts.Expression | undefined): string | undefined {
	return expr && ts.isStringLiteralLike(expr) ? expr.text : undefined
}
function boolKeyword(expr: ts.Expression | undefined): string | undefined {
	if (!expr) return undefined
	if (expr.kind === ts.SyntaxKind.TrueKeyword) return "true"
	if (expr.kind === ts.SyntaxKind.FalseKeyword) return "false"
	return undefined
}

// ── Navigation ──────────────────────────────────────────────────────────────

const ruleGoto: ImportRule = (c) => {
	if (c.kind !== "pageDirect" || c.method !== "goto") return null
	const url = strArg(c.args, 0)
	if (url === undefined) return null
	const opts = findObjectArg(c.args)
	const waitUntil = strFrom(objProp(opts, "waitUntil"))
	const parameters: Record<string, string> = { url }
	if (waitUntil) parameters.waitUntil = waitUntil
	return { blockId: "goto", parameters }
}

const ruleReload: ImportRule = (c) => {
	if (c.kind !== "pageDirect" || c.method !== "reload") return null
	const opts = findObjectArg(c.args)
	const waitUntil = strFrom(objProp(opts, "waitUntil"))
	const parameters: Record<string, string> = {}
	if (waitUntil) parameters.waitUntil = waitUntil
	return { blockId: "reload", parameters }
}

const ruleGoBack: ImportRule = (c) =>
	c.kind === "pageDirect" && c.method === "goBack" ? { blockId: "goBack", parameters: {} } : null

const ruleGoForward: ImportRule = (c) =>
	c.kind === "pageDirect" && c.method === "goForward" ? { blockId: "goForward", parameters: {} } : null

// ── Interactions ─────────────────────────────────────────────────────────────

const ruleClick: ImportRule = (c) => {
	if (c.kind !== "locatorMethod" || c.method !== "click" || !c.selector) return null
	const opts = findObjectArg(c.args)
	const parameters: Record<string, string> = { selector: c.selector }
	const button = strFrom(objProp(opts, "button"))
	if (button) parameters.button = button
	const clickCount = numFrom(objProp(opts, "clickCount"))
	if (clickCount) parameters.clickCount = clickCount
	const timeout = numFrom(objProp(opts, "timeout"))
	if (timeout) parameters.timeout = timeout
	return { blockId: "click", parameters }
}

const ruleHover: ImportRule = (c) => {
	if (c.kind !== "locatorMethod" || c.method !== "hover" || !c.selector) return null
	const opts = findObjectArg(c.args)
	const parameters: Record<string, string> = { selector: c.selector }
	const timeout = numFrom(objProp(opts, "timeout"))
	if (timeout) parameters.timeout = timeout
	return { blockId: "hover", parameters }
}

const ruleFocus: ImportRule = (c) =>
	c.kind === "locatorMethod" && c.method === "focus" && c.selector
		? { blockId: "focus", parameters: { selector: c.selector } }
		: null

const ruleDragAndDrop: ImportRule = (c) =>
	c.kind === "locatorMethod" && c.method === "dragTo" && c.selector && c.selector2
		? { blockId: "dragAndDrop", parameters: { source: c.selector, target: c.selector2 } }
		: null

const ruleScrollTo: ImportRule = (c) =>
	c.kind === "locatorMethod" && c.method === "scrollIntoViewIfNeeded" && c.selector
		? { blockId: "scrollTo", parameters: { selector: c.selector } }
		: null

// ── Form Inputs ──────────────────────────────────────────────────────────────

const ruleFill: ImportRule = (c) => {
	if (c.kind !== "locatorMethod" || c.method !== "fill" || !c.selector) return null
	const value = strArg(c.args, 0)
	if (value === undefined) return null
	const opts = findObjectArg(c.args)
	const parameters: Record<string, string> = { selector: c.selector, value }
	const timeout = numFrom(objProp(opts, "timeout"))
	if (timeout) parameters.timeout = timeout
	return { blockId: "fill", parameters }
}

const ruleClearInput: ImportRule = (c) =>
	c.kind === "locatorMethod" && c.method === "clear" && c.selector
		? { blockId: "clearInput", parameters: { selector: c.selector } }
		: null

const ruleCheck: ImportRule = (c) => {
	if (c.kind !== "locatorMethod" || !c.selector) return null
	if (c.method === "check") return { blockId: "check", parameters: { selector: c.selector, checked: "true" } }
	if (c.method === "uncheck") return { blockId: "check", parameters: { selector: c.selector, checked: "false" } }
	return null
}

const ruleUploadFile: ImportRule = (c) => {
	if (c.kind !== "locatorMethod" || c.method !== "setInputFiles" || !c.selector) return null
	const filePath = strArg(c.args, 0)
	if (filePath === undefined) return null
	return { blockId: "uploadFile", parameters: { selector: c.selector, filePath } }
}

const rulePressKey: ImportRule = (c) => {
	if (c.kind === "locatorMethod" && c.method === "press" && c.selector) {
		const key = strArg(c.args, 0)
		if (key === undefined) return null
		const parameters: Record<string, string> = { key, selector: c.selector }
		return { blockId: "pressKey", parameters }
	}
	if (c.kind === "keyboardDirect" && c.method === "press") {
		const key = strArg(c.args, 0)
		if (key === undefined) return null
		const parameters: Record<string, string> = { key }
		return { blockId: "pressKey", parameters }
	}
	return null
}

const ruleSelectOption: ImportRule = (c) => {
	if (c.kind !== "locatorMethod" || c.method !== "selectOption" || !c.selector) return null
	const a0 = c.args[0]
	if (a0 && ts.isObjectLiteralExpression(a0)) {
		const label = strFrom(objProp(a0, "label"))
		if (label !== undefined) {
			const parameters: Record<string, string> = { selector: c.selector, label }
			return { blockId: "selectOption", parameters }
		}
		const value = strFrom(objProp(a0, "value"))
		if (value !== undefined) {
			const parameters: Record<string, string> = { selector: c.selector, value }
			return { blockId: "selectOption", parameters }
		}
		return null
	}
	if (a0 && ts.isStringLiteralLike(a0)) {
		return { blockId: "selectOption", parameters: { selector: c.selector, value: a0.text } }
	}
	return null
}

// ── Waiting / Screenshots ────────────────────────────────────────────────────

const ruleWaitForSelector: ImportRule = (c) => {
	if (c.kind !== "locatorMethod" || c.method !== "waitFor" || !c.selector) return null
	const opts = findObjectArg(c.args)
	const parameters: Record<string, string> = { selector: c.selector }
	const state = strFrom(objProp(opts, "state"))
	if (state) parameters.state = state
	const timeout = numFrom(objProp(opts, "timeout"))
	if (timeout) parameters.timeout = timeout
	return { blockId: "waitForSelector", parameters }
}

const ruleWaitForLoadState: ImportRule = (c) => {
	if (c.kind !== "pageDirect" || c.method !== "waitForLoadState") return null
	const state = strArg(c.args, 0)
	const opts = findObjectArg(c.args)
	const timeout = numFrom(objProp(opts, "timeout"))
	const parameters: Record<string, string> = {}
	if (state) parameters.state = state
	if (timeout) parameters.timeout = timeout
	return { blockId: "waitForLoadState", parameters }
}

const ruleScreenshot: ImportRule = (c) => {
	if (c.kind === "locatorMethod" && c.method === "screenshot" && c.selector) {
		return { blockId: "screenshot", parameters: { selector: c.selector } }
	}
	if (c.kind === "pageDirect" && c.method === "screenshot") {
		const opts = findObjectArg(c.args)
		const parameters: Record<string, string> = {}
		const pathVal = strFrom(objProp(opts, "path"))
		if (pathVal) {
			const base = pathVal.split("/").pop()?.replace(/\.(png|jpe?g)$/i, "")
			if (base) parameters.name = base
		}
		const fullPage = boolKeyword(objProp(opts, "fullPage"))
		if (fullPage) parameters.fullPage = fullPage
		return { blockId: "screenshot", parameters }
	}
	return null
}

// ── Assertions ───────────────────────────────────────────────────────────────

const ruleExpectVisible: ImportRule = (c) => {
	if (c.kind !== "expectLocator" || !c.selector || c.negated) return null
	if (c.method !== "toBeVisible") return null
	const opts = findObjectArg(c.args)
	const parameters: Record<string, string> = { selector: c.selector }
	const timeout = numFrom(objProp(opts, "timeout"))
	if (timeout) parameters.timeout = timeout
	return { blockId: "expectVisible", parameters }
}

const ruleExpectHidden: ImportRule = (c) => {
	if (c.kind !== "expectLocator" || !c.selector) return null
	const isHidden = c.method === "toBeHidden" || (c.method === "toBeVisible" && c.negated)
	if (!isHidden) return null
	const opts = findObjectArg(c.args)
	const parameters: Record<string, string> = { selector: c.selector }
	const timeout = numFrom(objProp(opts, "timeout"))
	if (timeout) parameters.timeout = timeout
	return { blockId: "expectHidden", parameters }
}

const ruleExpectText: ImportRule = (c) => {
	if (c.kind !== "expectLocator" || !c.selector || c.negated) return null
	if (c.method !== "toContainText" && c.method !== "toHaveText") return null
	const text = strArg(c.args, 0)
	if (text === undefined) return null
	const parameters: Record<string, string> = { selector: c.selector, text }
	if (c.method === "toHaveText") parameters.exact = "true"
	return { blockId: "expectText", parameters }
}

const ruleExpectValue: ImportRule = (c) => {
	if (c.kind !== "expectLocator" || !c.selector || c.negated || c.method !== "toHaveValue") return null
	const value = strArg(c.args, 0)
	if (value === undefined) return null
	return { blockId: "expectValue", parameters: { selector: c.selector, value } }
}

const ruleExpectEnabled: ImportRule = (c) => {
	if (c.kind !== "expectLocator" || !c.selector) return null
	if (c.method === "toBeEnabled" && !c.negated) return { blockId: "expectEnabled", parameters: { selector: c.selector, enabled: "true" } }
	if (c.method === "toBeDisabled" && !c.negated) return { blockId: "expectEnabled", parameters: { selector: c.selector, enabled: "false" } }
	return null
}

const ruleExpectChecked: ImportRule = (c) => {
	if (c.kind !== "expectLocator" || !c.selector || c.method !== "toBeChecked") return null
	return { blockId: "expectChecked", parameters: { selector: c.selector, checked: c.negated ? "false" : "true" } }
}

const ruleExpectCount: ImportRule = (c) => {
	if (c.kind !== "expectLocator" || !c.selector || c.negated || c.method !== "toHaveCount") return null
	const count = numArg(c.args, 0)
	if (count === undefined) return null
	return { blockId: "expectCount", parameters: { selector: c.selector, count } }
}

const ruleExpectAttribute: ImportRule = (c) => {
	if (c.kind !== "expectLocator" || !c.selector || c.negated || c.method !== "toHaveAttribute") return null
	const attribute = strArg(c.args, 0)
	const value = strArg(c.args, 1)
	if (attribute === undefined || value === undefined) return null
	return { blockId: "expectAttribute", parameters: { selector: c.selector, attribute, value } }
}

function urlOrTitlePattern(a0: ts.Expression | undefined): { value: string; exact: string } | null {
	if (!a0) return null
	if (ts.isStringLiteralLike(a0)) return { value: a0.text, exact: "true" }
	if (ts.isNewExpression(a0) && ts.isIdentifier(a0.expression) && a0.expression.text === "RegExp") {
		const pattern = a0.arguments?.[0]
		if (pattern && ts.isStringLiteralLike(pattern)) return { value: pattern.text, exact: "false" }
	}
	if (ts.isRegularExpressionLiteral(a0)) {
		return { value: a0.text.replace(/^\/|\/[a-z]*$/gi, ""), exact: "false" }
	}
	return null
}

const ruleExpectUrl: ImportRule = (c) => {
	if (c.kind !== "expectPage" || c.negated || c.method !== "toHaveURL") return null
	const parsed = urlOrTitlePattern(c.args[0])
	if (!parsed) return null
	return { blockId: "expectUrl", parameters: { url: parsed.value, exact: parsed.exact } }
}

const ruleExpectTitle: ImportRule = (c) => {
	if (c.kind !== "expectPage" || c.negated || c.method !== "toHaveTitle") return null
	const parsed = urlOrTitlePattern(c.args[0])
	if (!parsed) return null
	return { blockId: "expectTitle", parameters: { title: parsed.value, exact: parsed.exact } }
}

function numArg(args: ts.NodeArray<ts.Expression>, i: number): string | undefined {
	return numFrom(args[i])
}

export const rules: ImportRule[] = [
	ruleGoto,
	ruleReload,
	ruleGoBack,
	ruleGoForward,
	ruleClick,
	ruleHover,
	ruleFocus,
	ruleDragAndDrop,
	ruleScrollTo,
	ruleFill,
	ruleClearInput,
	ruleCheck,
	ruleUploadFile,
	rulePressKey,
	ruleSelectOption,
	ruleWaitForSelector,
	ruleWaitForLoadState,
	ruleScreenshot,
	ruleExpectVisible,
	ruleExpectHidden,
	ruleExpectText,
	ruleExpectValue,
	ruleExpectEnabled,
	ruleExpectChecked,
	ruleExpectCount,
	ruleExpectAttribute,
	ruleExpectUrl,
	ruleExpectTitle,
]
