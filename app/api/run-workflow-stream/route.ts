import { type NextRequest, NextResponse } from "next/server"
import { TestRunner } from "@/lib/runner/runner/TestRunner"
import type { WorkflowConfig } from "@/lib/runner/types"
import { checkApiKeyRaw } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authError = checkApiKeyRaw(request)
  if (authError) return authError

  let workflowConfig: WorkflowConfig
  try {
    workflowConfig = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
  }

  if (!workflowConfig.workflows || !workflowConfig.mainWorkflow) {
    return NextResponse.json({ success: false, message: "Invalid workflow configuration" }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const runner = new TestRunner({
        headless: true,
        timeout: 60000,
        debug: false,
        onStepStart: (step) => send("step-start", { stepNumber: step.stepNumber, workflowId: step.workflowId, globalStepNumber: step.globalStepNumber, blockId: step.blockId, timestamp: Date.now() }),
        onStepComplete: (step) => send("step-complete", { stepNumber: step.stepNumber, workflowId: step.workflowId, globalStepNumber: step.globalStepNumber, blockId: step.blockId, status: step.status, duration: step.duration, error: step.error, screenshot: step.screenshot, timestamp: Date.now() }),
        onProgress: (progress) => send("progress", { current: progress.current, total: progress.total }),
      })

      try {
        send("start", { message: "Workflow execution started" })
        await runner.initialize(workflowConfig.baseUrl)
        const result = await runner.runWorkflow(workflowConfig)
        send("complete", {
          success: result.success,
          duration: result.duration,
          error: result.error,
          stepResults: result.stepResults,
          totalSteps: result.stepResults.length,
          passedSteps: result.stepResults.filter((s) => s.status === "success").length,
          failedSteps: result.stepResults.filter((s) => s.status === "failed").length,
        })
      } catch (error) {
        send("error", { message: error instanceof Error ? error.message : "Unknown error" })
      } finally {
        await runner.cleanup()
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
