import { type NextRequest, NextResponse } from "next/server"
import { checkApiKey } from "@/lib/security"
import { readGitlabConfig, maskToken } from "@/lib/gitlab-config-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authError = checkApiKey(request)
  if (authError) return authError

  try {
    const config = await readGitlabConfig()
    if (!config) return NextResponse.json({ connected: false })

    return NextResponse.json({
      connected: true,
      baseUrl: config.baseUrl,
      tokenPreview: maskToken(config.token),
      projectId: config.projectId ?? null,
      projectPath: config.projectPath ?? null,
      defaultBranch: config.defaultBranch ?? null,
      pathPrefix: config.pathPrefix ?? "",
    })
  } catch (error) {
    console.error("GitLab status error:", error)
    return NextResponse.json({ error: "Failed to read GitLab connection state" }, { status: 500 })
  }
}
