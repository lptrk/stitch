import { validateParameters } from "./index.js"

/**
 * Types text into an input field
 */
export async function typeInInput(page, parameters = {}) {
  validateParameters(parameters, ["text", "selector"])

  const text = parameters.text
  const selector = parameters.selector

  try {
    // Wait for the input to be visible
    await page.waitForSelector(selector, { state: "visible", timeout: 10000 })

    // Clear existing text if specified
    if (parameters.clearFirst !== "false") {
      await page.fill(selector, "")
    }

    // Type the text (simulates real typing)
    await page.type(selector, text, { delay: 100 })

    console.log(`✅ Successfully typed "${text}" into ${selector}`)
  } catch (error) {
    throw new Error(`Failed to type into input "${selector}": ${error.message}`)
  }
}
