// Test script to verify parameter passing works correctly
const fs = require("fs")
const path = require("path")

console.log("🧪 Testing Parameter Passing...")

// Create a test workflow that uses parameters
const testWorkflow = {
  baseUrl: "https://example.com",
  workflows: {
    main: {
      name: "Parameter Test Workflow",
      description: "Test workflow to verify parameter passing",
      workflow: [
        {
          block: "goto",
          parameters: { url: "/" },
        },
        {
          block: "expectURL",
          parameters: {
            host: "example.com",
            path: "/",
            contains: "example",
          },
        },
        {
          block: "expectTitle",
          parameters: {
            contains: "Example",
          },
        },
      ],
    },
  },
  mainWorkflow: "main",
  customBlocks: {
    test_parameters: {
      id: "test_parameters",
      name: "Test Parameters",
      code: `
console.log('🧪 Testing parameter access...')
console.log('📋 All parameters:', parameters)
console.log('📋 Parameter keys:', Object.keys(parameters))

// Test each parameter type
if (parameters.textParam) {
  console.log('✅ Text parameter:', parameters.textParam)
}

if (parameters.numberParam) {
  console.log('✅ Number parameter:', parameters.numberParam)
}

if (parameters.selectorParam) {
  console.log('✅ Selector parameter:', parameters.selectorParam)
}

// Test URL checking with parameters
const currentUrl = page.url()
console.log('🌐 Current URL:', currentUrl)

if (parameters.expectedHost) {
  console.log('🏠 Checking host:', parameters.expectedHost)
  if (currentUrl.includes(parameters.expectedHost)) {
    console.log('✅ Host check passed')
  } else {
    console.log('❌ Host check failed')
  }
}

console.log('🎉 Parameter test completed!')
      `,
      parameters: [
        {
          id: "textParam",
          name: "Text Parameter",
          type: "text",
          placeholder: "Enter text...",
          required: false,
        },
        {
          id: "numberParam",
          name: "Number Parameter",
          type: "number",
          placeholder: "123",
          required: false,
        },
        {
          id: "selectorParam",
          name: "Selector Parameter",
          type: "selector",
          placeholder: "button",
          required: false,
        },
        {
          id: "expectedHost",
          name: "Expected Host",
          type: "text",
          placeholder: "example.com",
          required: false,
        },
      ],
    },
  },
}

// Save test workflow
const runnerDir = path.join(process.cwd(), "runner")
const workflowsDir = path.join(runnerDir, "workflows")

if (!fs.existsSync(workflowsDir)) {
  fs.mkdirSync(workflowsDir, { recursive: true })
}

const testFile = path.join(workflowsDir, "parameter-test.json")
fs.writeFileSync(testFile, JSON.stringify(testWorkflow, null, 2))

console.log("✅ Created parameter test workflow:", testFile)
console.log("\nTo test parameter passing:")
console.log("1. Import the custom block from example-custom-blocks/url-checker-config.json")
console.log("2. Add it to your workflow with different parameter values")
console.log("3. Run the test and check the console output")
console.log("4. Or run: cd runner && node run-workflow.js workflows/parameter-test.json")
