/**
 * Clicks the logout button
 */
export async function clickLogoutButton(page, parameters = {}) {
  const selector =
    parameters.selector || '[data-testid="logout-button"], button:has-text("Logout"), button:has-text("Sign Out")'

  try {
    await page.waitForSelector(selector, { state: "visible", timeout: 10000 })
    await page.click(selector)
    await page.waitForTimeout(1000)

    console.log("✅ Successfully clicked Logout button")
  } catch (error) {
    throw new Error(`Failed to click Logout button: ${error.message}`)
  }
}
