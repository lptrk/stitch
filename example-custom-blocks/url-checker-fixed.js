// Import necessary variables and functions
const { parameters, page, expect } = require("./your-module") // Adjust the import path as necessary

// Fixed URL Checker - Korrekte Parameter-Verwendung
console.log("🔍 Checking URL with parameters:", parameters)

// Debug: Zeige alle verfügbaren Parameter
console.log("📋 Available parameters:", Object.keys(parameters))
console.log("📋 Parameter values:", parameters)

// Get current URL
const currentUrl = page.url()
console.log("🌐 Current URL:", currentUrl)

// Check different URL aspects based on parameters
if (parameters.exactUrl) {
  // Exact URL match
  console.log(`🎯 Checking exact URL: ${parameters.exactUrl}`)
  await expect(page).toHaveURL(parameters.exactUrl)
  console.log("✅ Exact URL match successful")
} else if (parameters.host) {
  // Host check
  const expectedHost = parameters.host
  console.log(`🏠 Checking host: ${expectedHost}`)

  // Build expected URL pattern
  const hostPattern = expectedHost.startsWith("http") ? expectedHost : `http://${expectedHost}`

  console.log(`🔍 Looking for host pattern: ${hostPattern}`)

  // Check if current URL starts with expected host
  if (currentUrl.startsWith(hostPattern) || currentUrl.includes(expectedHost)) {
    console.log("✅ Host check successful")
  } else {
    throw new Error(`Host mismatch! Expected "${expectedHost}" but current URL is "${currentUrl}"`)
  }
} else if (parameters.path) {
  // Path check
  const expectedPath = parameters.path
  console.log(`📍 Checking path: ${expectedPath}`)

  const url = new URL(currentUrl)
  const actualPath = url.pathname

  if (actualPath === expectedPath || actualPath.includes(expectedPath)) {
    console.log(`✅ Path check successful: ${actualPath}`)
  } else {
    throw new Error(`Path mismatch! Expected "${expectedPath}" but got "${actualPath}"`)
  }
} else if (parameters.contains) {
  // Contains check
  const searchTerm = parameters.contains
  console.log(`🔍 Checking if URL contains: ${searchTerm}`)

  if (currentUrl.includes(searchTerm)) {
    console.log("✅ Contains check successful")
  } else {
    throw new Error(`URL does not contain "${searchTerm}". Current URL: "${currentUrl}"`)
  }
} else {
  // Default: just log current URL
  console.log("ℹ️ No specific URL check parameters provided")
  console.log(`📍 Current URL: ${currentUrl}`)
}

console.log("🎉 URL check completed successfully!")
