// Test script to verify status updates work
const fs = require("fs")
const path = require("path")

console.log("🧪 Creating test workflow for status updates...")

// Create a simple test workflow
const testWorkflow = {
  baseUrl: "https://example.com",
  workflows: {
    main: {
      name: "Status Test Workflow",
      description: "Test workflow to verify status updates",
      workflow: [
        {
          block: "goto",
          parameters: { url: "/" },
        },
        {
          block: "expectVisible",
          parameters: { selector: "h1" },
        },
        {
          block: "expectText",
          parameters: {
            selector: "h1",
            text: "Example Domain",
          },
        },
        {
          block: "wait",
          parameters: { ms: "1000" },
        },
      ],
    },
  },
  mainWorkflow: "main",
}

// Save test workflow
const runnerDir = path.join(process.cwd(), "runner")
const workflowsDir = path.join(runnerDir, "workflows")

if (!fs.existsSync(workflowsDir)) {
  fs.mkdirSync(workflowsDir, { recursive: true })
}

const testFile = path.join(workflowsDir, "status-test.json")
fs.writeFileSync(testFile, JSON.stringify(testWorkflow, null, 2))

console.log("✅ Created status test workflow:", testFile)
console.log("\nTo test status updates:")
console.log("1. Add these blocks to your workflow in the UI:")
console.log("   - Navigate to URL (url: /)")
console.log("   - Expect Visible (selector: h1)")
console.log("   - Expect Text (selector: h1, text: Example Domain)")
console.log("   - Wait (ms: 1000)")
console.log("2. Set Base URL to: https://example.com")
console.log("3. Click 'Run Test'")
console.log("4. Watch the blocks turn green/red based on results!")
