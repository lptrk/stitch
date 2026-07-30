import { type NextRequest, NextResponse } from "next/server"
import { checkApiKey } from "@/lib/security"
import { gitlabFetch, GitlabApiError, validateBranchName } from "@/lib/gitlab-client"
import { readGitlabConfig } from "@/lib/gitlab-config-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface SubmitFile {
  path: string
  content: string
}

export async function POST(request: NextRequest) {
  const authError = checkApiKey(request)
  if (authError) return authError

  // Validate the request shape first — independent of GitLab connection state,
  // so these checks are exercisable without a live connection configured.
  const body = await request.json().catch(() => null)
  const branchName = typeof body?.branchName === "string" ? body.branchName.trim() : ""
  const files: SubmitFile[] = Array.isArray(body?.files) ? body.files : []
  const commitMessage =
    typeof body?.commitMessage === "string" && body.commitMessage.trim() ? body.commitMessage.trim() : "Add test via Stitch"
  const authorName = typeof body?.authorName === "string" && body.authorName.trim() ? body.authorName.trim() : undefined
  const authorEmail = typeof body?.authorEmail === "string" && body.authorEmail.trim() ? body.authorEmail.trim() : undefined

  const branchError = validateBranchName(branchName)
  if (branchError) return NextResponse.json({ error: branchError }, { status: 400 })

  if (files.length === 0 || files.some((f) => !f?.path || typeof f.content !== "string")) {
    return NextResponse.json({ error: "At least one file with a path and content is required" }, { status: 400 })
  }

  const config = await readGitlabConfig()
  if (!config) return NextResponse.json({ error: "Not connected to GitLab" }, { status: 400 })
  if (!config.projectId) return NextResponse.json({ error: "No project selected" }, { status: 400 })
  if (!config.defaultBranch) {
    return NextResponse.json(
      { error: "No default branch known for this project — reconnect or reselect the project" },
      { status: 400 },
    )
  }

  const projectId = config.projectId
  const defaultBranch = config.defaultBranch

  try {
    // 1. Branch collision check — 404 means free, anything else means it already exists.
    let branchExists = true
    try {
      await gitlabFetch(config, `/projects/${projectId}/repository/branches/${encodeURIComponent(branchName)}`)
    } catch (err) {
      if (err instanceof GitlabApiError && err.status === 404) branchExists = false
      else throw err
    }
    if (branchExists) {
      return NextResponse.json({ error: `Branch "${branchName}" already exists. Choose a different name.` }, { status: 409 })
    }

    // 2. Create the branch fresh off the default branch.
    const branch = await gitlabFetch(
      config,
      `/projects/${projectId}/repository/branches?branch=${encodeURIComponent(branchName)}&ref=${encodeURIComponent(defaultBranch)}`,
      { method: "POST" },
    )

    // 3. Determine create/update per file (the new branch is a fresh copy of default,
    //    so a file already existing there needs "update", not "create").
    const actions = await Promise.all(
      files.map(async (file) => {
        let action: "create" | "update" = "create"
        try {
          await gitlabFetch(
            config,
            `/projects/${projectId}/repository/files/${encodeURIComponent(file.path)}?ref=${encodeURIComponent(branchName)}`,
          )
          action = "update"
        } catch (err) {
          if (!(err instanceof GitlabApiError && err.status === 404)) throw err
        }
        return { action, file_path: file.path, content: file.content, encoding: "text" }
      }),
    )

    // 4. Atomic multi-file commit.
    const commit = await gitlabFetch(config, `/projects/${projectId}/repository/commits`, {
      method: "POST",
      body: JSON.stringify({
        branch: branchName,
        commit_message: commitMessage,
        actions,
        ...(authorName ? { author_name: authorName } : {}),
        ...(authorEmail ? { author_email: authorEmail } : {}),
      }),
    })

    // 5. Open the merge request.
    const title = commitMessage.split("\n")[0]
    const description = [
      "Submitted via Stitch.",
      "",
      "Files:",
      ...files.map((f) => `- \`${f.path}\``),
      "",
      "_Generated-by: Stitch_",
    ].join("\n")

    const mr = await gitlabFetch(config, `/projects/${projectId}/merge_requests`, {
      method: "POST",
      body: JSON.stringify({
        source_branch: branchName,
        target_branch: defaultBranch,
        title,
        description,
      }),
    })

    const projectPath = config.projectPath || String(projectId)
    return NextResponse.json({
      branchUrl: branch?.web_url || `${config.baseUrl}/${projectPath}/-/tree/${encodeURIComponent(branchName)}`,
      commitUrl: `${config.baseUrl}/${projectPath}/-/commit/${commit?.id}`,
      mergeRequestUrl: mr?.web_url,
    })
  } catch (error) {
    if (error instanceof GitlabApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("GitLab submit error:", error)
    return NextResponse.json({ error: "Failed to submit to GitLab" }, { status: 500 })
  }
}
