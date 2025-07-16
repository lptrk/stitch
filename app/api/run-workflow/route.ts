/**
 * Next.js API Route mit direkter Lilo Library Integration
 * Ersetzt den spawn-basierten Ansatz mit direkter Library-Nutzung
 */

import { type NextRequest, NextResponse } from "next/server"
import {runWorkflow, TestResult, WorkflowConfig} from "stitch-runner";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 API: Received workflow execution request")

    const workflowConfig: WorkflowConfig = await request.json()

    console.log("📋 API: Workflow config received:", {
      baseUrl: workflowConfig.baseUrl,
      mainWorkflow: workflowConfig.mainWorkflow,
      totalWorkflows: Object.keys(workflowConfig.workflows).length,
    })

    // Validate workflow config
    if (!workflowConfig.workflows || !workflowConfig.mainWorkflow) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid workflow configuration",
        },
        { status: 400 },
      )
    }

    console.log("🚀 API: Starting test execution (headless mode)...")

    const startTime = Date.now()

    // Execute workflow directly with Lilo library
    const testResult: TestResult = await runWorkflow(workflowConfig, {
      headless: true,
      timeout: 60000, // 60 seconds timeout
      debug: false,
      onStepStart: (step) => {
        console.log(`🔄 API: Starting step ${step.stepNumber}: ${step.blockId}`)
      },
      onStepComplete: (step) => {
        console.log(`✅ API: Completed step ${step.stepNumber}: ${step.blockId} (${step.status})`)
      },
      onProgress: (progress) => {
        console.log(`📊 API: Progress ${progress.current}/${progress.total}`)
      },
    })

    const duration = Date.now() - startTime
    const jobId = `job-${Date.now()}`

    console.log("🏁 API: Test execution finished")
    console.log("📊 API: Test result:", {
      success: testResult.success,
      duration: testResult.duration,
      stepCount: testResult.stepResults.length,
    })

    return NextResponse.json({
      success: testResult.success,
      message: testResult.success ? "All tests completed successfully" : `Tests failed: ${testResult.error}`,
      jobId,
      baseUrl: workflowConfig.baseUrl,
      mainWorkflow: workflowConfig.mainWorkflow,
      totalWorkflows: Object.keys(workflowConfig.workflows).length,
      headless: true,
      testResult: {
        passed: testResult.success,
        duration: testResult.duration,
        error: testResult.error,
        stepResults: testResult.stepResults, // Direkt von Lilo
        totalSteps: testResult.stepResults.length,
        passedSteps: testResult.stepResults.filter((step) => step.status === "success").length,
        failedSteps: testResult.stepResults.filter((step) => step.status === "failed").length,
      },
    })
  } catch (error) {
    console.error("❌ API: Error running workflow:", error)

    return NextResponse.json(
      {
        success: false,
        message: `Failed to execute test: ${error instanceof Error ? error.message : "Unknown error"}`,
        testResult: {
          passed: false,
          duration: 0,
          error: error instanceof Error ? error.message : "Unknown error",
          stepResults: [],
          totalSteps: 0,
          passedSteps: 0,
          failedSteps: 0,
        },
      },
      { status: 500 },
    )
  }
}
