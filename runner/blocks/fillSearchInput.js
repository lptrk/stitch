import { validateParameters } from "./index.js"

/**
 * Fills a search input field with specified text
 */
export async function fillSearchInput(page, parameters = {}) {
  validateParameters(parameters, ["searchText"])

  const searchText = parameters.searchText
  const selector =
    parameters.selector || '[data-testid="search-input"], input[type="search"], input[placeholder*="search" i]'

  try {
    // Wait for the input to be visible
    await page.waitForSelector(selector, { state: "visible", timeout: 10000 })

    // Clear existing text and fill with new text
    await page.fill(selector, searchText)

    // Optional: Press Enter to trigger search
    if (parameters.pressEnter !== "false") {
      await page.press(selector, "Enter")
      await page.waitForTimeout(1000) // Wait for search results
    }

    console.log(`✅ Successfully filled search input with: "${searchText}"`)
  } catch (error) {
    throw new Error(`Failed to fill search input: ${error.message}`)
  }
}
