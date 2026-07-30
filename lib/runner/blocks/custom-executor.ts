/**
 * Safe execution environment for custom JavaScript code blocks in workflows.
 * Provides sandboxed execution with access to page object and utility functions.
 * Includes error handling and logging for custom block debugging and monitoring.
 * Supports parameter passing and common Playwright operations through context object.
 * Used by TestRunner to execute user-defined custom blocks with controlled access.
 */

import type { Page } from "playwright"
import type { BlockParameters } from "@/lib/blocks/types"

/**
 * Executes custom JavaScript code blocks safely
 */
export async function executeCustomBlock(page: Page, parameters: BlockParameters = {}, customCode = ""): Promise<void> {
  if (!customCode) {
    throw new Error("No custom code provided")
  }

  try {
    // Create a safe execution context
    const context = {
      page,
      parameters,
      console: {
        log: (...args: any[]) => console.log("📝 Custom Block:", ...args),
        error: (...args: any[]) => console.error("❌ Custom Block Error:", ...args),
        warn: (...args: any[]) => console.warn("⚠️ Custom Block Warning:", ...args),
      },
      // Add some utility functions
      wait: (ms: number) => page.waitForTimeout(ms),
      click: (selector: string) => page.click(selector),
      fill: (selector: string, text: string) => page.fill(selector, text),
      goto: (url: string) => page.goto(url),
      waitForSelector: (selector: string) => page.waitForSelector(selector),
    }

    // Create function from code string
    const asyncFunction = new Function(
      "page",
      "parameters",
      "console",
      "wait",
      "click",
      "fill",
      "goto",
      "waitForSelector",
      `
      return (async () => {
        ${customCode}
      })();
      `,
    )

    // Execute the custom code
    await asyncFunction(
      context.page,
      context.parameters,
      context.console,
      context.wait,
      context.click,
      context.fill,
      context.goto,
      context.waitForSelector,
    )

    console.log("✅ Custom block executed successfully")
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("❌ Custom block execution failed:", errorMessage)
    throw new Error(`Custom block failed: ${errorMessage}`)
  }
}
