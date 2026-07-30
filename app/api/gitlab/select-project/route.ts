import { type NextRequest, NextResponse } from "next/server"
import { checkApiKey } from "@/lib/security"
import { gitlabFetch, GitlabApiError } from "@/lib/gitlab-client"
import { readGitlabConfig, updateGitlabConfig, maskToken } from "@/lib/gitlab-config-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authError = checkApiKey(request)
  if (authError) return authError

  const config = await readGitlabConfig()
  if (!config) return NextResponse.json({ error: "Not connected to GitLab" }, { status: 400 })

  const body = await request.json().catch(() => null)
  const projectId = Number(body?.projectId)
  const pathPrefix = typeof body?.pathPrefix === "string" ? body.pathPrefix.replace(/^\/+|\/+$/g, "") : ""

  if (!projectId || Number.isNaN(projectId)) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  try {
    const project = await gitlabFetch(config, `/projects/${projectId}`)
    const updated = await updateGitlabConfig({
      projectId,
      projectPath: project.path_with_namespace,
      defaultBranch: project.default_branch,
      pathPrefix,
    })
    return NextResponse.json({
      connected: true,
      baseUrl: updated.baseUrl,
      tokenPreview: maskToken(updated.token),
      projectId: updated.projectId,
      projectPath: updated.projectPath,
      defaultBranch: updated.defaultBranch,
      pathPrefix: updated.pathPrefix,
    })
  } catch (error) {
    if (error instanceof GitlabApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("GitLab select-project error:", error)
    return NextResponse.json({ error: "Failed to select project" }, { status: 500 })
  }
}
