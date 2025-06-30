import path from "path"
import fs from "fs"

/**
 * Takes a screenshot of the current page
 */
export async function takeScreenshot(page, parameters = {}) {
  const filename = parameters.filename || `screenshot-${Date.now()}.png`
  const screenshotsDir = path.join(process.cwd(), "screenshots")

  try {
    // Create screenshots directory if it doesn't exist
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }

    const filepath = path.join(screenshotsDir, filename)
    await page.screenshot({ path: filepath, fullPage: true })

    console.log(`✅ Screenshot saved: ${filepath}`)
  } catch (error) {
    throw new Error(`Failed to take screenshot: ${error.message}`)
  }
}
