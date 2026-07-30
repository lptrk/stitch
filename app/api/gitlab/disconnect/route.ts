import { type NextRequest, NextResponse } from "next/server"
import { checkApiKey } from "@/lib/security"
import { deleteGitlabConfig } from "@/lib/gitlab-config-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authError = checkApiKey(request)
  if (authError) return authError

  try {
    await deleteGitlabConfig()
    return NextResponse.json({ connected: false })
  } catch (error) {
    console.error("GitLab disconnect error:", error)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }
}
