import { type NextRequest, NextResponse } from "next/server"
import { checkApiKey } from "@/lib/security"
import { gitlabFetch, GitlabApiError } from "@/lib/gitlab-client"
import { readGitlabConfig } from "@/lib/gitlab-config-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// v1: first page only (per_page=50). GitLab paginates further pages via Link headers —
// deliberately not built here; fine for typing a search term to narrow down a project.
export async function GET(request: NextRequest) {
  const authError = checkApiKey(request)
  if (authError) return authError

  const config = await readGitlabConfig()
  if (!config) return NextResponse.json({ error: "Not connected to GitLab" }, { status: 400 })

  const search = request.nextUrl.searchParams.get("search") || ""

  try {
    const projects = await gitlabFetch(
      config,
      `/projects?membership=true&per_page=50&page=1&order_by=last_activity_at&search=${encodeURIComponent(search)}`,
    )
    const mapped = (Array.isArray(projects) ? projects : []).map((p: any) => ({
      id: p.id,
      name: p.name,
      pathWithNamespace: p.path_with_namespace,
      defaultBranch: p.default_branch,
    }))
    return NextResponse.json({ projects: mapped })
  } catch (error) {
    if (error instanceof GitlabApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("GitLab projects error:", error)
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 })
  }
}
