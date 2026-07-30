import { type NextRequest, NextResponse } from "next/server"
import { parseCodeToBlockItems } from "@/lib/spec-import/parse-code-block"
import { checkApiKey } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Kept server-side deliberately: parseCodeToBlockItems pulls in the `typescript` compiler
// package, which would bloat the client bundle by several MB if imported directly from a
// client component (see components/workflow-builder.tsx's Code mode).
export async function POST(request: NextRequest) {
	const authError = checkApiKey(request)
	if (authError) return authError

	const text = await request.text()

	try {
		const result = parseCodeToBlockItems(text)
		return NextResponse.json(result)
	} catch (error) {
		console.error("Code block parse error:", error)
		const message = error instanceof Error ? error.message : "Failed to parse code"
		return NextResponse.json({ items: [], errors: [{ line: 1, code: text, message }] })
	}
}
