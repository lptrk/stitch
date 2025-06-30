/**
 * Clicks the save settings button
 */
export async function clickSaveSettingsButton(page, parameters = {}) {
  const selector =
    parameters.selector || '[data-testid="save-settings"], button:has-text("Save"), button:has-text("Save Settings")'

  try {
    await page.waitForSelector(selector, { state: "visible", timeout: 10000 })
    await page.click(selector)
    await page.waitForTimeout(1000)

    console.log("✅ Successfully clicked Save Settings button")
  } catch (error) {
    throw new Error(`Failed to click Save Settings button: ${error.message}`)
  }
}
