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

  const path = request.nextUrl.searchParams.get("path") ?? config.pathPrefix ?? ""
  const ref = request.nextUrl.searchParams.get("ref") ?? config.defaultBranch

  try {
    const qs = new URLSearchParams({ recursive: "true", per_page: "100" })
    if (path) qs.set("path", path)
    if (ref) qs.set("ref", ref)
    const nodes = await gitlabFetch(config, `/projects/${config.projectId}/repository/tree?${qs.toString()}`)
    const mapped = (Array.isArray(nodes) ? nodes : []).map((n: any) => ({
      id: n.id,
      name: n.name,
      type: n.type as "tree" | "blob",
      path: n.path,
    }))
    return NextResponse.json({ nodes: mapped })
  } catch (error) {
    if (error instanceof GitlabApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("GitLab tree error:", error)
    return NextResponse.json({ error: "Failed to load repository tree" }, { status: 500 })
  }
}
