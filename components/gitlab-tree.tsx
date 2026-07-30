"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronRight, Folder, FolderOpen, FileText, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface GitlabNode {
  id: string
  name: string
  type: "tree" | "blob"
  path: string
}

interface GitlabStatus {
  connected: boolean
  projectId?: number | null
  projectPath?: string | null
  pathPrefix?: string
}

const headers = { "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "" }

/**
 * Read-only browser for the connected GitLab repo, visually modeled on
 * components/workflow-tree.tsx (expand/collapse, folder icons) — different data
 * shape (GitLab tree nodes, not WorkflowFolder), same look & feel.
 */
export function GitlabTree() {
  const [status, setStatus] = useState<GitlabStatus | null>(null)
  const [rootNodes, setRootNodes] = useState<GitlabNode[] | null>(null)
  const [childrenByPath, setChildrenByPath] = useState<Record<string, GitlabNode[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loadingPath, setLoadingPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<{ path: string; content: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const fetchTree = useCallback(async (path: string): Promise<GitlabNode[]> => {
    const res = await fetch(`/api/gitlab/tree?path=${encodeURIComponent(path)}`, { headers })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to load repository tree")
    return data.nodes as GitlabNode[]
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/gitlab/status", { headers })
        const data = await res.json()
        setStatus(data)
        if (data.connected && data.projectId) {
          const nodes = await fetchTree(data.pathPrefix || "")
          setRootNodes(nodes)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load repository")
      }
    })()
  }, [fetchTree])

  const toggleFolder = async (node: GitlabNode) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(node.path)) next.delete(node.path)
      else next.add(node.path)
      return next
    })
    if (!childrenByPath[node.path]) {
      setLoadingPath(node.path)
      try {
        const nodes = await fetchTree(node.path)
        setChildrenByPath((prev) => ({ ...prev, [node.path]: nodes }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load folder")
      } finally {
        setLoadingPath(null)
      }
    }
  }

  const openFile = async (node: GitlabNode) => {
    setPreviewLoading(true)
    setPreviewFile({ path: node.path, content: "" })
    try {
      const res = await fetch(`/api/gitlab/file?path=${encodeURIComponent(node.path)}`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load file")
      setPreviewFile({ path: node.path, content: data.content })
    } catch (err) {
      setPreviewFile({ path: node.path, content: `// Failed to load: ${err instanceof Error ? err.message : "unknown error"}` })
    } finally {
      setPreviewLoading(false)
    }
  }

  const refresh = async () => {
    if (!status?.connected) return
    setChildrenByPath({})
    setExpanded(new Set())
    setError(null)
    try {
      const nodes = await fetchTree(status.pathPrefix || "")
      setRootNodes(nodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repository")
    }
  }

  const renderNodes = (nodes: GitlabNode[], depth: number): React.ReactNode =>
    nodes
      .slice()
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "tree" ? -1 : 1))
      .map((node) => {
        const isFolder = node.type === "tree"
        const isExpanded = expanded.has(node.path)
        return (
          <div key={node.id}>
            <div
              className="group flex items-center gap-1 px-2 py-[3px] rounded cursor-pointer hover:bg-accent select-none"
              style={{ paddingLeft: 8 + depth * 12 }}
              onClick={() => (isFolder ? toggleFolder(node) : openFile(node))}
            >
              {isFolder ? (
                <ChevronRight className={`w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              ) : (
                <span className="w-3 flex-shrink-0" />
              )}
              {isFolder ? (
                isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                )
              ) : (
                <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <span className="flex-1 min-w-0 text-xs text-foreground truncate">{node.name}</span>
              {loadingPath === node.path && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground flex-shrink-0" />}
            </div>
            {isFolder && isExpanded && childrenByPath[node.path] && (
              <div>{renderNodes(childrenByPath[node.path], depth + 1)}</div>
            )}
          </div>
        )
      })

  if (status === null) {
    return <div className="p-4 text-xs text-muted-foreground">Loading…</div>
  }

  if (!status.connected || !status.projectId) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-muted-foreground">Connect GitLab in Settings to browse your repo.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border flex-shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{status.projectPath}</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" title="Refresh" onClick={refresh}>
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {error && <p className="px-3 py-2 text-xs text-red-600">{error}</p>}
        {rootNodes && rootNodes.length === 0 && !error && (
          <p className="px-3 py-4 text-xs text-muted-foreground text-center">No files at this path</p>
        )}
        {rootNodes && renderNodes(rootNodes, 0)}
      </div>

      <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono truncate">{previewFile?.path}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gray-950 rounded-md p-3">
            {previewLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
            ) : (
              <pre className="text-[11px] font-mono text-gray-100 whitespace-pre-wrap">{previewFile?.content}</pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
