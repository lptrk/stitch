const fs = require("fs")
const path = require("path")

console.log("🎭 Setting up Simple Playwright Runner...")

// Create runner directory
const runnerDir = path.join(process.cwd(), "runner")
if (!fs.existsSync(runnerDir)) {
  fs.mkdirSync(runnerDir, { recursive: true })
}

// Create example test workflow
const exampleWorkflow = {
  baseUrl: "https://example.com",
  workflows: {
    main: {
      name: "Simple Example Test",
      description: "Basic Playwright test example",
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
      ],
    },
  },
  mainWorkflow: "main",
}

// Save example workflow
const workflowsDir = path.join(runnerDir, "workflows")
if (!fs.existsSync(workflowsDir)) {
  fs.mkdirSync(workflowsDir, { recursive: true })
}

fs.writeFileSync(path.join(workflowsDir, "example.json"), JSON.stringify(exampleWorkflow, null, 2))

console.log("✅ Simple Playwright runner setup completed!")
console.log("\nNext steps:")
console.log("1. cd runner && npm install")
console.log("2. npx playwright install")
console.log("3. node run-workflow.js workflows/example.json")
console.log("\nOr use the web interface! 🎭")
