import ts from "typescript"
import { findObjectArg, objProp, strArg } from "./ast-utils"

/**
 * Recognizes `page.locator('css')` / `page.getByRole(...)` / `page.getByTestId(...)` /
 * `page.getByText(...)` / `page.getByPlaceholder(...)` and returns an equivalent selector
 * string in the same convention the browser extension already prefers
 * (extension/content.js: generateSelector) — data-testid / role / text / placeholder.
 *
 * Anything else (`.filter()`, `.nth()`, `.first()`, `.and()/.or()`, `getByLabel`,
 * `getByAltText`, `getByTitle`, or a locator held in a variable) returns null: the caller
 * treats the whole statement as unmatched and it falls into the custom-block bucket.
 */
export function getLocatorSelector(expr: ts.Expression): string | null {
	if (!ts.isCallExpression(expr)) return null
	if (!ts.isPropertyAccessExpression(expr.expression)) return null

	const receiver = expr.expression.expression
	const method = expr.expression.name.text
	if (!ts.isIdentifier(receiver) || receiver.text !== "page") return null

	const args = expr.arguments

	switch (method) {
		case "locator": {
			const sel = strArg(args, 0)
			return sel !== undefined ? sel : null
		}
		case "getByTestId": {
			const id = strArg(args, 0)
			return id !== undefined ? `[data-testid="${id}"]` : null
		}
		case "getByText": {
			const text = strArg(args, 0)
			return text !== undefined ? `text=${text}` : null
		}
		case "getByPlaceholder": {
			const ph = strArg(args, 0)
			return ph !== undefined ? `[placeholder="${ph}"]` : null
		}
		case "getByRole": {
			const role = strArg(args, 0)
			if (role === undefined) return null
			const opts = findObjectArg(args)
			const nameExpr = objProp(opts, "name")
			const name = nameExpr && ts.isStringLiteralLike(nameExpr) ? nameExpr.text : undefined
			return name !== undefined ? `role=${role}[name="${name}"]` : `role=${role}`
		}
		default:
			// getByLabel / getByAltText / getByTitle / anything future: not supported in v1.
			return null
	}
}

/**
 * Given the *receiver* of a chained call (e.g. the `X` in `X.click()`), determines whether
 * X is itself a supported locator-builder call and returns its selector, or null.
 */
export function selectorFromReceiver(receiver: ts.Expression): string | null {
	return getLocatorSelector(receiver)
}
