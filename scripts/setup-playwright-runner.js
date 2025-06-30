const fs = require("fs")
const path = require("path")

console.log("🚀 Setting up Playwright Test Runner...")

// Create runner directory structure
const runnerDir = path.join(process.cwd(), "runner")
const blocksDir = path.join(runnerDir, "blocks")
const workflowsDir = path.join(runnerDir, "workflows")
const utilsDir = path.join(runnerDir, "utils")

// Create directories
const dirs = [runnerDir, blocksDir, workflowsDir, utilsDir]
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`✅ Created directory: ${path.relative(process.cwd(), dir)}`)
  }
})

// Create package.json for runner
const runnerPackageJson = {
  name: "e2e-test-runner",
  version: "1.0.0",
  description: "Playwright test runner for visual E2E test builder",
  main: "run-workflow.js",
  scripts: {
    test: "node run-workflow.js",
    "test:headless": "HEADLESS=true node run-workflow.js",
    "test:debug": "DEBUG=true node run-workflow.js",
  },
  dependencies: {
    playwright: "^1.40.0",
    chalk: "^4.1.2",
  },
  type: "module",
}

fs.writeFileSync(path.join(runnerDir, "package.json"), JSON.stringify(runnerPackageJson, null, 2))
console.log("✅ Created runner/package.json")

// Create example workflow
const exampleWorkflow = {
  baseUrl: "http://localhost:3000",
  workflows: {
    main: {
      name: "Example Workflow",
      description: "A simple example workflow",
      workflow: [
        { block: "navigateToPage", parameters: { path: "/" } },
        { block: "verifyPageTitle", parameters: { expectedTitle: "My App" } },
        { block: "clickGenericButton", parameters: { selector: "button[data-testid='login-btn']" } },
      ],
    },
  },
  mainWorkflow: "main",
}

fs.writeFileSync(path.join(workflowsDir, "example.json"), JSON.stringify(exampleWorkflow, null, 2))
console.log("✅ Created example workflow")

console.log("\n🎉 Playwright runner setup completed!")
console.log("\nNext steps:")
console.log("1. cd runner && npm install")
console.log("2. node run-workflow.js workflows/example.json")
console.log("\nOr run from the web interface! 🚀")
