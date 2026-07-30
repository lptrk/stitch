import { type NextRequest, NextResponse } from "next/server"
import { parseSpecFile } from "@/lib/spec-import/parse"
import { buildImportResult } from "@/lib/spec-import/build-workflow"
import { checkApiKey } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
	const authError = checkApiKey(request)
	if (authError) return authError

	const text = await request.text()
	if (!text.trim()) {
		return NextResponse.json({ error: "Empty file" }, { status: 400 })
	}

	try {
		const spec = parseSpecFile("import.spec.ts", text)
		if (spec.tests.length === 0) {
			return NextResponse.json({ error: "No test(...) blocks found in this file" }, { status: 400 })
		}
		const result = buildImportResult(spec)
		return NextResponse.json(result)
	} catch (error) {
		console.error("Spec import error:", error)
		const message = error instanceof Error ? error.message : "Failed to parse spec file"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
