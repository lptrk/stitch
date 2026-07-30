/**
 * Core TestRunner class that orchestrates Playwright browser automation.
 * Manages browser lifecycle, executes workflow steps, handles custom blocks, and provides callbacks.
 * Supports both programmatic usage and CLI execution with comprehensive error handling.
 * Features include step-by-step execution tracking, custom block support, and workflow chaining.
 * Can be used standalone or through factory functions for simplified usage patterns.
 */

import {chromium, type Browser, type BrowserContext, type Page} from "playwright"
import {blockRegistry, executeCustomBlock} from "../blocks/index"
import {Logger} from "../utils/logger"
import type {WorkflowConfig, WorkflowStep, StepResult, TestResult, TestRunnerOptions} from "../types/index"
import {SCREENSHOT_RESULT_KEY} from "../blocks/screenshot"
import fs from "fs"

export class TestRunner {
	private options: Required<Omit<TestRunnerOptions, "onStepStart" | "onStepComplete" | "onProgress">> &
		Pick<TestRunnerOptions, "onStepStart" | "onStepComplete" | "onProgress">
	private logger: Logger
	private browser: Browser | null = null
	private context: BrowserContext | null = null
	private page: Page | null = null
	private stepResults: StepResult[] = []
	// Incremented once per step across the *entire* execution tree (main workflow plus any
	// workflows reached via `callWorkflow`), so the progress bar never resets/overshoots on
	// nested calls. Local per-workflow numbering (used for canvas highlighting) is separate,
	// see `executeWorkflow`.
	private globalStepCounter = 0
	private totalStepsInTree = 0

	constructor(options: TestRunnerOptions = {}) {
		this.options = {
			headless: process.env.HEADLESS !== "false" && options.headless !== false,
			browser: options.browser || "chromium",
			timeout: options.timeout || 30000,
			ignoreHTTPSErrors: process.env.IGNORE_HTTPS_ERRORS === "true" || options.ignoreHTTPSErrors || false,
			debug: process.env.DEBUG === "true" || options.debug || false,
			onStepStart: options.onStepStart,
			onStepComplete: options.onStepComplete,
			onProgress: options.onProgress,
		}
		this.logger = new Logger(this.options.debug)
	}

	async initialize(baseUrl?: string): Promise<void> {
		this.logger.info("🚀 Initializing Playwright Test Runner...")

		// Launch browser
		this.browser = await chromium.launch({
			headless: this.options.headless,
		})

		// Create context. Setting baseURL here is what lets blocks (e.g. `goto`) call
		// page.goto() with a relative path like "/login" — without it, Playwright throws
		// "Cannot navigate to invalid URL" for any schema-less URL, regardless of what
		// page the browser is currently on.
		this.context = await this.browser.newContext({
			viewport: {width: 1280, height: 720},
			ignoreHTTPSErrors: this.options.ignoreHTTPSErrors,
			baseURL: baseUrl,
		})

		// Create page
		this.page = await this.context.newPage()
		this.page.setDefaultTimeout(this.options.timeout)

		this.logger.success(
			`✅ Browser ready (headless: ${this.options.headless}, ignoreHTTPSErrors: ${this.options.ignoreHTTPSErrors})`,
		)
	}

	// Sums workflow.length across the main workflow and every workflow reachable via
	// `callWorkflow` steps, so `onProgress`'s `total` reflects the whole execution tree instead
	// of just the main workflow. Guards against cycles between workflows with a visited set.
	private countStepsInTree(workflowConfig: WorkflowConfig, workflowId: string, visited = new Set<string>()): number {
		if (visited.has(workflowId)) return 0
		visited.add(workflowId)

		const workflow = workflowConfig.workflows[workflowId]
		if (!workflow) return 0

		let count = workflow.workflow.length
		for (const step of workflow.workflow) {
			if (step.block === "callWorkflow" && step.parameters?.workflowId) {
				count += this.countStepsInTree(workflowConfig, step.parameters.workflowId, visited)
			}
		}
		return count
	}

