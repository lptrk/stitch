// Simple Playwright block implementations
import { expect } from "@playwright/test"

export const blockRegistry = {
  // Navigation
  async goto(page, parameters) {
    const url = parameters.url || "/"
    const baseUrl = page.url().split("/").slice(0, 3).join("/")
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`

    console.log(`🌐 Navigating to: ${fullUrl}`)
    await page.goto(fullUrl)
    await page.waitForLoadState("networkidle")
  },

  // Interactions
  async click(page, parameters) {
    const selector = parameters.selector
    if (!selector) throw new Error("Selector is required for click action")

    console.log(`👆 Clicking: ${selector}`)
    await page.waitForSelector(selector, { state: "visible" })
    await page.click(selector)
  },

  async fill(page, parameters) {
    const { selector, value } = parameters
    if (!selector || value === undefined) {
      throw new Error("Selector and value are required for fill action")
    }

    console.log(`✏️ Filling ${selector} with: ${value}`)
    await page.waitForSelector(selector, { state: "visible" })
    await page.fill(selector, value)
  },

  // Assertions
  async expectVisible(page, parameters) {
    const selector = parameters.selector
    if (!selector) throw new Error("Selector is required for expectVisible")

    console.log(`👀 Expecting visible: ${selector}`)
    await expect(page.locator(selector)).toBeVisible()
  },

  async expectText(page, parameters) {
    const { selector, text } = parameters
    if (!selector || !text) {
      throw new Error("Selector and text are required for expectText")
    }

    console.log(`📝 Expecting text "${text}" in: ${selector}`)
    await expect(page.locator(selector)).toContainText(text)
  },

  // Utilities
  async wait(page, parameters) {
    const ms = Number.parseInt(parameters.ms) || 1000
    console.log(`⏳ Waiting ${ms}ms`)
    await page.waitForTimeout(ms)
  },

  async waitForSelector(page, parameters) {
    const { selector, timeout } = parameters
    if (!selector) throw new Error("Selector is required for waitForSelector")

    const timeoutMs = Number.parseInt(timeout) || 10000
    console.log(`⏳ Waiting for selector: ${selector} (timeout: ${timeoutMs}ms)`)
    await page.waitForSelector(selector, { timeout: timeoutMs })
  },

  // Custom block executor
  async executeCustomBlock(page, parameters, customCode) {
    if (!customCode) {
      throw new Error("No custom code provided")
    }

    try {
      console.log("🎨 Executing custom block...")
      console.log("📋 Parameters received:", JSON.stringify(parameters, null, 2))

      // Create execution context
      const context = {
        page,
        parameters,
        expect,
        console: {
          log: (...args) => console.log("📝 Custom:", ...args),
          error: (...args) => console.error("❌ Custom:", ...args),
          warn: (...args) => console.warn("⚠️ Custom:", ...args),
        },
      }

      // Create and execute function
      const asyncFunction = new Function(
        "page",
        "parameters",
        "expect",
        "console",
        `
       return (async () => {
         ${customCode}
       })();
       `,
      )

      await asyncFunction(context.page, context.parameters, context.expect, context.console)

      console.log("✅ Custom block completed")
    } catch (error) {
      console.error("❌ Custom block failed:", error.message)
      throw new Error(`Custom block failed: ${error.message}`)
    }
  },

  // Note: callWorkflow is handled in run-workflow.js
}

// Helper function to validate required parameters
export function validateParameters(parameters, required = []) {
  const missing = required.filter((param) => !parameters[param] || parameters[param].trim() === "")
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`)
  }
}
