"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Download, FileCode, Package, FolderOpen, Gitlab, Loader2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { Workflow } from "@/types/workflow"
import { validateWorkflow } from "@/lib/validate-workflow"
import { validateBranchName } from "@/lib/gitlab-client"
import {
  blockToPlaywright,
  expandWorkflowSteps,
  generatePlaywrightSpecTS,
  generateCypressSpecTS,
  generatePlaywrightConfig,
  generatePackageJson,
  buildWorkflowConfig,
} from "@/lib/code-generators"

interface WorkflowExporterProps {
  workflows: Workflow[]
  baseUrl: string
  currentWorkflowId: string
}

type ExportFormat = "playwright" | "cypress" | "puppeteer" | "lilo"
type BundleMode = "full" | "tests-only"

interface GitlabStatus {
  connected: boolean
  projectId?: number | null
  projectPath?: string | null
  defaultBranch?: string | null
  pathPrefix?: string
}

interface SubmitResult {
  branchUrl: string
  commitUrl: string
  mergeRequestUrl: string
}

const gitlabHeaders = { "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "" }

export function WorkflowExporter({ workflows, baseUrl, currentWorkflowId }: WorkflowExporterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(currentWorkflowId)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("playwright")
  const [bundleMode, setBundleMode] = useState<BundleMode>("full")
  const { toast } = useToast()

  // ── GitLab submit state ──
  const [gitlabStatus, setGitlabStatus] = useState<GitlabStatus | null>(null)
  const [targetPath, setTargetPath] = useState("")
  const [branchName, setBranchName] = useState("")
  const [authorName, setAuthorName] = useLocalStorage("stitch-gitlab-author-name", "")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId)

  // Check GitLab connection once the dialog is opened.
  useEffect(() => {
    if (!isOpen) return
    fetch("/api/gitlab/status", { headers: gitlabHeaders })
      .then((r) => r.json())
      .then(setGitlabStatus)
      .catch(() => setGitlabStatus({ connected: false }))
  }, [isOpen])

  // Prefill target path + branch name whenever the selected workflow or the
  // connected project's path prefix changes. Deliberately simple: re-derives
  // defaults rather than trying to preserve manual edits across a workflow switch.
  useEffect(() => {
    if (!selectedWorkflow) return
    const slug = selectedWorkflow.name.toLowerCase().replace(/\s+/g, "-")
    const prefix = gitlabStatus?.pathPrefix ? `${gitlabStatus.pathPrefix}/` : ""
    setTargetPath(`${prefix}${slug}`)
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
    setBranchName(`stitch/${slug}-${stamp}`)
    setSubmitResult(null)
    setSubmitError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflowId, gitlabStatus?.pathPrefix])

  const generateCode = () => {
    if (!selectedWorkflow) return ""

    switch (exportFormat) {
      case "lilo": {
        const config = buildWorkflowConfig(workflows, selectedWorkflow.id, baseUrl)
        const slug = selectedWorkflow.name.toLowerCase().replace(/\s+/g, "-")
        return `// Lilo Workflow: ${selectedWorkflow.name}\n// Generated: ${new Date().toISOString()}\n\n${JSON.stringify(config, null, 2)}\n\n// Run: lilo ${slug}.json`
      }
      case "playwright":
        return generatePlaywrightSpecTS(selectedWorkflow, baseUrl, workflows)
      case "cypress":
        return generateCypressSpecTS(selectedWorkflow, baseUrl, workflows)
      case "puppeteer": {
        const steps = expandWorkflowSteps(selectedWorkflow.items, workflows, baseUrl, blockToPlaywright)
        return `const puppeteer = require('puppeteer');\n(async () => {\n  const browser = await puppeteer.launch({ headless: true });\n  const page = await browser.newPage();\n  await page.setViewport({ width: 1280, height: 720 });\n  try {\n${steps}\n  } finally {\n    await browser.close();\n  }\n})();\n`
      }
      default:
        return ""
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateCode())
      toast({ title: "Copied to clipboard" })
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" })
    }
  }

  const handleDownload = () => {
    if (!selectedWorkflow) return
    const ext = exportFormat === "lilo" ? "json" : exportFormat === "playwright" ? "spec.ts" : exportFormat === "cypress" ? "cy.ts" : "js"
    const filename = `${selectedWorkflow.name.toLowerCase().replace(/\s+/g, "-")}.${ext}`
    const blob = new Blob([generateCode()], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    toast({ title: `Downloaded ${filename}` })
  }

  const handleDownloadBundle = async () => {
    if (!selectedWorkflow) return
    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()
      const slug = selectedWorkflow.name.toLowerCase().replace(/\s+/g, "-")
      const specContent = generatePlaywrightSpecTS(selectedWorkflow, baseUrl, workflows)

      if (bundleMode === "full") {
        zip.folder("tests")!.file(`${slug}.spec.ts`, specContent)
        zip.file("playwright.config.ts", generatePlaywrightConfig(baseUrl))
        zip.file("package.json", generatePackageJson(selectedWorkflow.name))
        zip.file("README.md", `# ${selectedWorkflow.name}\n\nGenerated by Stitch on ${new Date().toLocaleDateString()}.\n\n\`\`\`bash\nnpm install\nnpx playwright install --with-deps chromium\nBASE_URL=https://your-app.com npm test\n\`\`\`\n`)
      } else {
        zip.file(`${slug}.spec.ts`, specContent)
      }

      const blob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${slug}-${bundleMode === "full" ? "e2e" : "tests"}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: `Downloaded ${slug}.zip` })
    } catch {
      toast({ title: "Failed to generate ZIP", variant: "destructive" })
    }
  }

  const handleSubmitToGitlab = async () => {
    if (!selectedWorkflow) return
    setSubmitting(true)
    setSubmitError(null)
    setSubmitResult(null)
    try {
      const jsonConfig = buildWorkflowConfig(workflows, selectedWorkflow.id, baseUrl)
      const specContent = generatePlaywrightSpecTS(selectedWorkflow, baseUrl, workflows)
      const files = [
        { path: `${targetPath}.stitch.json`, content: JSON.stringify(jsonConfig, null, 2) },
        { path: `${targetPath}.spec.ts`, content: specContent },
      ]
      const res = await fetch("/api/gitlab/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gitlabHeaders },
        body: JSON.stringify({
          branchName,
          files,
          commitMessage: `Add test: ${selectedWorkflow.name}`,
          authorName: authorName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || "Submit failed")
        return
      }
      setSubmitResult(data)
      toast({ title: "Submitted to GitLab", description: "Merge request opened" })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Submit failed")
    } finally {
      setSubmitting(false)
    }
  }

  const code = generateCode()
  const hasSteps = !!selectedWorkflow && selectedWorkflow.items.length > 0
  const gitlabValidationErrors = selectedWorkflow ? validateWorkflow(selectedWorkflow.items) : []
  const branchNameError = branchName ? validateBranchName(branchName) : null
  const gitlabReady = !!gitlabStatus?.connected && !!gitlabStatus?.projectId
  const canSubmit =
    hasSteps && gitlabReady && gitlabValidationErrors.length === 0 && !branchNameError && targetPath.trim() !== "" && !submitting

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
          <FileCode className="w-3.5 h-3.5" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileCode className="w-4 h-4" />
            Export as Code
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-5 flex-1 min-h-0 pt-1">
          {/* Left: settings */}
          <div className="w-52 flex-shrink-0 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Workflow</Label>
              <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {workflows.map((w) => (
                    <SelectItem key={w.id} value={w.id} className="text-xs">
                      {w.name} ({w.items.length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="playwright" className="text-xs">Playwright</SelectItem>
                  <SelectItem value="cypress" className="text-xs">Cypress</SelectItem>
                  <SelectItem value="puppeteer" className="text-xs">Puppeteer</SelectItem>
                  <SelectItem value="lilo" className="text-xs">Lilo Workflow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">CI Bundle (.zip)</Label>
              <div className="space-y-1.5">
                <button
                  onClick={() => setBundleMode("full")}
                  className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors ${bundleMode === "full" ? "border-primary bg-accent text-primary" : "border-border hover:border-ring/50 text-muted-foreground"}`}
                >
                  <div className="flex items-center gap-1.5 font-medium mb-0.5">
                    <Package className="w-3 h-3" /> Full scaffolding
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Config, package.json, README</p>
                </button>
                <button
                  onClick={() => setBundleMode("tests-only")}
                  className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors ${bundleMode === "tests-only" ? "border-primary bg-accent text-primary" : "border-border hover:border-ring/50 text-muted-foreground"}`}
                >
                  <div className="flex items-center gap-1.5 font-medium mb-0.5">
                    <FolderOpen className="w-3 h-3" /> Tests only
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Drop into existing project</p>
                </button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs gap-1.5 mt-1"
                onClick={handleDownloadBundle}
                disabled={!hasSteps}
              >
                <Download className="w-3.5 h-3.5" />
                Download .zip
              </Button>
            </div>

            {exportFormat === "playwright" && (
              <div className="space-y-1.5 pt-1 border-t border-border mt-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Gitlab className="w-3 h-3" /> Submit to GitLab
                </Label>

                {!gitlabStatus ? (
                  <p className="text-[10px] text-muted-foreground">Checking connection…</p>
                ) : !gitlabReady ? (
                  <p className="text-[10px] text-muted-foreground">
                    Connect GitLab and select a project in Settings to submit directly.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="gitlab-target-path" className="text-[10px] text-muted-foreground">
                        Path (in {gitlabStatus.projectPath})
                      </Label>
                      <Input
                        id="gitlab-target-path"
                        value={targetPath}
                        onChange={(e) => setTargetPath(e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="gitlab-branch-name" className="text-[10px] text-muted-foreground">Branch name</Label>
                      <Input
                        id="gitlab-branch-name"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                      {branchNameError && <p className="text-[10px] text-red-600">{branchNameError}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="gitlab-author-name" className="text-[10px] text-muted-foreground">Your name (optional)</Label>
                      <Input
                        id="gitlab-author-name"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Jane Doe"
                        className="h-7 text-xs"
                      />
                    </div>
                    {gitlabValidationErrors.length > 0 && (
                      <p className="text-[10px] text-orange-600">
                        Fix {gitlabValidationErrors.length} required field{gitlabValidationErrors.length !== 1 ? "s" : ""} before submitting.
                      </p>
                    )}
                    {submitError && <p className="text-[10px] text-red-600">{submitError}</p>}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs gap-1.5"
                      onClick={handleSubmitToGitlab}
                      disabled={!canSubmit}
                    >
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gitlab className="w-3.5 h-3.5" />}
                      Submit to GitLab
                    </Button>
                    {submitResult && (
                      <div className="space-y-1.5 pt-1">
                        <a
                          href={submitResult.mergeRequestUrl}
                          target="_blank"
                          rel="noopener"
                          className="flex items-center justify-center gap-1.5 w-full h-7 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> View Merge Request
                        </a>
                        <div className="flex items-center justify-between text-[10px]">
                          <a href={submitResult.branchUrl} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground underline">
                            Branch
                          </a>
                          <a href={submitResult.commitUrl} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground underline">
                            Commit
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: code preview */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2" onClick={handleCopy} disabled={!hasSteps}>
                  <Copy className="w-3 h-3" /> Copy
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2" onClick={handleDownload} disabled={!hasSteps}>
                  <Download className="w-3 h-3" /> Download
                </Button>
              </div>
            </div>
            <Textarea
              value={hasSteps ? code : "// Add steps to your workflow to preview the code"}
              readOnly
              className="flex-1 font-mono text-xs resize-none min-h-[300px] bg-gray-950 text-gray-100 border-gray-800"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
