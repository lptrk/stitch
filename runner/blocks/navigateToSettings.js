/**
 * Navigates to the settings page
 */
export async function navigateToSettings(page, parameters = {}) {
  const path = parameters.path || "/settings"
  const baseUrl = page.url().split("/").slice(0, 3).join("/")
  const fullUrl = `${baseUrl}${path}`

  try {
    await page.goto(fullUrl)
    await page.waitForLoadState("networkidle")

    console.log(`✅ Successfully navigated to settings: ${fullUrl}`)
  } catch (error) {
    throw new Error(`Failed to navigate to settings "${fullUrl}": ${error.message}`)
  }
}
