// Advanced URL Checker - Mehr Features
// Prüft URL, Port, Protocol, Query Parameters

// Declare variables before using them
const page = { url: () => "http://localhost:3000/path?param=value" } // Example declaration
const parameters = {
  hostname: "localhost",
  port: "3000",
  protocol: "http",
  path: "/path",
  queryParam: "param",
  queryValue: "value",
} // Example declaration

console.log("🔍 Advanced URL checking...")

const currentUrl = page.url()
const url = new URL(currentUrl)

console.log("📊 URL Analysis:")
console.log("  Full URL:", currentUrl)
console.log("  Protocol:", url.protocol)
console.log("  Hostname:", url.hostname)
console.log("  Port:", url.port)
console.log("  Pathname:", url.pathname)
console.log("  Search:", url.search)

// Check hostname
const expectedHostname = parameters.hostname || "localhost"
if (url.hostname !== expectedHostname) {
  throw new Error(`Hostname mismatch! Expected "${expectedHostname}" but got "${url.hostname}"`)
}
console.log("✅ Hostname check passed")

// Check port
const expectedPort = parameters.port || "3000"
const actualPort = url.port || (url.protocol === "https:" ? "443" : "80")
if (actualPort !== expectedPort) {
  throw new Error(`Port mismatch! Expected "${expectedPort}" but got "${actualPort}"`)
}
console.log("✅ Port check passed")

// Check protocol if specified
if (parameters.protocol) {
  const expectedProtocol = parameters.protocol.endsWith(":") ? parameters.protocol : parameters.protocol + ":"
  if (url.protocol !== expectedProtocol) {
    throw new Error(`Protocol mismatch! Expected "${expectedProtocol}" but got "${url.protocol}"`)
  }
  console.log("✅ Protocol check passed")
}

// Check path if specified
if (parameters.path) {
  if (url.pathname !== parameters.path) {
    throw new Error(`Path mismatch! Expected "${parameters.path}" but got "${url.pathname}"`)
  }
  console.log("✅ Path check passed")
}

// Check query parameter if specified
if (parameters.queryParam && parameters.queryValue) {
  const urlParams = new URLSearchParams(url.search)
  const actualValue = urlParams.get(parameters.queryParam)

  if (actualValue !== parameters.queryValue) {
    throw new Error(
      `Query parameter mismatch! Expected "${parameters.queryParam}=${parameters.queryValue}" but got "${parameters.queryParam}=${actualValue}"`,
    )
  }
  console.log("✅ Query parameter check passed")
}

console.log("🎉 All URL checks completed successfully!")
