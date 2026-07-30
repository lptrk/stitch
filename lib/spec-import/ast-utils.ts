import ts from "typescript"

/** String value of the i-th argument, if it's a string literal (template literals with no
 * interpolation also count — TS gives us the decoded text either way). */
export function strArg(args: ts.NodeArray<ts.Expression>, i: number): string | undefined {
	const a = args[i]
	if (a && ts.isStringLiteralLike(a)) return a.text
	return undefined
}

/** Numeric value of the i-th argument, if it's a number literal. */
export function numArg(args: ts.NodeArray<ts.Expression>, i: number): number | undefined {
	const a = args[i]
	if (a && ts.isNumericLiteral(a)) return Number(a.text)
	return undefined
}

/** The first argument that is an object literal (options bags are usually the last arg,
 * but scanning all args is more forgiving of arg-order differences). */
export function findObjectArg(args: ts.NodeArray<ts.Expression>): ts.ObjectLiteralExpression | undefined {
	for (const a of args) {
		if (ts.isObjectLiteralExpression(a)) return a
	}
	return undefined
}

/** Reads a property from an object literal by name, e.g. objProp(opts, "timeout"). */
export function objProp(obj: ts.ObjectLiteralExpression | undefined, name: string): ts.Expression | undefined {
	if (!obj) return undefined
	for (const p of obj.properties) {
		if (ts.isPropertyAssignment(p)) {
			const key = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined
			if (key === name) return p.initializer
		}
	}
	return undefined
}

export function exprToString(expr: ts.Expression | undefined): string | undefined {
	if (!expr) return undefined
	if (ts.isStringLiteralLike(expr)) return expr.text
	if (ts.isNumericLiteral(expr)) return expr.text
	if (expr.kind === ts.SyntaxKind.TrueKeyword) return "true"
	if (expr.kind === ts.SyntaxKind.FalseKeyword) return "false"
	return undefined
}

/** Unwraps `await X` down to X; returns the bare call expression of an expression-statement, or null. */
export function awaitedCallOf(stmt: ts.Statement): ts.CallExpression | null {
	if (!ts.isExpressionStatement(stmt)) return null
	let e: ts.Expression = stmt.expression
	if (ts.isAwaitExpression(e)) e = e.expression
	if (!ts.isCallExpression(e)) return null
	return e
}

/** Exact original source text for a statement, including its own leading/trailing whitespace trimmed. */
export function sliceSource(sourceFile: ts.SourceFile, node: ts.Node): string {
	return sourceFile.text.slice(node.getStart(sourceFile), node.getEnd())
}
