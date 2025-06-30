import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 API: Received workflow execution request")

    const workflowConfig = await request.json()
    console.log("📋 API: Workflow config received:", {
      baseUrl: workflowConfig.baseUrl,
      mainWorkflow: workflowConfig.mainWorkflow,
      totalWorkflows: Object.keys(workflowConfig.workflows).length,
    })

    // Save workflow to temporary file
    const tempDir = path.join(process.cwd(), "temp")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
      console.log("📁 API: Created temp directory")
    }

    const tempFile = path.join(tempDir, `workflow-${Date.now()}.json`)
    fs.writeFileSync(tempFile, JSON.stringify(workflowConfig, null, 2))
    console.log("💾 API: Saved workflow to temp file:", tempFile)

    // Check if runner exists
    const runnerPath = path.join(process.cwd(), "runner", "run-workflow.js")
    if (!fs.existsSync(runnerPath)) {
      console.error("❌ API: Runner not found at:", runnerPath)
      return NextResponse.json(
        {
          success: false,
          message: "Test runner not found. Please run 'npm run setup-runner' first.",
        },
        { status: 500 },
      )
    }

    console.log("🚀 API: Starting test execution (headless mode)...")

    // Execute workflow and capture results
    const testResult = await new Promise<{
      success: boolean
      exitCode: number
      output: string
      error: string
      duration: number
      blockResults: Array<{
        stepNumber: number
        blockId: string
        status: "success" | "failed"
        error?: string
        duration: number
        timestamp: string
      }>
    }>((resolve) => {
      const startTime = Date.now()
      let blockResults: any[] = []

      const child = spawn("node", [runnerPath, tempFile], {
        cwd: path.join(process.cwd(), "runner"),
        stdio: "pipe",
        env: {
          ...process.env,
          HEADLESS: "true",
        },
      })

      let testOutput = ""
      let testError = ""
      let capturingResults = false

      // Parse output for results
      child.stdout.on("data", (data) => {
        const output = data.toString()
        testOutput += output

        // Look for results section
        const lines = output.split("\n")
        lines.forEach((line) => {
          if (line.includes("=== FINAL_RESULTS ===")) {
            capturingResults = true
            console.log("📊 API: Found results section")
          } else if (line.includes("=== END_RESULTS ===")) {
            capturingResults = false
            console.log("📊 API: End of results section")
          } else if (capturingResults && line.trim()) {
            try {
              const results = JSON.parse(line.trim())
              if (Array.isArray(results)) {
                blockResults = results
                console.log("📊 API: Parsed block results:", blockResults.length, "items")
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON lines
            }
          }
        })

        console.log(`📤 Test Output: ${output.trim()}`)
      })

      child.stderr.on("data", (data) => {
        const error = data.toString()
        testError += error
        console.error(`📥 Test Error: ${error.trim()}`)
      })

      child.on("close", (code) => {
        const duration = Date.now() - startTime
        console.log(`🏁 API: Test execution finished with ${blockResults.length} block results`)
        console.log("📊 API: Block results:", blockResults)

        // Clean up temp file
        try {
          fs.unlinkSync(tempFile)
          console.log("🗑️ API: Cleaned up temp file")
        } catch (e) {
          console.warn("⚠️ API: Failed to clean up temp file:", e)
        }

        resolve({
          success: code === 0,
          exitCode: code || 0,
          output: testOutput,
          error: testError,
          duration,
          blockResults,
        })
      })

      child.on("error", (error) => {
        console.error("❌ API: Failed to spawn test runner:", error)
        resolve({
          success: false,
          exitCode: -1,
          output: "",
          error: error.message,
          duration: Date.now() - startTime,
          blockResults: [],
        })
      })
    })

    const jobId = `job-${Date.now()}`
    console.log("🆔 API: Generated job ID:", jobId)
    console.log("📊 API: Final block results count:", testResult.blockResults.length)

    return NextResponse.json({
      success: testResult.success,
      message: testResult.success
        ? "All tests completed successfully"
        : `Tests failed with exit code ${testResult.exitCode}`,
      jobId,
      baseUrl: workflowConfig.baseUrl,
      mainWorkflow: workflowConfig.mainWorkflow,
      totalWorkflows: Object.keys(workflowConfig.workflows).length,
      headless: true,
      testResult: {
        passed: testResult.success,
        exitCode: testResult.exitCode,
        duration: testResult.duration,
        output: testResult.output,
        error: testResult.error,
        blockResults: testResult.blockResults,
      },
    })
  } catch (error) {
    console.error("❌ API: Error running workflow:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to start test: ${error instanceof Error ? error.message : "Unknown error"}`,
        testResult: {
          passed: false,
          exitCode: -1,
          duration: 0,
          output: "",
          error: error instanceof Error ? error.message : "Unknown error",
          blockResults: [],
        },
      },
      { status: 500 },
    )
  }
}
