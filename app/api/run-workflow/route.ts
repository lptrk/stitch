import { type NextRequest, NextResponse } from "next/server"
import { runWorkflow } from "@/lib/runner/runner/factory"
import type { WorkflowConfig } from "@/lib/runner/types"
import { checkApiKey } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authError = checkApiKey(request)
  if (authError) return authError

  try {
    const workflowConfig: WorkflowConfig = await request.json()

    if (!workflowConfig.workflows || !workflowConfig.mainWorkflow) {
      return NextResponse.json({ success: false, message: "Invalid workflow configuration" }, { status: 400 })
    }

    const testResult = await runWorkflow(workflowConfig, {
      headless: true,
      timeout: 60000,
      debug: false,
    })

    return NextResponse.json({
      success: testResult.success,
      message: testResult.success ? "All tests completed successfully" : "Tests failed",
      testResult: {
        passed: testResult.success,
        duration: testResult.duration,
        error: testResult.error,
        blockResults: testResult.stepResults,
        totalSteps: testResult.stepResults.length,
        passedSteps: testResult.stepResults.filter((s) => s.status === "success").length,
        failedSteps: testResult.stepResults.filter((s) => s.status === "failed").length,
      },
    })
  } catch (error) {
    console.error("Workflow execution error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to execute workflow",
        testResult: { passed: false, duration: 0, blockResults: [], totalSteps: 0, passedSteps: 0, failedSteps: 0 },
      },
      { status: 500 },
    )
  }
}
