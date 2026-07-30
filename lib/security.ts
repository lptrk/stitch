import { NextRequest, NextResponse } from "next/server"
import path from "path"

const ALLOWED_WRITE_DIR = path.resolve(process.cwd(), "data")

/** Accepts the `x-api-key` header, a standard `Authorization: Bearer <key>` header (added for
 * the MCP endpoint, which speaks Bearer per MCP convention), or a `?apiKey=` query param —
 * checked in that order, first match wins. The query param exists because some remote MCP
 * clients (e.g. Amazon Q Developer's `type: "http"` config only takes a bare `url`, no custom
 * headers — it's OAuth-or-open, nothing in between) have no way to attach a static header, so
 * the only way to hand them a pre-shared key at all is baked into the URL itself. Existing
 * routes using only x-api-key/Bearer are unaffected — this only adds a third fallback. */
function getProvidedKey(request: NextRequest): string | null {
  const headerKey = request.headers.get("x-api-key")
  if (headerKey) return headerKey
  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  const queryKey = request.nextUrl.searchParams.get("apiKey")
  if (queryKey) return queryKey
  return null
}

export function checkApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.API_KEY
  if (!apiKey) {
    console.error("API_KEY environment variable is not set")
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }
  if (getProvidedKey(request) !== apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export function checkApiKeyRaw(request: NextRequest): Response | null {
  const apiKey = process.env.API_KEY
  if (!apiKey) {
    console.error("API_KEY environment variable is not set")
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500 })
  }
  if (getProvidedKey(request) !== apiKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }
  return null
}

/** For the live-sessions SSE route: the browser's native EventSource cannot set request
 * headers, so that one route accepts the key as a `?apiKey=` query param instead. Not a
 * weaker check — same comparison against `process.env.API_KEY`, just a different place to
 * read the value from. Every other route keeps using checkApiKey/checkApiKeyRaw unchanged. */
export function checkApiKeyQueryParam(request: NextRequest): Response | null {
  const apiKey = process.env.API_KEY
  if (!apiKey) {
    console.error("API_KEY environment variable is not set")
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500 })
  }
  if (request.nextUrl.searchParams.get("apiKey") !== apiKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }
  return null
}

export function sanitizePath(userPath: string): string {
  const resolved = path.resolve(ALLOWED_WRITE_DIR, userPath)
  if (!resolved.startsWith(ALLOWED_WRITE_DIR + path.sep) && resolved !== ALLOWED_WRITE_DIR) {
    throw new Error(`Path traversal detected: "${userPath}" is outside the allowed directory`)
  }
  return resolved
}
