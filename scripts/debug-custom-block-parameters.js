// Debug script to test custom block parameter passing
const fs = require("fs")
const path = require("path")

console.log("🐛 Creating debug workflow for custom block parameters...")

// Create a test workflow with a custom block that debugs parameters
const debugWorkflow = {
  baseUrl: "https://example.com",
  workflows: {
    main: {
      name: "Debug Custom Block Parameters",
      description: "Test workflow to debug parameter passing to custom blocks",
      workflow: [
        {
          block: "goto",
          parameters: { url: "/" },
        },
        {
          block: "debug_parameters",
          parameters: {
            host: "example.com",
            testParam: "hello world",
            numberParam: "123",
          },
        },
      ],
    },
  },
  mainWorkflow: "main",
  customBlocks: {
    debug_parameters: {
      id: "debug_parameters",
      name: "Debug Parameters",
      code: `
console.log('🐛 === PARAMETER DEBUG START ===')
console.log('📋 typeof parameters:', typeof parameters)
console.log('📋 parameters object:', parameters)
console.log('📋 Object.keys(parameters):', Object.keys(parameters))

// Test each parameter individually
console.log('🔍 host parameter:', parameters.host)
console.log('🔍 testParam parameter:', parameters.testParam)
console.log('🔍 numberParam parameter:', parameters.numberParam)

// Test if parameters is undefined or empty
if (!parameters) {
  console.log('❌ parameters is undefined or null!')
} else if (Object.keys(parameters).length === 0) {
  console.log('❌ parameters object is empty!')
} else {
  console.log('✅ parameters object has', Object.keys(parameters).length, 'properties')
}

// Test URL check with host parameter
const currentUrl = page.url()
console.log('🌐 Current URL:', currentUrl)

if (parameters.host) {
  console.log('🏠 Testing host parameter:', parameters.host)
  if (currentUrl.includes(parameters.host)) {
    console.log('✅ Host found in URL')
  } else {
    console.log('❌ Host NOT found in URL')
  }
  
  // Test the original failing code
  try {
    console.log('🧪 Testing: await expect(page).toHaveURL(parameters.host)')
    await expect(page).toHaveURL(parameters.host)
    console.log('✅ toHaveURL with host parameter succeeded')
  } catch (error) {
    console.log('❌ toHaveURL with host parameter failed:', error.message)
    console.log('💡 This is expected - toHaveURL needs full URL, not just host')
  }
} else {
  console.log('❌ host parameter is undefined!')
}

console.log('🐛 === PARAMETER DEBUG END ===')
      `,
      parameters: [
        {
          id: "host",
          name: "Host",
          type: "text",
          placeholder: "example.com",
          required: false,
        },
        {
          id: "testParam",
          name: "Test Parameter",
          type: "text",
          placeholder: "test value",
          required: false,
        },
        {
          id: "numberParam",
          name: "Number Parameter",
          type: "number",
          placeholder: "123",
          required: false,
        },
      ],
    },
  },
}

// Save debug workflow
const runnerDir = path.join(process.cwd(), "runner")
const workflowsDir = path.join(runnerDir, "workflows")

if (!fs.existsSync(workflowsDir)) {
  fs.mkdirSync(workflowsDir, { recursive: true })
}

const debugFile = path.join(workflowsDir, "debug-parameters.json")
fs.writeFileSync(debugFile, JSON.stringify(debugWorkflow, null, 2))

console.log("✅ Created debug workflow:", debugFile)
console.log("\nTo debug parameter passing:")
console.log("cd runner && node run-workflow.ts workflows/debug-parameters.json")
console.log("\nThis will show you exactly what parameters are being passed to your custom block!")
console.log("Look for the '🐛 === PARAMETER DEBUG START ===' section in the output.")