	async runWorkflow(workflowConfigOrPath: WorkflowConfig | string): Promise<TestResult> {
		const startTime = Date.now()
		this.stepResults = []
		this.globalStepCounter = 0

		try {
			// Load workflow config
			const workflowConfig =
				typeof workflowConfigOrPath === "string" ? this.loadWorkflowConfig(workflowConfigOrPath) : workflowConfigOrPath

			this.logger.info(`📋 Running workflow: ${workflowConfig.workflows[workflowConfig.mainWorkflow]?.name}`)
			this.totalStepsInTree = this.countStepsInTree(workflowConfig, workflowConfig.mainWorkflow)

			// Log custom blocks if present
			if (workflowConfig.customBlocks && Object.keys(workflowConfig.customBlocks).length > 0) {
				this.logger.info(`🎨 Custom blocks available: ${Object.keys(workflowConfig.customBlocks).join(", ")}`)
			}

			// Initialize browser if not already done
			if (!this.page) {
				await this.initialize(workflowConfig.baseUrl)
			}

			// Navigate to base URL. "load" not "networkidle": pages with any persistent
			// connection (SSE, WebSocket, polling — e.g. Stitch's own live-sessions stream)
			// never go network-idle, which hung this step for a full 60s timeout.
			if (workflowConfig.baseUrl && this.page) {
				this.logger.info(`🌐 Base URL: ${workflowConfig.baseUrl}`)
				await this.page.goto(workflowConfig.baseUrl)
				await this.page.waitForLoadState("load")
			}

			// Execute main workflow
			await this.executeWorkflow(workflowConfig, workflowConfig.mainWorkflow)

			const duration = Date.now() - startTime
			this.logger.success("🎉 All tests passed!")

			return {
				success: true,
				duration,
				stepResults: this.stepResults,
			}
		} catch (error) {
			const duration = Date.now() - startTime
			const errorMessage = error instanceof Error ? error.message : String(error)
			// @ts-ignore
			this.logger.error("❌ Test failed:", errorMessage)

			return {
				success: false,
				duration,
				error: errorMessage,
				stepResults: this.stepResults,
			}
		}
	}

	// `callChain` is the list of workflow ids currently "on the stack" above this call (main
	// workflow first). If `workflowId` is already in it, a `callWorkflow` step somewhere below
	// would re-enter a workflow that's already running higher up — without this check that
	// recurses forever (async recursion via `await` doesn't stack-overflow the way sync
	// recursion would, so it just keeps executing real browser actions until killed externally).
	private async executeWorkflow(
		workflowConfig: WorkflowConfig,
		workflowId: string,
		depth = 0,
		callChain: string[] = [],
	): Promise<void> {
		if (callChain.includes(workflowId)) {
			throw new Error(`Circular workflow call detected: ${[...callChain, workflowId].join(" → ")}`)
		}

		const workflow = workflowConfig.workflows[workflowId]
		if (!workflow) {
			throw new Error(`Workflow '${workflowId}' not found`)
		}

		const indent = "  ".repeat(depth)
		this.logger.info(`${indent}🔄 Executing: ${workflow.name} (${workflow.workflow.length} steps)`)

		const nextCallChain = [...callChain, workflowId]

		// Execute each step
		for (let i = 0; i < workflow.workflow.length; i++) {
			const step = workflow.workflow[i]
			await this.executeStep(step, i + 1, workflowId, workflowConfig, depth, nextCallChain)
		}

		this.logger.success(`${indent}✅ Workflow completed: ${workflow.name}`)
	}

