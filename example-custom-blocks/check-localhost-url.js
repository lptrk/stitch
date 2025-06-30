// Custom Block: Check Localhost URL
// Prüft ob die aktuelle URL localhost:3000 ist

console.log("🔍 Checking if URL is localhost:3000...")

// Declare variables before using them
const page = require("page") // Assuming 'page' is a module that provides URL functionality
const parameters = require("parameters") // Assuming 'parameters' is a module that provides configuration options

// Get current URL
const currentUrl = page.url()
console.log("Current URL:", currentUrl)

// Check if URL contains localhost:3000
const isLocalhost3000 = currentUrl.includes("localhost:3000")

if (parameters.strict === "true") {
  // Strict mode: URL must start with http://localhost:3000
  const expectedUrl = "http://localhost:3000"

  if (currentUrl.startsWith(expectedUrl)) {
    console.log("✅ URL is exactly localhost:3000")
  } else {
    throw new Error(`URL mismatch! Expected to start with "${expectedUrl}" but got "${currentUrl}"`)
  }
} else {
  // Flexible mode: URL just needs to contain localhost:3000
  if (isLocalhost3000) {
    console.log("✅ URL contains localhost:3000")
  } else {
    throw new Error(`URL check failed! Expected localhost:3000 but got "${currentUrl}"`)
  }
}

// Optional: Check specific path if provided
if (parameters.expectedPath) {
  const url = new URL(currentUrl)
  const actualPath = url.pathname

  if (actualPath === parameters.expectedPath) {
    console.log(`✅ Path matches: ${actualPath}`)
  } else {
    throw new Error(`Path mismatch! Expected "${parameters.expectedPath}" but got "${actualPath}"`)
  }
}

console.log("🎉 URL check completed successfully!")
