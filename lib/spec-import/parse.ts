import ts from "typescript"

export interface ParsedTest {
	name: string
	statements: ts.Statement[]
}

export interface ParsedSpec {
	sourceFile: ts.SourceFile
	beforeEachStatements: ts.Statement[]
	tests: ParsedTest[]
}

function isTestIdentifierCall(node: ts.Node, memberNames: string[]): node is ts.CallExpression {
	if (!ts.isCallExpression(node)) return false
	const e = node.expression
	if (memberNames.includes("")) {
		if (ts.isIdentifier(e) && e.text === "test") return true
	}
	if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "test") {
		return memberNames.includes(e.name.text)
	}
	return false
}

/** Matches test.describe(...), test.describe.serial(...), test.describe.parallel(...) etc. */
function isDescribeCall(node: ts.Node): node is ts.CallExpression {
	if (!ts.isCallExpression(node)) return false
	let e = node.expression
	// Unwrap one extra property access for test.describe.serial / .parallel / .only / .fixme
	if (ts.isPropertyAccessExpression(e) && ts.isPropertyAccessExpression(e.expression)) {
		e = e.expression
	}
	return ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "test" && e.name.text === "describe"
}

function isTestCall(node: ts.Node): node is ts.CallExpression {
	return isTestIdentifierCall(node, ["", "only", "skip", "fixme"])
}

function isBeforeEachCall(node: ts.Node): boolean {
	return isTestIdentifierCall(node, ["beforeEach"])
}

function getCallbackBody(call: ts.CallExpression): ts.Statement[] {
	const cb = call.arguments[call.arguments.length - 1]
	if (!cb) return []
	if ((ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.body && ts.isBlock(cb.body)) {
		return [...cb.body.statements]
	}
	return []
}

function getTestName(call: ts.CallExpression): string {
	const a0 = call.arguments[0]
	if (a0 && ts.isStringLiteralLike(a0)) return a0.text
	return "Imported test"
}

/** Parses a Playwright spec file's syntax (no type-checking needed) and extracts every
 * top-level (and one-level-nested-in-describe) test() body plus any beforeEach() body. */
export function parseSpecFile(fileName: string, text: string): ParsedSpec {
	const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	const tests: ParsedTest[] = []
	const beforeEachStatements: ts.Statement[] = []

	function visit(node: ts.Node) {
		if (isBeforeEachCall(node)) {
			beforeEachStatements.push(...getCallbackBody(node as ts.CallExpression))
			return
		}
		if (isTestCall(node)) {
			const call = node as ts.CallExpression
			tests.push({ name: getTestName(call), statements: getCallbackBody(call) })
			return
		}
		if (isDescribeCall(node)) {
			const call = node as ts.CallExpression
			const cb = call.arguments[call.arguments.length - 1]
			if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.body && ts.isBlock(cb.body)) {
				cb.body.statements.forEach(visit)
			}
			return
		}
		ts.forEachChild(node, visit)
	}

	visit(sourceFile)
	return { sourceFile, beforeEachStatements, tests }
}
