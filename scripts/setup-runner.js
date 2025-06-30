// Node.js script to set up the Playwright test runner
const fs = require("fs")
const path = require("path")

// Create runner directory structure
const runnerDir = path.join(process.cwd(), "runner")
const blocksDir = path.join(runnerDir, "blocks")
const workflowsDir = path.join(runnerDir, "workflows")

// Create directories
if (!fs.existsSync(runnerDir)) {
  fs.mkdirSync(runnerDir)
}
if (!fs.existsSync(blocksDir)) {
  fs.mkdirSync(blocksDir)
}
if (!fs.existsSync(workflowsDir)) {
  fs.mkdirSync(workflowsDir)
}

// Create block registry
const blockRegistry = `
// Block registry for Playwright test functions
const { clickCreateUserButton } = require('./clickCreateUserButton')
const { clickSaveSettingsButton } = require('./clickSaveSettingsButton')
const { clickLoginButton } = require('./clickLoginButton')
const { clickLogoutButton } = require('./clickLogoutButton')
const { fillSearchInput } = require('./fillSearchInput')
const { navigateToSettings } = require('./navigateToSettings')
const { verifyPageTitle } = require('./verifyPageTitle')
const { clickGenericButton } = require('./clickGenericButton')
const { typeInInput } = require('./typeInInput')

const blockRegistry = {
  clickCreateUserButton,
  clickSaveSettingsButton,
  clickLoginButton,
  clickLogoutButton,
  fillSearchInput,
  navigateToSettings,
  verifyPageTitle,
  clickGenericButton,
  typeInInput
}

module.exports = { blockRegistry }
`

fs.writeFileSync(path.join(blocksDir, "index.js"), blockRegistry)

// Create example block implementations
const exampleBlock = `
// Example Playwright test block
async function clickCreateUserButton(page) {
  await page.click('[data-testid="create-user-button"]')
  console.log('Clicked create user button')
}

module.exports = { clickCreateUserButton }
`

fs.writeFileSync(path.join(blocksDir, "clickCreateUserButton.js"), exampleBlock)

// Create workflow runner
const workflowRunner = `
const { chromium } = require('playwright')
const { blockRegistry } = require('./blocks')
const fs = require('fs')

async function runWorkflow(workflowPath) {
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'))
  
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Navigate to your application
    await page.goto('http://localhost:3000')
    
    // Execute each block in sequence
    for (const step of workflow) {
      const blockFunction = blockRegistry[step.block]
      if (blockFunction) {
        console.log(\`Executing: \${step.block}\`)
        await blockFunction(page)
        await page.waitForTimeout(1000) // Wait between steps
      } else {
        console.warn(\`Block not found: \${step.block}\`)
      }
    }
    
    console.log('Workflow completed successfully')
  } catch (error) {
    console.error('Workflow failed:', error)
  } finally {
    await browser.close()
  }
}

// Run workflow if called directly
if (require.main === module) {
  const workflowPath = process.argv[2] || './workflows/example.json'
  runWorkflow(workflowPath)
}

module.exports = { runWorkflow }
`

fs.writeFileSync(path.join(runnerDir, "run-workflow.js"), workflowRunner)

// Create example workflow
const exampleWorkflow = [{ block: "clickCreateUserButton" }, { block: "clickSaveSettingsButton" }]

fs.writeFileSync(path.join(workflowsDir, "example.json"), JSON.stringify(exampleWorkflow, null, 2))

console.log("Runner setup completed!")
console.log("Created directories:")
console.log("- runner/")
console.log("- runner/blocks/")
console.log("- runner/workflows/")
console.log("")
console.log("To run a workflow:")
console.log("cd runner && node run-workflow.js workflows/example.json")