	private async executeStep(
		step: WorkflowStep,
		stepNumber: number,
		workflowId: string,
		workflowConfig: WorkflowConfig,
		depth = 0,
		callChain: string[] = [],
	): Promise<void> {
		if (!this.page) {
			throw new Error("Page not initialized")
		}

		this.globalStepCounter++

		const startTime = Date.now()
		const stepResult: StepResult = {
			stepNumber,
			workflowId,
			globalStepNumber: this.globalStepCounter,
			blockId: step.block,
			status: "running",
			timestamp: new Date().toISOString(),
		}

		// Notify step start
		this.options.onStepStart?.(stepResult)
		this.options.onProgress?.({
			current: this.globalStepCounter,
			total: this.totalStepsInTree,
			step: stepResult,
		})

		const indent = "  ".repeat(depth)
		this.logger.info(`${indent}  ${stepNumber}. ${step.block}`)

		try {
			// Handle workflow calls
			if (step.block === "callWorkflow") {
				const targetWorkflowId = step.parameters?.workflowId
				if (!targetWorkflowId) {
					throw new Error("callWorkflow requires workflowId parameter")
				}

				this.logger.info(`${indent}     🔗 Calling workflow: ${targetWorkflowId}`)
				await this.executeWorkflow(workflowConfig, targetWorkflowId, depth + 1, callChain)
			} else if (workflowConfig.customBlocks && workflowConfig.customBlocks[step.block]) {
				// Handle custom blocks
				const customBlock = workflowConfig.customBlocks[step.block]
				this.logger.info(`${indent}     🎨 Executing custom block: ${customBlock.name}`)
				this.logger.debug(`${indent}     🔍 Custom block ID: ${step.block}`)
				this.logger.debug(`${indent}     📋 Step parameters: ${JSON.stringify(step.parameters)}`)

				await executeCustomBlock(this.page, step.parameters || {}, customBlock.code)
			} else {
				// Handle regular blocks
				const blockFunction = blockRegistry[step.block as keyof typeof blockRegistry]
				if (!blockFunction) {
					// More detailed error for debugging
					const availableBlocks = Object.keys(blockRegistry)
					const availableCustomBlocks = workflowConfig.customBlocks ? Object.keys(workflowConfig.customBlocks) : []

					this.logger.error(`${indent}     ❌ Block '${step.block}' not found`)
					this.logger.debug(`${indent}     📋 Available built-in blocks: ${availableBlocks.join(", ")}`)
					this.logger.debug(`${indent}     🎨 Available custom blocks: ${availableCustomBlocks.join(", ")}`)

					throw new Error(
						`Block '${step.block}' not found in registry. Available: ${[...availableBlocks, ...availableCustomBlocks].join(", ")}`,
					)
				}

				await blockFunction(this.page, step.parameters || {})
			}

			// Small delay for stability
			await this.page.waitForTimeout(200)

			const duration = Date.now() - startTime
			stepResult.status = "success"
			stepResult.duration = duration

			// Pick up screenshot if block produced one
			if ((this.page as any)[SCREENSHOT_RESULT_KEY]) {
				const { dataUrl, filename } = (this.page as any)[SCREENSHOT_RESULT_KEY]
				stepResult.screenshot = dataUrl
				;(stepResult as any).screenshotFilename = filename
				delete (this.page as any)[SCREENSHOT_RESULT_KEY]
			}

			this.stepResults.push(stepResult)
			this.options.onStepComplete?.(stepResult)

			this.logger.success(`${indent}     ✅ Completed (${duration}ms)`)
		} catch (error) {
			const duration = Date.now() - startTime
			const errorMessage = error instanceof Error ? error.message : String(error)

			stepResult.status = "failed"
			stepResult.duration = duration
			stepResult.error = errorMessage

			// Best-effort failure screenshot — gives a human (right panel) and an MCP-connected
			// agent visual context for *why* a step failed, not just the error string. Separate
			// mechanism from the dedicated `screenshot` block's SCREENSHOT_RESULT_KEY pickup above;
			// a step is only ever one or the other in practice. Never let a screenshot failure
			// (e.g. page already crashed/closed) mask the real error.
			try {
				const buffer = await this.page?.screenshot({ type: "jpeg", quality: 50 })
				if (buffer) stepResult.screenshot = `data:image/jpeg;base64,${buffer.toString("base64")}`
			} catch {
				// no-op: screenshot is a nice-to-have, not worth a second error
			}

			this.stepResults.push(stepResult)
			this.options.onStepComplete?.(stepResult)

			this.logger.error(`${indent}     ❌ Failed: ${errorMessage} (${duration}ms)`)
			throw error
		}
	}

	private loadWorkflowConfig(workflowPath: string): WorkflowConfig {
		if (!fs.existsSync(workflowPath)) {
			throw new Error(`Workflow file not found: ${workflowPath}`)
		}

		try {
			const content = fs.readFileSync(workflowPath, "utf8")
			const config: WorkflowConfig = JSON.parse(content)

			if (!config.workflows || !config.mainWorkflow) {
				throw new Error("Invalid workflow configuration")
			}

			return config
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			throw new Error(`Failed to parse workflow: ${errorMessage}`)
		}
	}

	async cleanup(): Promise<void> {
		this.logger.info("🧹 Cleaning up...")
		if (this.browser) {
			await this.browser.close()
			this.browser = null
			this.context = null
			this.page = null
		}
	}

	// Utility methods for programmatic usage
	async takeScreenshot(filename?: string): Promise<string> {
		if (!this.page) throw new Error("Page not initialized")

		const path = filename || `screenshot-${Date.now()}.png`
		await this.page.screenshot({path, fullPage: true})
		return path
	}

	async getCurrentUrl(): Promise<string> {
		if (!this.page) throw new Error("Page not initialized")
		return this.page.url()
	}

	async getPageTitle(): Promise<string> {
		if (!this.page) throw new Error("Page not initialized")
		return this.page.title()
	}

	getStepResults(): StepResult[] {
		return [...this.stepResults]
	}
}
