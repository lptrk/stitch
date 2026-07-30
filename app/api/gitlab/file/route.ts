import { type NextRequest, NextResponse } from "next/server"
import { checkApiKey } from "@/lib/security"
import { gitlabFetch, GitlabApiError } from "@/lib/gitlab-client"
import { readGitlabConfig } from "@/lib/gitlab-config-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authError = checkApiKey(request)
  if (authError) return authError

  const config = await readGitlabConfig()
  if (!config) return NextResponse.json({ error: "Not connected to GitLab" }, { status: 400 })
  if (!config.projectId) return NextResponse.json({ error: "No project selected" }, { status: 400 })

  const path = request.nextUrl.searchParams.get("path")
  const ref = request.nextUrl.searchParams.get("ref") ?? config.defaultBranch
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 })

  try {
    const encodedPath = encodeURIComponent(path)
    const content = await gitlabFetch(
      config,
      `/projects/${config.projectId}/repository/files/${encodedPath}/raw${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`,
      { raw: true },
    )
    return NextResponse.json({ path, content })
  } catch (error) {
    if (error instanceof GitlabApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("GitLab file error:", error)
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 })
  }
}
