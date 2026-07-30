import { type NextRequest, NextResponse } from "next/server"
import { checkApiKey } from "@/lib/security"
import { gitlabFetch, GitlabApiError } from "@/lib/gitlab-client"
import { writeGitlabConfig, maskToken } from "@/lib/gitlab-config-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authError = checkApiKey(request)
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const baseUrlInput = typeof body?.baseUrl === "string" ? body.baseUrl.trim() : ""
  const token = typeof body?.token === "string" ? body.token.trim() : ""

  if (!/^https?:\/\/.+/i.test(baseUrlInput)) {
    return NextResponse.json({ error: "Instance URL must start with http:// or https://" }, { status: 400 })
  }
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 })
  }
  const baseUrl = baseUrlInput.replace(/\/+$/, "")

  try {
    // Validate before persisting anything — a broken connection never gets written.
    const version = await gitlabFetch({ baseUrl, token }, "/version")
    await writeGitlabConfig({ baseUrl, token })
    return NextResponse.json({ connected: true, gitlabVersion: version?.version ?? "unknown", tokenPreview: maskToken(token) })
  } catch (error) {
    if (error instanceof GitlabApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("GitLab connect error:", error)
    return NextResponse.json({ error: "Failed to connect to GitLab" }, { status: 500 })
  }
}
