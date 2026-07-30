import type { GitlabConfig } from "@/lib/gitlab-config-store"

export class GitlabApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type GitlabFetchInit = RequestInit & { raw?: boolean }

/**
 * Thin wrapper around GitLab's REST API (`/api/v4`). Uses the PRIVATE-TOKEN header
 * (project/personal access tokens) — not Authorization: Bearer, which GitLab's own
 * API does not accept for this token type. Never leaks GitLab's raw error body or a
 * stack trace to callers — every non-2xx becomes a typed, human-readable GitlabApiError.
 */
export async function gitlabFetch(
  config: Pick<GitlabConfig, "baseUrl" | "token">,
  path: string,
  init: GitlabFetchInit = {},
): Promise<any> {
  const { raw, ...fetchInit } = init
  const url = `${config.baseUrl}/api/v4${path}`

  let response: Response
  try {
    response = await fetch(url, {
      ...fetchInit,
      headers: {
        "PRIVATE-TOKEN": config.token,
        ...(fetchInit.body ? { "Content-Type": "application/json" } : {}),
        ...(fetchInit.headers || {}),
      },
    })
  } catch {
    throw new GitlabApiError(
      `Could not reach GitLab instance at ${config.baseUrl}. Check the URL and network connectivity.`,
      502,
    )
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GitlabApiError("Invalid or expired token.", response.status)
    }
    if (response.status === 404) {
      throw new GitlabApiError("Not found on GitLab (check the URL, project, or path).", 404)
    }
    let detail = ""
    try {
      const body = await response.json()
      detail = body?.message || body?.error || ""
    } catch {
      // body wasn't JSON – ignore, use generic message
    }
    throw new GitlabApiError(`GitLab request failed (${response.status})${detail ? `: ${detail}` : ""}`, response.status)
  }

  if (raw) return response.text()
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

/**
 * Validates a branch name against GitLab/git ref-name rules relevant to user input.
 * Returns null when valid, or a specific human-readable reason when not.
 */
export function validateBranchName(name: string): string | null {
  if (!name || !name.trim()) return "Branch name is required."
  if (/\s/.test(name)) return "Branch name cannot contain spaces."
  if (name.startsWith("/") || name.endsWith("/")) return "Branch name cannot start or end with a slash."
  if (name.includes("..")) return "Branch name cannot contain '..'."
  if (/[~^:?*[\\]/.test(name)) return "Branch name cannot contain any of: ~ ^ : ? * [ \\"
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(name)) return "Branch name cannot contain control characters."
  return null
}
