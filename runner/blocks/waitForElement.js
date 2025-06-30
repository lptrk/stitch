import { validateParameters } from "./index.js"

/**
 * Waits for an element to appear on the page
 */
export async function waitForElement(page, parameters = {}) {
  validateParameters(parameters, ["selector"])

  const selector = parameters.selector
  const timeout = Number.parseInt(parameters.timeout) || 10000
  const state = parameters.state || "visible"

  try {
    await page.waitForSelector(selector, { state, timeout })
    console.log(`✅ Element found: ${selector}`)
  } catch (error) {
    throw new Error(`Element not found within ${timeout}ms: ${selector}`)
  }
}
