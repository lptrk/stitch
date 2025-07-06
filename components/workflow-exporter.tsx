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

type ExportFormat = "playwright" | "cypress" | "puppeteer" | "lilo"

export function WorkflowExporter({ workflows, baseUrl, currentWorkflowId }: WorkflowExporterProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [selectedWorkflowId, setSelectedWorkflowId] = useState(currentWorkflowId)
	const [exportFormat, setExportFormat] = useState<ExportFormat>("playwright")
	const { toast } = useToast()

	const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId)

	const generateLiloCode = (workflow: Workflow) => {
		const workflowSteps = workflow.items.map((item) => {
			const params = item.parameters || {}

			// Map UI block IDs to Lilo block IDs
			const blockMapping: Record<string, string> = {
				navigate: "goto",
				click: "click",
				fill: "fill",
				"expect-visible": "expectVisible",
				"expect-text": "expectText",
				wait: "wait",
				"wait-for-element": "waitForSelector",
				screenshot: "screenshot",
				callWorkflow: "callWorkflow",
			}

			const liloBlockId = blockMapping[item.blockId] || item.blockId

			return {
				block: liloBlockId,
				parameters: params,
			}
		})

		const workflowConfig = {
			baseUrl: baseUrl,
			workflows: {
				[workflow.id]: {
					name: workflow.name,
					description: workflow.description || "",
					workflow: workflowSteps,
				},
			},
			mainWorkflow: workflow.id,
		}

		return `// Generated Lilo Workflow Configuration
// Workflow: ${workflow.name}
// Description: ${workflow.description || "No description"}
// Generated on: ${new Date().toISOString()}

${JSON.stringify(workflowConfig, null, 2)}

// Usage Instructions:
// 1. Save this as '${workflow.name.toLowerCase().replace(/\s+/g, "-")}.json'
// 2. Install Lilo: npm install -g lilo-e2e-runner
// 3. Run workflow: lilo ${workflow.name.toLowerCase().replace(/\s+/g, "-")}.json
// 4. Run headless: HEADLESS=true lilo ${workflow.name.toLowerCase().replace(/\s+/g, "-")}.json
// 5. Debug mode: DEBUG=true HEADLESS=false lilo ${workflow.name.toLowerCase().replace(/\s+/g, "-")}.json

// Programmatic Usage:
// import { TestRunner } from 'lilo-e2e-runner'
// const runner = new TestRunner({ headless: false })
// await runner.initialize()
// const result = await runner.runWorkflow(workflowConfig)
// await runner.cleanup()`
	}

	const generatePlaywrightCode = (workflow: Workflow) => {
		const steps = workflow.items
			.map((item, index) => {
				const params = item.parameters || {}
				switch (item.blockId) {
					case "goto":
					case "navigate":
						const url = params.url || "/"
						const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`
						return `  // Step ${index + 1}: Navigate to ${url}
  await page.goto('${fullUrl}');
  await page.waitForLoadState('networkidle');`

					case "click":
						const selector = params.selector || "button"
						const timeout = params.timeout || 10000
						return `  // Step ${index + 1}: Click element
  await page.locator('${selector}').click({ timeout: ${timeout} });`

					case "fill":
						return `  // Step ${index + 1}: Fill input
  await page.locator('${params.selector || "input"}').fill('${params.value || ""}');`

					case "type":
						return `  // Step ${index + 1}: Type text
  await page.locator('${params.selector || "input"}').type('${params.text || ""}');`

					case "expectVisible":
					case "expect-visible":
						return `  // Step ${index + 1}: Expect element to be visible
  await expect(page.locator('${params.selector || "element"}')).toBeVisible();`

					case "expectHidden":
					case "expect-hidden":
						return `  // Step ${index + 1}: Expect element to be hidden
  await expect(page.locator('${params.selector || "element"}')).toBeHidden();`

					case "expectText":
					case "expect-text":
						return `  // Step ${index + 1}: Expect text content
  await expect(page.locator('${params.selector || "element"}')).toContainText('${params.text || ""}');`

					case "expectTitle":
					case "expect-title":
						return `  // Step ${index + 1}: Expect page title
  await expect(page).toHaveTitle('${params.title || ""}');`

					case "expectUrl":
					case "expect-url":
						return `  // Step ${index + 1}: Expect URL
  await expect(page).toHaveURL('${params.url || ""}');`

					case "wait":
						return `  // Step ${index + 1}: Wait
  await page.waitForTimeout(${params.duration || params.ms || 1000});`

					case "waitForSelector":
					case "wait-for-element":
						return `  // Step ${index + 1}: Wait for element
  await page.waitForSelector('${params.selector || "element"}', { timeout: ${params.timeout || 10000} });`

					case "waitForResponse":
					case "wait-for-response":
						return `  // Step ${index + 1}: Wait for network response
  await page.waitForResponse(response => response.url().includes('${params.url || ""}') && response.status() === ${params.status || 200});`

					case "waitForRequest":
					case "wait-for-request":
						return `  // Step ${index + 1}: Wait for network request
  await page.waitForRequest(request => request.url().includes('${params.url || ""}'));`

					case "screenshot":
						return `  // Step ${index + 1}: Take screenshot
  await page.screenshot({ 
    path: '${params.filename || "screenshot.png"}', 
    fullPage: ${params.fullPage !== false} 
  });`

					case "hover":
						return `  // Step ${index + 1}: Hover over element
  await page.locator('${params.selector || "element"}').hover();`

					case "doubleClick":
					case "double-click":
						return `  // Step ${index + 1}: Double click element
  await page.locator('${params.selector || "element"}').dblclick();`

					case "rightClick":
					case "right-click":
						return `  // Step ${index + 1}: Right click element
  await page.locator('${params.selector || "element"}').click({ button: 'right' });`

					case "selectOption":
					case "select-option":
						return `  // Step ${index + 1}: Select option
  await page.locator('${params.selector || "select"}').selectOption('${params.value || ""}');`

					case "uploadFile":
					case "upload-file":
						return `  // Step ${index + 1}: Upload file
  await page.locator('${params.selector || "input[type=file]"}').setInputFiles('${params.filePath || ""}');`

					case "scrollTo":
					case "scroll-to":
						return `  // Step ${index + 1}: Scroll to element
  await page.locator('${params.selector || "element"}').scrollIntoViewIfNeeded();`

					case "pressKey":
					case "press-key":
						return `  // Step ${index + 1}: Press key
  await page.keyboard.press('${params.key || "Enter"}');`

					case "reload":
					case "refresh":
						return `  // Step ${index + 1}: Reload page
  await page.reload();`

					case "goBack":
					case "go-back":
						return `  // Step ${index + 1}: Go back
  await page.goBack();`

					case "goForward":
					case "go-forward":
						return `  // Step ${index + 1}: Go forward
  await page.goForward();`

					case "setViewport":
					case "set-viewport":
						return `  // Step ${index + 1}: Set viewport
  await page.setViewportSize({ width: ${params.width || 1280}, height: ${params.height || 720} });`

					case "addCookie":
					case "add-cookie":
						return `  // Step ${index + 1}: Add cookie
  await page.context().addCookies([{
    name: '${params.name || ""}',
    value: '${params.value || ""}',
    domain: '${params.domain || new URL(baseUrl).hostname}',
    path: '${params.path || "/"}'
  }]);`

					case "clearCookies":
					case "clear-cookies":
						return `  // Step ${index + 1}: Clear cookies
  await page.context().clearCookies();`

					case "executeScript":
					case "execute-script":
						return `  // Step ${index + 1}: Execute JavaScript
  await page.evaluate(() => {
    ${params.script || "console.log('Hello from Playwright');"}
  });`

					case "callWorkflow":
						return `  // Step ${index + 1}: Call sub-workflow
  // Note: Sub-workflow '${params.workflowId}' should be implemented separately
  // You can create a separate test file or function for the sub-workflow`

					default:
						return `  // Step ${index + 1}: Unknown block type '${item.blockId}'
  // Please implement this block manually`
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
// 5. Generate report: npx playwright show-report

// Configuration (playwright.config.ts):
// export default defineConfig({
//   testDir: './tests',
//   use: {
//     baseURL: '${baseUrl}',
//     headless: true,
//     screenshot: 'only-on-failure',
//     video: 'retain-on-failure',
//   },
// });`
	}

	const generateCypressCode = (workflow: Workflow) => {
		const steps = workflow.items
			.map((item, index) => {
				const params = item.parameters || {}
				switch (item.blockId) {
					case "goto":
					case "navigate":
						const url = params.url || "/"
						const fullUrl = url.startsWith("http") ? url : url
						return `    // Step ${index + 1}: Navigate to ${url}
    cy.visit('${fullUrl}');`

					case "click":
						const timeout = params.timeout || 10000
						return `    // Step ${index + 1}: Click element
    cy.get('${params.selector || "button"}', { timeout: ${timeout} }).click();`

					case "fill":
						return `    // Step ${index + 1}: Fill input
    cy.get('${params.selector || "input"}').clear().type('${params.value || ""}');`

					case "type":
						return `    // Step ${index + 1}: Type text
    cy.get('${params.selector || "input"}').type('${params.text || ""}');`

					case "expectVisible":
					case "expect-visible":
						return `    // Step ${index + 1}: Expect element to be visible
    cy.get('${params.selector || "element"}').should('be.visible');`

					case "expectHidden":
					case "expect-hidden":
						return `    // Step ${index + 1}: Expect element to be hidden
    cy.get('${params.selector || "element"}').should('not.be.visible');`

					case "expectText":
					case "expect-text":
						return `    // Step ${index + 1}: Expect text content
    cy.get('${params.selector || "element"}').should('contain.text', '${params.text || ""}');`

					case "expectTitle":
					case "expect-title":
						return `    // Step ${index + 1}: Expect page title
    cy.title().should('eq', '${params.title || ""}');`

					case "expectUrl":
					case "expect-url":
						return `    // Step ${index + 1}: Expect URL
    cy.url().should('include', '${params.url || ""}');`

					case "wait":
						return `    // Step ${index + 1}: Wait
    cy.wait(${params.duration || params.ms || 1000});`

					case "waitForSelector":
					case "wait-for-element":
						return `    // Step ${index + 1}: Wait for element
    cy.get('${params.selector || "element"}', { timeout: ${params.timeout || 10000} }).should('exist');`

					case "waitForResponse":
					case "wait-for-response":
						return `    // Step ${index + 1}: Wait for network response
    cy.intercept('**/${params.url || "**"}').as('apiResponse');
    cy.wait('@apiResponse').its('response.statusCode').should('eq', ${params.status || 200});`

					case "waitForRequest":
					case "wait-for-request":
						return `    // Step ${index + 1}: Wait for network request
    cy.intercept('**/${params.url || "**"}').as('apiRequest');
    cy.wait('@apiRequest');`

					case "screenshot":
						return `    // Step ${index + 1}: Take screenshot
    cy.screenshot('${params.filename || "screenshot"}');`

					case "hover":
						return `    // Step ${index + 1}: Hover over element
    cy.get('${params.selector || "element"}').trigger('mouseover');`

					case "doubleClick":
					case "double-click":
						return `    // Step ${index + 1}: Double click element
    cy.get('${params.selector || "element"}').dblclick();`

					case "rightClick":
					case "right-click":
						return `    // Step ${index + 1}: Right click element
    cy.get('${params.selector || "element"}').rightclick();`

					case "selectOption":
					case "select-option":
						return `    // Step ${index + 1}: Select option
    cy.get('${params.selector || "select"}').select('${params.value || ""}');`

					case "uploadFile":
					case "upload-file":
						return `    // Step ${index + 1}: Upload file
    cy.get('${params.selector || "input[type=file]"}').selectFile('${params.filePath || ""}');`

					case "scrollTo":
					case "scroll-to":
						return `    // Step ${index + 1}: Scroll to element
    cy.get('${params.selector || "element"}').scrollIntoView();`

					case "pressKey":
					case "press-key":
						return `    // Step ${index + 1}: Press key
    cy.get('body').type('{${params.key?.toLowerCase() || "enter"}}');`

					case "reload":
					case "refresh":
						return `    // Step ${index + 1}: Reload page
    cy.reload();`

					case "goBack":
					case "go-back":
						return `    // Step ${index + 1}: Go back
    cy.go('back');`

					case "goForward":
					case "go-forward":
						return `    // Step ${index + 1}: Go forward
    cy.go('forward');`

					case "setViewport":
					case "set-viewport":
						return `    // Step ${index + 1}: Set viewport
    cy.viewport(${params.width || 1280}, ${params.height || 720});`

					case "addCookie":
					case "add-cookie":
						return `    // Step ${index + 1}: Add cookie
    cy.setCookie('${params.name || ""}', '${params.value || ""}', {
      domain: '${params.domain || new URL(baseUrl).hostname}',
      path: '${params.path || "/"}'
    });`

					case "clearCookies":
					case "clear-cookies":
						return `    // Step ${index + 1}: Clear cookies
    cy.clearCookies();`

					case "executeScript":
					case "execute-script":
						return `    // Step ${index + 1}: Execute JavaScript
    cy.window().then((win) => {
      ${params.script || "console.log('Hello from Cypress');"}
    });`

					case "callWorkflow":
						return `    // Step ${index + 1}: Call sub-workflow
    // Note: Sub-workflow '${params.workflowId}' should be implemented separately
    // You can create a separate command or function for the sub-workflow`

					default:
						return `    // Step ${index + 1}: Unknown block type '${item.blockId}'
    // Please implement this block manually`
				}
			})
			.join("\n\n")

		return `// Generated Cypress Test for: ${workflow.name}
// Description: ${workflow.description || "No description"}
// Generated on: ${new Date().toISOString()}

describe('${workflow.name}', () => {
  beforeEach(() => {
    // Setup before each test
    cy.viewport(1280, 720);
  });

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
//      e2e: { 
//        baseUrl: '${baseUrl}',
//        viewportWidth: 1280,
//        viewportHeight: 720,
//        video: true,
//        screenshotOnRunFailure: true
//      }
//    })`
	}

	const generatePuppeteerCode = (workflow: Workflow) => {
		const steps = workflow.items
			.map((item, index) => {
				const params = item.parameters || {}
				switch (item.blockId) {
					case "goto":
					case "navigate":
						const url = params.url || "/"
						const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`
						return `  // Step ${index + 1}: Navigate to ${url}
  await page.goto('${fullUrl}', { waitUntil: 'networkidle0' });`

					case "click":
						const timeout = params.timeout || 10000
						return `  // Step ${index + 1}: Click element
  await page.waitForSelector('${params.selector || "button"}', { timeout: ${timeout} });
  await page.click('${params.selector || "button"}');`

					case "fill":
						return `  // Step ${index + 1}: Fill input
  await page.waitForSelector('${params.selector || "input"}');
  await page.evaluate((selector) => {
    document.querySelector(selector).value = '';
  }, '${params.selector || "input"}');
  await page.type('${params.selector || "input"}', '${params.value || ""}');`

					case "type":
						return `  // Step ${index + 1}: Type text
  await page.waitForSelector('${params.selector || "input"}');
  await page.type('${params.selector || "input"}', '${params.text || ""}');`

					case "expectVisible":
					case "expect-visible":
						return `  // Step ${index + 1}: Expect element to be visible
  await page.waitForSelector('${params.selector || "element"}', { visible: true });
  const isVisible = await page.$eval('${params.selector || "element"}', el => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  });
  if (!isVisible) throw new Error('Element is not visible');`

					case "expectHidden":
					case "expect-hidden":
						return `  // Step ${index + 1}: Expect element to be hidden
  try {
    await page.waitForSelector('${params.selector || "element"}', { visible: false, timeout: 5000 });
  } catch (error) {
    // Element might not exist, which is also considered hidden
    const element = await page.$('${params.selector || "element"}');
    if (element) {
      const isVisible = await page.$eval('${params.selector || "element"}', el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });
      if (isVisible) throw new Error('Element is visible but should be hidden');
    }
  }`

					case "expectText":
					case "expect-text":
						return `  // Step ${index + 1}: Expect text content
  await page.waitForSelector('${params.selector || "element"}');
  const textContent = await page.$eval('${params.selector || "element"}', el => el.textContent);
  if (!textContent || !textContent.includes('${params.text || ""}')) {
    throw new Error(\`Expected text "${params.text || ""}" not found. Got: \${textContent}\`);
  }`

					case "expectTitle":
					case "expect-title":
						return `  // Step ${index + 1}: Expect page title
  const title = await page.title();
  if (title !== '${params.title || ""}') {
    throw new Error(\`Expected title "${params.title || ""}" but got "\${title}"\`);
  }`

					case "expectUrl":
					case "expect-url":
						return `  // Step ${index + 1}: Expect URL
  const currentUrl = page.url();
  if (!currentUrl.includes('${params.url || ""}')) {
    throw new Error(\`Expected URL to contain "${params.url || ""}" but got "\${currentUrl}"\`);
  }`

					case "wait":
						return `  // Step ${index + 1}: Wait
  await page.waitForTimeout(${params.duration || params.ms || 1000});`

					case "waitForSelector":
					case "wait-for-element":
						return `  // Step ${index + 1}: Wait for element
  await page.waitForSelector('${params.selector || "element"}', { timeout: ${params.timeout || 10000} });`

					case "waitForResponse":
					case "wait-for-response":
						return `  // Step ${index + 1}: Wait for network response
  await page.waitForResponse(response => 
    response.url().includes('${params.url || ""}') && 
    response.status() === ${params.status || 200}
  );`

					case "waitForRequest":
					case "wait-for-request":
						return `  // Step ${index + 1}: Wait for network request
  await page.waitForRequest(request => request.url().includes('${params.url || ""}'));`

					case "screenshot":
						return `  // Step ${index + 1}: Take screenshot
  await page.screenshot({ 
    path: '${params.filename || "screenshot.png"}', 
    fullPage: ${params.fullPage !== false} 
  });`

					case "hover":
						return `  // Step ${index + 1}: Hover over element
  await page.waitForSelector('${params.selector || "element"}');
  await page.hover('${params.selector || "element"}');`

					case "doubleClick":
					case "double-click":
						return `  // Step ${index + 1}: Double click element
  await page.waitForSelector('${params.selector || "element"}');
  await page.click('${params.selector || "element"}', { clickCount: 2 });`

					case "rightClick":
					case "right-click":
						return `  // Step ${index + 1}: Right click element
  await page.waitForSelector('${params.selector || "element"}');
  await page.click('${params.selector || "element"}', { button: 'right' });`

					case "selectOption":
					case "select-option":
						return `  // Step ${index + 1}: Select option
  await page.waitForSelector('${params.selector || "select"}');
  await page.select('${params.selector || "select"}', '${params.value || ""}');`

					case "uploadFile":
					case "upload-file":
						return `  // Step ${index + 1}: Upload file
  const fileInput = await page.$('${params.selector || "input[type=file]"}');
  await fileInput.uploadFile('${params.filePath || ""}');`

					case "scrollTo":
					case "scroll-to":
						return `  // Step ${index + 1}: Scroll to element
  await page.waitForSelector('${params.selector || "element"}');
  await page.$eval('${params.selector || "element"}', el => el.scrollIntoView());`

					case "pressKey":
					case "press-key":
						return `  // Step ${index + 1}: Press key
  await page.keyboard.press('${params.key || "Enter"}');`

					case "reload":
					case "refresh":
						return `  // Step ${index + 1}: Reload page
  await page.reload({ waitUntil: 'networkidle0' });`

					case "goBack":
					case "go-back":
						return `  // Step ${index + 1}: Go back
  await page.goBack({ waitUntil: 'networkidle0' });`

					case "goForward":
					case "go-forward":
						return `  // Step ${index + 1}: Go forward
  await page.goForward({ waitUntil: 'networkidle0' });`

					case "setViewport":
					case "set-viewport":
						return `  // Step ${index + 1}: Set viewport
  await page.setViewport({ width: ${params.width || 1280}, height: ${params.height || 720} });`

					case "addCookie":
					case "add-cookie":
						return `  // Step ${index + 1}: Add cookie
  await page.setCookie({
    name: '${params.name || ""}',
    value: '${params.value || ""}',
    domain: '${params.domain || new URL(baseUrl).hostname}',
    path: '${params.path || "/"}'
  });`

					case "clearCookies":
					case "clear-cookies":
						return `  // Step ${index + 1}: Clear cookies
  const cookies = await page.cookies();
  await page.deleteCookie(...cookies);`

					case "executeScript":
					case "execute-script":
						return `  // Step ${index + 1}: Execute JavaScript
  await page.evaluate(() => {
    ${params.script || "console.log('Hello from Puppeteer');"}
  });`

					case "callWorkflow":
						return `  // Step ${index + 1}: Call sub-workflow
  // Note: Sub-workflow '${params.workflowId}' should be implemented separately
  // You can create a separate function for the sub-workflow`

					default:
						return `  // Step ${index + 1}: Unknown block type '${item.blockId}'
  // Please implement this block manually`
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
    devtools: true,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
${steps}

    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
})();

// Setup Instructions:
// 1. Install Puppeteer: npm install puppeteer
// 2. Run test: node ${workflow.name.toLowerCase().replace(/\s+/g, "-")}-test.js
// 3. For Jest integration: npm install -D jest jest-puppeteer
// 4. For TypeScript: npm install -D @types/puppeteer

// Jest Configuration (jest.config.js):
// module.exports = {
//   preset: 'jest-puppeteer',
//   testMatch: ['**/*.test.js'],
//   setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
// };`
	}

	const generateCode = () => {
		if (!selectedWorkflow) return ""

		switch (exportFormat) {
			case "lilo":
				return generateLiloCode(selectedWorkflow)
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
		const getFileExtension = () => {
			switch (exportFormat) {
				case "lilo":
					return "json"
				case "playwright":
					return "spec.js"
				case "cypress":
					return "cy.js"
				case "puppeteer":
					return "js"
				default:
					return "js"
			}
		}

		const filename = `${selectedWorkflow?.name.toLowerCase().replace(/\s+/g, "-")}-${exportFormat}.${getFileExtension()}`
		const mimeType = exportFormat === "lilo" ? "application/json" : "text/javascript"
		const blob = new Blob([code], { type: mimeType })
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
			case "lilo":
				return {
					name: "Lilo Workflow",
					description: "Native Lilo JSON workflow configuration",
					features: ["Visual workflow editor", "Custom blocks", "Workflow chaining", "Real-time execution"],
				}
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
										<SelectItem value="lilo">Lilo Workflow</SelectItem>
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
									{exportFormat === "lilo"
										? "json"
										: exportFormat === "playwright"
											? "spec.js"
											: exportFormat === "cypress"
												? "cy.js"
												: "js"}
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
