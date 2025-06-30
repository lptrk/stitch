import { validateParameters } from "./index.js"

/**
 * Verifies that the current page title matches the expected title
 */
export async function verifyPageTitle(page, parameters = {}) {
  validateParameters(parameters, ["expectedTitle"])

  const expectedTitle = parameters.expectedTitle

  try {
    // Get the current page title
    const actualTitle = await page.title()

    // Check if titles match (case-insensitive by default)
    const caseSensitive = parameters.caseSensitive === "true"
    const matches = caseSensitive
      ? actualTitle === expectedTitle
      : actualTitle.toLowerCase() === expectedTitle.toLowerCase()

    if (!matches) {
      throw new Error(`Page title mismatch. Expected: "${expectedTitle}", Actual: "${actualTitle}"`)
    }

    console.log(`✅ Page title verified: "${actualTitle}"`)
  } catch (error) {
    throw new Error(`Failed to verify page title: ${error.message}`)
  }
}
