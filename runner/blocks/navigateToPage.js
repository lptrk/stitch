/**
 * Navigates to a specific page/path
 */
export async function navigateToPage(page, parameters = {}) {
  const path = parameters.path || "/"
  const baseUrl = parameters.baseUrl || page.url().split("/").slice(0, 3).join("/")
  const fullUrl = path.startsWith("http") ? path : `${baseUrl}${path}`

  try {
    await page.goto(fullUrl)
    await page.waitForLoadState("networkidle")

    console.log(`✅ Successfully navigated to: ${fullUrl}`)
  } catch (error) {
    throw new Error(`Failed to navigate to "${fullUrl}": ${error.message}`)
  }
}
