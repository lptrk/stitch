import fs from "fs/promises"
import { sanitizePath } from "@/lib/security"

export interface GitlabConfig {
  baseUrl: string
  token: string
  projectId?: number
  projectPath?: string
  defaultBranch?: string
  pathPrefix?: string
}

const CONFIG_FILENAME = "gitlab-config.json"

export async function readGitlabConfig(): Promise<GitlabConfig | null> {
  try {
    const raw = await fs.readFile(sanitizePath(CONFIG_FILENAME), "utf-8")
    return JSON.parse(raw) as GitlabConfig
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

export async function writeGitlabConfig(config: GitlabConfig): Promise<void> {
  await fs.mkdir(sanitizePath("."), { recursive: true })
  await fs.writeFile(sanitizePath(CONFIG_FILENAME), JSON.stringify(config, null, 2), "utf-8")
}

export async function updateGitlabConfig(patch: Partial<GitlabConfig>): Promise<GitlabConfig> {
  const existing = await readGitlabConfig()
  if (!existing) throw new Error("No GitLab connection configured yet")
  const updated = { ...existing, ...patch }
  await writeGitlabConfig(updated)
  return updated
}

export async function deleteGitlabConfig(): Promise<void> {
  try {
    await fs.unlink(sanitizePath(CONFIG_FILENAME))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}

/** Never return a raw token to the client — last 4 chars only. */
export function maskToken(token: string): string {
  return `••••${token.slice(-4)}`
}
