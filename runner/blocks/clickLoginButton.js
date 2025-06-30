/**
 * Clicks the login button
 * Customize the selector for your app
 */
export async function clickLoginButton(page, parameters = {}) {
  const selector =
    parameters.selector || '[data-testid="login-button"], button:has-text("Login"), button:has-text("Sign In")'

  try {
    await page.waitForSelector(selector, { state: "visible", timeout: 10000 })
    await page.click(selector)
    await page.waitForTimeout(1000)

    console.log("✅ Successfully clicked Login button")
  } catch (error) {
    throw new Error(`Failed to click Login button: ${error.message}`)
  }
}
