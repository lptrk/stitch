import { chromium } from "playwright"
import { blockRegistry } from "./blocks/index.js"
import { Logger } from "./utils/logger.js"
import fs from "fs"
import chalk from "chalk"

class TestRunner {
  constructor(options = {}) {
    this.options = {
      headless: process.env.HEADLESS !== "false" && options.headless !== false,
      browser: options.browser || "chromium",
      timeout: options.timeout || 30000,
      debug: process.env.DEBUG === "true" || options.debug || false,
      ...options,
    }
    this.logger = new Logger(this.options.debug)
    this.browser = null
    this.context = null
    this.page = null
    this.stepResults = [] // Store step results
  }

  async initialize() {
    this.logger.info("🚀 Initializing Playwright Test Runner...")

    // Launch browser
    this.browser = await chromium.launch({
      headless: this.options.headless,
      devtools: this.options.debug && !this.options.headless,
    })

    // Create context
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    })

    // Create page
    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(this.options.timeout)

    this.logger.success(`✅ Browser ready (headless: ${this.options.headless})`)
  }

  async runWorkflow(workflowPath) {
    let testsPassed = false
    let errorMessage = ""

    try {
      // Load workflow
      const workflowConfig = this.loadWorkflowConfig(workflowPath)
      this.logger.info(`📋 Running workflow: ${workflowConfig.workflows[workflowConfig.mainWorkflow]?.name}`)

      // Log custom blocks if present
      if (workflowConfig.customBlocks && Object.keys(workflowConfig.customBlocks).length > 0) {
        this.logger.info(`🎨 Custom blocks available: ${Object.keys(workflowConfig.customBlocks).join(", ")}`)
      }

      // Initialize browser
      await this.initialize()

      // Navigate to base URL
      if (workflowConfig.baseUrl) {
        this.logger.info(`🌐 Base URL: ${workflowConfig.baseUrl}`)
        await this.page.goto(workflowConfig.baseUrl)
        await this.page.waitForLoadState("networkidle")
      }

      // Execute main workflow
      await this.executeWorkflow(workflowConfig, workflowConfig.mainWorkflow)

      this.logger.success("🎉 All tests passed!")
      testsPassed = true

      // Output final results
      console.log("=== FINAL_RESULTS ===")
      console.log(JSON.stringify(this.stepResults))
      console.log("=== END_RESULTS ===")

      return { success: true }
    } catch (error) {
      errorMessage = error.message
      this.logger.error("❌ Test failed:", error.message)

      // Output final results even on failure
      console.log("=== FINAL_RESULTS ===")
      console.log(JSON.stringify(this.stepResults))
      console.log("=== END_RESULTS ===")

      testsPassed = false
      return { success: false, error: error.message }
    } finally {
      await this.cleanup()

      // Exit with proper code
      if (testsPassed) {
        console.log("✅ TESTS PASSED")
        process.exit(0)
      } else {
        console.log("❌ TESTS FAILED")
        console.error("Error:", errorMessage)
        process.exit(1)
      }
    }
  }

  async executeWorkflow(workflowConfig, workflowId, depth = 0) {
    const workflow = workflowConfig.workflows[workflowId]
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`)
    }

    const indent = "  ".repeat(depth)
    this.logger.info(`${indent}🔄 Executing: ${workflow.name} (${workflow.workflow.length} steps)`)

    // Execute each step
    for (let i = 0; i < workflow.workflow.length; i++) {
      const step = workflow.workflow[i]
      await this.executeStep(step, i + 1, workflowConfig, depth)
    }

    this.logger.success(`${indent}✅ Workflow completed: ${workflow.name}`)
  }

  async executeStep(step, stepNumber, workflowConfig, depth = 0) {
    const indent = "  ".repeat(depth)
    const startTime = Date.now()

    this.logger.info(`${indent}  ${stepNumber}. ${step.block}`)

    try {
      // Handle workflow calls
      if (step.block === "callWorkflow") {
        const workflowId = step.parameters?.workflowId
        if (!workflowId) {
          throw new Error("callWorkflow requires workflowId parameter")
        }

        this.logger.info(`${indent}     🔗 Calling workflow: ${workflowId}`)
        await this.executeWorkflow(workflowConfig, workflowId, depth + 1)
      } else if (workflowConfig.customBlocks && workflowConfig.customBlocks[step.block]) {
        // Handle custom blocks
        const customBlock = workflowConfig.customBlocks[step.block]
        this.logger.info(`${indent}     🎨 Executing custom block: ${customBlock.name}`)
        this.logger.debug(`${indent}     🔍 Custom block ID: ${step.block}`)
        this.logger.debug(`${indent}     📋 Step parameters: ${JSON.stringify(step.parameters)}`)

        // WICHTIG: Parameter korrekt weiterleiten!
        await blockRegistry.executeCustomBlock(this.page, step.parameters || {}, customBlock.code)
      } else {
        // Handle regular blocks
        const blockFunction = blockRegistry[step.block]
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

      // Store successful result
      this.stepResults.push({
        stepNumber: stepNumber,
        blockId: step.block,
        status: "success",
        duration: duration,
        timestamp: new Date().toISOString(),
      })

      this.logger.success(`${indent}     ✅ Completed (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime

      // Store failed result
      this.stepResults.push({
        stepNumber: stepNumber,
        blockId: step.block,
        status: "failed",
        duration: duration,
        error: error.message,
        timestamp: new Date().toISOString(),
      })

      this.logger.error(`${indent}     ❌ Failed: ${error.message} (${duration}ms)`)
      throw error
    }
  }

  loadWorkflowConfig(workflowPath) {
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`Workflow file not found: ${workflowPath}`)
    }

    try {
      const content = fs.readFileSync(workflowPath, "utf8")
      const config = JSON.parse(content)

      if (!config.workflows || !config.mainWorkflow) {
        throw new Error("Invalid workflow configuration")
      }

      return config
    } catch (error) {
      throw new Error(`Failed to parse workflow: ${error.message}`)
    }
  }

  async cleanup() {
    this.logger.info("🧹 Cleaning up...")
    if (this.browser) {
      await this.browser.close()
    }
  }
}

// CLI execution
async function main() {
  const workflowPath = process.argv[2] || "./workflows/example.json"

  if (!fs.existsSync(workflowPath)) {
    console.error(chalk.red(`❌ Workflow file not found: ${workflowPath}`))
    process.exit(1)
  }

  const runner = new TestRunner()
  await runner.runWorkflow(workflowPath)
}

// Export for API usage
export { TestRunner }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
