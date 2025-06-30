// Test script to verify workflow chaining works correctly
const fs = require("fs")
const path = require("path")

console.log("🧪 Testing Workflow Chaining...")

// Create a test workflow with chaining
const testWorkflow = {
  baseUrl: "https://example.com",
  workflows: {
    step1: {
      name: "Step 1 - Navigation",
      description: "Navigate to homepage",
      workflow: [
        {
          block: "navigateToPage",
          parameters: { path: "/" },
        },
        {
          block: "verifyPageTitle",
          parameters: { expectedTitle: "Example Domain" },
        },
      ],
    },
    step2: {
      name: "Step 2 - Verification",
      description: "Verify page content",
      workflow: [
        {
          block: "waitForElement",
          parameters: {
            selector: "h1",
            timeout: "5000",
          },
        },
        {
          block: "takeScreenshot",
          parameters: { filename: "example-homepage.png" },
        },
      ],
    },
    main: {
      name: "Main Chained Workflow",
      description: "Chains multiple workflows together",
      workflow: [
        {
          block: "callWorkflow",
          parameters: { workflowId: "step1" },
        },
        {
          block: "callWorkflow",
          parameters: { workflowId: "step2" },
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

const testFile = path.join(workflowsDir, "test-chaining.json")
fs.writeFileSync(testFile, JSON.stringify(testWorkflow, null, 2))

console.log("✅ Created test workflow with chaining:", testFile)
console.log("\nTo test workflow chaining:")
console.log("cd runner && node run-workflow.js workflows/test-chaining.json")
console.log("\nThis workflow will:")
console.log("1. 🔗 Call 'step1' workflow (navigate + verify title)")
console.log("2. 🔗 Call 'step2' workflow (wait for element + screenshot)")
console.log("3. ✅ Complete main workflow")
