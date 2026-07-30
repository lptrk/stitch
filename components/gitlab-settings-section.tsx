"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Gitlab, Loader2, CheckCircle, Search, FolderGit2 } from "lucide-react"

interface GitlabStatus {
  connected: boolean
  baseUrl?: string
  tokenPreview?: string
  projectId?: number | null
  projectPath?: string | null
  defaultBranch?: string | null
  pathPrefix?: string
}

interface GitlabProject {
  id: number
  name: string
  pathWithNamespace: string
  defaultBranch: string
}

const headers = { "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "" }
const jsonHeaders = { ...headers, "Content-Type": "application/json" }

export function GitlabSettingsSection() {
  const [status, setStatus] = useState<GitlabStatus | null>(null) // null = still loading
  const [baseUrlInput, setBaseUrlInput] = useState("")
  const [tokenInput, setTokenInput] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const [projectSearch, setProjectSearch] = useState("")
  const [projects, setProjects] = useState<GitlabProject[]>([])
  const [searchingProjects, setSearchingProjects] = useState(false)
  const [pathPrefixInput, setPathPrefixInput] = useState("")
  const [selectingProjectId, setSelectingProjectId] = useState<number | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/gitlab/status", { headers })
      const data = await res.json()
      setStatus(data)
      if (data.connected) setPathPrefixInput(data.pathPrefix || "")
    } catch {
      setStatus({ connected: false })
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleConnect = async () => {
    setConnecting(true)
    setConnectError(null)
    try {
      const res = await fetch("/api/gitlab/connect", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ baseUrl: baseUrlInput, token: tokenInput }),
      })
      const data = await res.json()
      if (!res.ok) {
        setConnectError(data.error || "Connection failed")
        return
      }
      setTokenInput("")
      await fetchStatus()
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Connection failed")
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await fetch("/api/gitlab/disconnect", { method: "POST", headers })
    setProjects([])
    setProjectSearch("")
    setBaseUrlInput("")
    await fetchStatus()
  }

  const searchProjects = async (query: string) => {
    setProjectSearch(query)
    setSearchingProjects(true)
    try {
      const res = await fetch(`/api/gitlab/projects?search=${encodeURIComponent(query)}`, { headers })
      const data = await res.json()
      setProjects(res.ok ? data.projects : [])
    } catch {
      setProjects([])
    } finally {
      setSearchingProjects(false)
    }
  }

  const selectProject = async (projectId: number) => {
    setSelectingProjectId(projectId)
    try {
      const res = await fetch("/api/gitlab/select-project", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ projectId, pathPrefix: pathPrefixInput }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(data)
        setProjects([])
        setProjectSearch("")
      }
    } finally {
      setSelectingProjectId(null)
    }
  }

  if (status === null) {
    return (
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Gitlab className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GitLab</Label>
        </div>
        <p className="text-xs text-muted-foreground">Checking connection…</p>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Gitlab className="w-3.5 h-3.5 text-primary" />
        <Label className="text-xs font-semibold uppercase tracking-wide text-foreground">GitLab</Label>
      </div>

      {!status.connected ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Submit workflows as a branch + merge request instead of downloading files.
          </p>
          <div>
            <Label htmlFor="gitlab-instance-url" className="text-[10px] text-muted-foreground">
              GitLab instance URL (not the app you're testing)
            </Label>
            <Input
              id="gitlab-instance-url"
              type="url"
              value={baseUrlInput}
              onChange={(e) => setBaseUrlInput(e.target.value)}
              placeholder="https://gitlab.example.com"
              className="h-8 text-sm mt-1"
            />
          </div>
          <Input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Project access token"
            className="h-8 text-sm"
          />
          {connectError && <p className="text-xs text-red-600">{connectError}</p>}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 w-full"
            onClick={handleConnect}
            disabled={connecting || !baseUrlInput.trim() || !tokenInput.trim()}
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gitlab className="w-3.5 h-3.5" />}
            Connect
          </Button>
          <p className="text-xs text-muted-foreground">
            Works with self-hosted GitLab too — just point the URL at your instance. Use a project or group access
            token with the <code className="bg-muted px-1 rounded">api</code> scope, Developer role. The token stays
            on the server, never in your browser.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle className="w-3.5 h-3.5" />
              Connected to {status.baseUrl}
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-red-500" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Token {status.tokenPreview}</p>

          {status.projectPath ? (
            <div className="space-y-1.5 rounded-md border border-border p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <FolderGit2 className="w-3.5 h-3.5 text-primary/70" />
                {status.projectPath}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Default branch: {status.defaultBranch} · Path: {status.pathPrefix || "/ (repo root)"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setStatus({ ...status, projectId: undefined, projectPath: null })}
              >
                Change project
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={projectSearch}
                  onChange={(e) => searchProjects(e.target.value)}
                  placeholder="Search projects…"
                  className="h-8 text-xs pl-8"
                />
              </div>
              {searchingProjects && <p className="text-xs text-muted-foreground">Searching…</p>}
              {projects.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-border rounded-md divide-y divide-border">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectProject(p.id)}
                      disabled={selectingProjectId !== null}
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{p.pathWithNamespace}</span>
                      {selectingProjectId === p.id && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <Label htmlFor="gitlab-path-prefix" className="text-[10px] text-muted-foreground">
                  Path prefix (where test definitions live, optional)
                </Label>
                <Input
                  id="gitlab-path-prefix"
                  value={pathPrefixInput}
                  onChange={(e) => setPathPrefixInput(e.target.value)}
                  placeholder="e2e/definitions"
                  className="h-7 text-xs mt-1"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
