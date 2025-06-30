/**
 * Clicks the 'Create User' button
 * This is an example implementation - customize for your app
 */
export async function clickCreateUserButton(page, parameters = {}) {
  // You can customize the selector based on your app
  const selector = parameters.selector || '[data-testid="create-user-button"], button:has-text("Create User")'

  try {
    // Wait for the button to be visible
    await page.waitForSelector(selector, { state: "visible", timeout: 10000 })

    // Click the button
    await page.click(selector)

    // Optional: Wait for navigation or loading
    await page.waitForTimeout(1000)

    console.log("✅ Successfully clicked Create User button")
  } catch (error) {
    throw new Error(`Failed to click Create User button: ${error.message}`)
  }
}
