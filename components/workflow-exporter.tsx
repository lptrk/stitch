"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Download, FileCode, Play, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Workflow } from "@/types/workflow"

interface WorkflowExporterProps {
  workflows: Workflow[]
  baseUrl: string
  currentWorkflowId: string
}

type ExportFormat = "playwright" | "cypress" | "puppeteer"

export function WorkflowExporter({ workflows, baseUrl, currentWorkflowId }: WorkflowExporterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(currentWorkflowId)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("playwright")
  const { toast } = useToast()

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId)

  const generatePlaywrightCode = (workflow: Workflow) => {
    const steps = workflow.items
      .map((item, index) => {
        const params = item.parameters || {}

        switch (item.blockId) {
          case "navigate":
            const url = params.url || "/"
            const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`
            return `  // Step ${index + 1}: Navigate to ${url}
  await page.goto('${fullUrl}');
  await page.waitForLoadState('networkidle');`

          case "click":
            return `  // Step ${index + 1}: Click element
  await page.click('${params.selector || "button"}');`

          case "fill":
            return `  // Step ${index + 1}: Fill input
  await page.fill('${params.selector || "input"}', '${params.value || ""}');`

          case "expect-visible":
            return `  // Step ${index + 1}: Expect element to be visible
  await expect(page.locator('${params.selector || "element"}')).toBeVisible();`

          case "expect-text":
            return `  // Step ${index + 1}: Expect text content
  await expect(page.locator('${params.selector || "element"}')).toContainText('${params.text || ""}');`

          case "wait":
            return `  // Step ${index + 1}: Wait
  await page.waitForTimeout(${params.duration || 1000});`

          case "wait-for-element":
            return `  // Step ${index + 1}: Wait for element
  await page.waitForSelector('${params.selector || "element"}');`

          case "callWorkflow":
            return `  // Step ${index + 1}: Call sub-workflow
  // Note: Sub-workflow '${params.workflowId}' should be implemented separately`

          default:
            if (item.block.isCustom) {
              return `  // Step ${index + 1}: Custom block - ${item.block.name}
  // Custom implementation needed for: ${item.block.description}`
            }
            return `  // Step ${index + 1}: ${item.block.name}
  // Implementation needed for block: ${item.blockId}`
        }
      })
      .join("\n\n")

    return `// Generated Playwright Test for: ${workflow.name}
// Description: ${workflow.description || "No description"}
// Generated on: ${new Date().toISOString()}

import { test, expect } from '@playwright/test';

test('${workflow.name}', async ({ page }) => {
  console.log('🎭 Starting test: ${workflow.name}');
  
${steps}

  console.log('✅ Test completed successfully');
});

// Setup Instructions:
// 1. Install Playwright: npm install -D @playwright/test
// 2. Install browsers: npx playwright install
// 3. Run test: npx playwright test
// 4. Run with UI: npx playwright test --ui
// 5. Generate report: npx playwright show-report`
  }

  const generateCypressCode = (workflow: Workflow) => {
    const steps = workflow.items
      .map((item, index) => {
        const params = item.parameters || {}

        switch (item.blockId) {
          case "navigate":
            const url = params.url || "/"
            const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`
            return `    // Step ${index + 1}: Navigate to ${url}
    cy.visit('${fullUrl}');`

          case "click":
            return `    // Step ${index + 1}: Click element
    cy.get('${params.selector || "button"}').click();`

          case "fill":
            return `    // Step ${index + 1}: Fill input
    cy.get('${params.selector || "input"}').type('${params.value || ""}');`

          case "expect-visible":
            return `    // Step ${index + 1}: Expect element to be visible
    cy.get('${params.selector || "element"}').should('be.visible');`

          case "expect-text":
            return `    // Step ${index + 1}: Expect text content
    cy.get('${params.selector || "element"}').should('contain.text', '${params.text || ""}');`

          case "wait":
            return `    // Step ${index + 1}: Wait
    cy.wait(${params.duration || 1000});`

          case "wait-for-element":
            return `    // Step ${index + 1}: Wait for element
    cy.get('${params.selector || "element"}').should('exist');`

          case "callWorkflow":
            return `    // Step ${index + 1}: Call sub-workflow
    // Note: Sub-workflow '${params.workflowId}' should be implemented separately`

          default:
            if (item.block.isCustom) {
              return `    // Step ${index + 1}: Custom block - ${item.block.name}
    // Custom implementation needed for: ${item.block.description}`
            }
            return `    // Step ${index + 1}: ${item.block.name}
    // Implementation needed for block: ${item.blockId}`
        }
      })
      .join("\n\n")

    return `// Generated Cypress Test for: ${workflow.name}
// Description: ${workflow.description || "No description"}
// Generated on: ${new Date().toISOString()}

describe('${workflow.name}', () => {
  it('should execute workflow successfully', () => {
    console.log('🌲 Starting Cypress test: ${workflow.name}');
    
${steps}

    console.log('✅ Test completed successfully');
  });
});

// Setup Instructions:
// 1. Install Cypress: npm install -D cypress
// 2. Open Cypress: npx cypress open
// 3. Run headless: npx cypress run
// 4. Configure baseUrl in cypress.config.js:
//    export default defineConfig({
//      e2e: { baseUrl: '${baseUrl}' }
//    })`
  }

  const generatePuppeteerCode = (workflow: Workflow) => {
    const steps = workflow.items
      .map((item, index) => {
        const params = item.parameters || {}

        switch (item.blockId) {
          case "navigate":
            const url = params.url || "/"
            const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`
            return `  // Step ${index + 1}: Navigate to ${url}
  await page.goto('${fullUrl}', { waitUntil: 'networkidle0' });`

          case "click":
            return `  // Step ${index + 1}: Click element
  await page.click('${params.selector || "button"}');`

          case "fill":
            return `  // Step ${index + 1}: Fill input
  await page.type('${params.selector || "input"}', '${params.value || ""}');`

          case "expect-visible":
            return `  // Step ${index + 1}: Expect element to be visible
  await page.waitForSelector('${params.selector || "element"}', { visible: true });`

          case "expect-text":
            return `  // Step ${index + 1}: Expect text content
  const textContent = await page.$eval('${params.selector || "element"}', el => el.textContent);
  if (!textContent.includes('${params.text || ""}')) {
    throw new Error('Expected text not found');
  }`

          case "wait":
            return `  // Step ${index + 1}: Wait
  await page.waitForTimeout(${params.duration || 1000});`

          case "wait-for-element":
            return `  // Step ${index + 1}: Wait for element
  await page.waitForSelector('${params.selector || "element"}');`

          case "callWorkflow":
            return `  // Step ${index + 1}: Call sub-workflow
  // Note: Sub-workflow '${params.workflowId}' should be implemented separately`

          default:
            if (item.block.isCustom) {
              return `  // Step ${index + 1}: Custom block - ${item.block.name}
  // Custom implementation needed for: ${item.block.description}`
            }
            return `  // Step ${index + 1}: ${item.block.name}
  // Implementation needed for block: ${item.blockId}`
        }
      })
      .join("\n\n")

    return `// Generated Puppeteer Test for: ${workflow.name}
// Description: ${workflow.description || "No description"}
// Generated on: ${new Date().toISOString()}

const puppeteer = require('puppeteer');

(async () => {
  console.log('🎪 Starting Puppeteer test: ${workflow.name}');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    devtools: true 
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
${steps}

    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
})();

// Setup Instructions:
// 1. Install Puppeteer: npm install puppeteer
// 2. Run test: node test-${workflow.name.toLowerCase().replace(/\s+/g, "-")}.js
// 3. For Jest integration: npm install -D jest jest-puppeteer`
  }

  const generateCode = () => {
    if (!selectedWorkflow) return ""

    switch (exportFormat) {
      case "playwright":
        return generatePlaywrightCode(selectedWorkflow)
      case "cypress":
        return generateCypressCode(selectedWorkflow)
      case "puppeteer":
        return generatePuppeteerCode(selectedWorkflow)
      default:
        return ""
    }
  }

  const handleCopyCode = async () => {
    const code = generateCode()
    try {
      await navigator.clipboard.writeText(code)
      toast({ title: "Code copied to clipboard!", variant: "default" })
    } catch (error) {
      toast({ title: "Failed to copy code", variant: "destructive" })
    }
  }

  const handleDownloadCode = () => {
    const code = generateCode()
    const filename = `${selectedWorkflow?.name.toLowerCase().replace(/\s+/g, "-")}-${exportFormat}.${
      exportFormat === "playwright" ? "spec.js" : exportFormat === "cypress" ? "cy.js" : "js"
    }`

    const blob = new Blob([code], { type: "text/javascript" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({ title: `Code downloaded as ${filename}`, variant: "default" })
  }

  const getFormatInfo = (format: ExportFormat) => {
    switch (format) {
      case "playwright":
        return {
          name: "Playwright",
          description: "Modern end-to-end testing framework by Microsoft",
          features: ["Cross-browser testing", "Auto-wait", "Network interception", "Screenshots & videos"],
        }
      case "cypress":
        return {
          name: "Cypress",
          description: "JavaScript end-to-end testing framework",
          features: ["Time-travel debugging", "Real-time reloads", "Automatic screenshots", "Network stubbing"],
        }
      case "puppeteer":
        return {
          name: "Puppeteer",
          description: "Node.js library for controlling Chrome/Chromium",
          features: ["PDF generation", "Performance monitoring", "Chrome DevTools", "Headless Chrome"],
        }
    }
  }

  const formatInfo = getFormatInfo(exportFormat)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileCode className="w-4 h-4 mr-2" />
          Export Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Export Workflow as Code
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="configure" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configure" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configure
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Workflow</label>
                <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name} ({workflow.items.length} steps)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Export Format</label>
                <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playwright">Playwright</SelectItem>
                    <SelectItem value="cypress">Cypress</SelectItem>
                    <SelectItem value="puppeteer">Puppeteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedWorkflow && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedWorkflow.name}</CardTitle>
                  <CardDescription>{selectedWorkflow.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{selectedWorkflow.items.length} steps</span>
                    <span>Base URL: {baseUrl}</span>
                    <span>Created: {selectedWorkflow.createdAt.toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{formatInfo.name}</CardTitle>
                <CardDescription>{formatInfo.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {formatInfo.features.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {selectedWorkflow && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Code Preview</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyCode}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadCode}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <Textarea value={generateCode()} readOnly className="font-mono text-sm min-h-[400px] max-h-[600px]" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Ready to Export</h3>
                <p className="text-gray-600">
                  Your workflow "{selectedWorkflow?.name}" is ready to be exported as {formatInfo.name} code.
                </p>
              </div>

              <div className="flex justify-center gap-4">
                <Button onClick={handleCopyCode} className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadCode}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </Button>
              </div>

              <div className="text-sm text-gray-500 space-y-1">
                <p>
                  File will be saved as: {selectedWorkflow?.name.toLowerCase().replace(/\s+/g, "-")}-{exportFormat}.
                  {exportFormat === "playwright" ? "spec.js" : exportFormat === "cypress" ? "cy.js" : "js"}
                </p>
                <p>Don't forget to install the required dependencies!</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
