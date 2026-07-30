"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, MousePointer, Puzzle, Play } from "lucide-react"

export default function ExtensionInstallPage() {
  const [downloading, setDownloading] = useState(false)

  const handleDownloadExtension = async () => {
    setDownloading(true)
    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()

      const files = [
        "manifest.json",
        "background.js",
        "content.js",
        "content.css",
        "stitch-bridge.js",
        "popup.html",
        "popup.js",
        "icon-16.png",
        "icon-32.png",
        "icon.png",
        "icon-128.png",
      ]

      await Promise.all(
        files.map(async (file) => {
          try {
            const res = await fetch(`/extension/${file}`)
            if (!res.ok) return
            const isBinary = file.endsWith(".png")
            if (isBinary) {
              zip.file(file, await res.blob())
            } else {
              zip.file(file, await res.text())
            }
          } catch {}
        })
      )

      const blob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "stitch-extension.zip"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Download failed:", e)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b border-border px-6 h-11 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>
        <div className="w-px h-4 bg-border" />
        <span className="text-sm text-muted-foreground font-medium">How it works</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-12">

        {/* How it works */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview</h2>
          <div className="space-y-0 divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
            {[
              {
                icon: MousePointer,
                color: "bg-blue-500",
                title: "Pick elements from your app",
                desc: "Install the browser extension and click the crosshair button in any selector field. Click any element in your running app to capture its selector automatically.",
              },
              {
                icon: Puzzle,
                color: "bg-violet-500",
                title: "Build workflows with blocks",
                desc: "Drag blocks from the left sidebar into your workflow. Each block is a single action — navigate, click, fill, assert. Use ⌘K / Ctrl+K to search blocks quickly.",
              },
              {
                icon: Play,
                color: "bg-green-500",
                title: "Run and export",
                desc: "Click Run or press ⌘↵ / Ctrl+Enter to execute the workflow. Inspect step results in the right panel. Export as Playwright or Cypress code, or download a CI bundle.",
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="flex gap-4 px-5 py-4">
                <div className={`w-7 h-7 ${color} rounded-md flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Keyboard shortcuts */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keyboard shortcuts</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {[
              { group: "Global" },
              { keys: ["⌘K", "Ctrl+K"], desc: "Add block (command palette)" },
              { keys: ["⌘↵", "Ctrl+Enter"], desc: "Run workflow" },
              { keys: ["⌘Z", "Ctrl+Z"], desc: "Undo" },
              { keys: ["⌘⇧Z", "Ctrl+Y"], desc: "Redo" },
              { keys: ["?"], desc: "Show all shortcuts" },
              { keys: ["Esc"], desc: "Deselect / close" },
              { group: "Canvas" },
              { keys: ["↑ / ↓"], desc: "Navigate between steps" },
              { keys: ["⌘↑ / ↓", "Ctrl+↑ / ↓"], desc: "Move step up / down" },
              { keys: ["D"], desc: "Duplicate selected step" },
              { keys: ["⌫"], desc: "Delete selected step" },
              { group: "Parameter fields" },
              { keys: ["Tab / ⇧Tab"], desc: "Next / previous field" },
              { keys: ["@"], desc: "Start element picker (selector fields)" },
              { keys: ["/"], desc: "Insert environment variable" },
            ].map((row, i) => {
              if ("group" in row) {
                return (
                  <div key={i} className="px-4 py-2 bg-muted border-b border-border/60">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{row.group}</span>
                  </div>
                )
              }
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 last:border-0">
                  <span className="text-sm text-muted-foreground">{row.desc}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                    {row.keys.map((k, ki) => (
                      <span key={ki} className="flex items-center gap-1">
                        {ki > 0 && <span className="text-[10px] text-muted-foreground/70">/</span>}
                        <kbd className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono text-muted-foreground whitespace-nowrap">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Extension install */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Browser extension</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div>
                <p className="text-sm font-medium text-foreground">stitch-extension.zip</p>
                <p className="text-xs text-muted-foreground mt-0.5">Chrome, Edge, Brave · Manifest V3</p>
              </div>
              <button
                onClick={handleDownloadExtension}
                disabled={downloading}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {downloading ? "Preparing…" : "Download"}
              </button>
            </div>

            <ol className="divide-y divide-border">
              {[
                { title: "Unzip the downloaded file", desc: "Extract stitch-extension.zip anywhere on your machine." },
                { title: "Open the extensions page", desc: "In Chrome/Edge/Brave, navigate to chrome://extensions" },
                { title: "Enable Developer Mode", desc: 'Toggle "Developer mode" in the top-right corner.' },
                { title: "Load unpacked", desc: 'Click "Load unpacked" and select the extracted folder.' },
                { title: "Set the Stitch URL", desc: "Click the extension icon → enter the URL where Stitch is running → Save." },
              ].map(({ title, desc }, i) => (
                <li key={i} className="flex gap-4 px-5 py-3.5">
                  <span className="w-5 h-5 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="pb-4">
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Back to Stitch
          </Link>
        </div>
      </div>
    </div>
  )
}
