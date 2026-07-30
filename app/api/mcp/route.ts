/**
 * MCP (Model Context Protocol) endpoint for Stitch — lets AI coding agents verify their own
 * changes by composing and running real Stitch blocks, without ever writing or submitting raw
 * test code. See /Users/patrik/.claude/plans/frolicking-snacking-mitten.md for the full design
 * rationale (why this is deliberately a thin protocol layer, why custom blocks are unreachable
 * from here, why there's no create/save-workflow tool).
 *
 * Uses WebStandardStreamableHTTPServerTransport, which speaks the MCP Streamable HTTP transport
 * directly over the Fetch API's Request/Response — the natural fit for a Next.js route handler
 * (no Node http.Server bridging needed, unlike the SDK's Express-oriented StreamableHTTPServerTransport).
 * Run stateless (no sessionIdGenerator): each Stitch tool call is a one-shot request/response,
 * nothing here needs multi-request session state.
 */
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { checkApiKeyRaw } from "@/lib/security"
import {
  listBlocks,
  runWorkflowTool,
  generatePlaywrightCodeTool,
  importSpecTool,
  startSessionTool,
  addStepTool,
  runSessionTool,
  endSessionTool,
  inspectPageTool,
  type McpStep,
} from "@/lib/mcp/tools"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stepSchema = z.object({
  blockId: z.string(),
  parameters: z.record(z.string()).optional(),
})

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] }
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return { content: [{ type: "text" as const, text: message }], isError: true }
}

interface FailureWithScreenshot {
  stepNumber: number
  blockId: string
  error?: string
  screenshot?: string
}

/** run_workflow/run_session share this: the text summary keeps `failures` as {stepNumber,
 * blockId, error} only (no base64 bloat), and each failure's screenshot — if it managed to
 * capture one — becomes its own MCP image content block alongside the text, the protocol's
 * native way to hand an agent visual context instead of a blind error string. Also strips that
 * same screenshot back out of `steps[]` (run_workflow includes a per-step screenshot field for
 * the dedicated `screenshot` block) so a failed step's image isn't duplicated in both the text
 * payload and its own content block. */
function workflowResult(result: {
  failures?: FailureWithScreenshot[]
  steps?: Array<{ stepNumber: number; screenshot?: string }>
}) {
  const failures = result.failures ?? []
  const failedStepNumbers = new Set(failures.map((f) => f.stepNumber))

  const textPayload = {
    ...result,
    ...(result.steps
      ? { steps: result.steps.map((s) => (failedStepNumbers.has(s.stepNumber) ? { ...s, screenshot: undefined } : s)) }
      : {}),
    failures: failures.map(({ screenshot, ...rest }) => rest),
  }

  const content: Array<
    { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
  > = [{ type: "text", text: JSON.stringify(textPayload, null, 2) }]

  for (const failure of failures) {
    if (failure.screenshot) {
      content.push({
        type: "image",
        data: failure.screenshot.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: "image/jpeg",
      })
    }
  }

  return { content }
}

// A fresh McpServer per request (see handle() below), not a module-level singleton — the SDK's
// Server.connect() throws "Already connected to a transport" if two requests race against the
// same server instance (confirmed in practice: concurrent tool calls / health-check polling
// produced real 500s). Only the *transport* being per-request isn't enough; the server it's
// attached to has to be too.
function createServer() {
  const server = new McpServer({ name: "stitch", version: "1.0.0" })

registerTools(server)
  return server
}

function registerTools(server: McpServer) {
server.registerTool(
  "list_blocks",
  {
    description:
      "List Stitch's built-in test blocks (optionally filtered by category), with their parameters. Call this first to know what block ids and parameters are valid for run_workflow / generate_playwright_code.",
    inputSchema: { category: z.string().optional() },
  },
  async ({ category }) => {
    try {
      return textResult(listBlocks(category))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  "run_workflow",
  {
    description:
      "Run a workflow made of Stitch blocks against a real browser and return pass/fail per step. Every blockId must come from list_blocks — unknown block ids are rejected, and there is no way to submit custom/raw code through this tool. Nothing is persisted server-side; the caller holds the workflow definition.",
    inputSchema: {
      name: z.string(),
      baseUrl: z.string().url(),
      steps: z.array(stepSchema).min(1),
    },
  },
  async ({ name, baseUrl, steps }) => {
    try {
      return workflowResult(await runWorkflowTool({ name, baseUrl, steps: steps as McpStep[] }))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  "generate_playwright_code",
  {
    description:
      "Generate the Playwright spec.ts code Stitch would produce for a given set of blocks, without running it. Same block-id validation as run_workflow.",
    inputSchema: {
      name: z.string(),
      baseUrl: z.string().url(),
      steps: z.array(stepSchema).min(1),
    },
  },
  async ({ name, baseUrl, steps }) => {
    try {
      return textResult(generatePlaywrightCodeTool({ name, baseUrl, steps: steps as McpStep[] }))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  "import_spec",
  {
    description:
      "Parse an existing Playwright spec file's source and return Stitch's structured view of it: which statements matched known blocks (with blockId + parameters) and which couldn't be matched (returned as raw code fallback). Useful before run_workflow if you already have a hand-written test.",
    inputSchema: { code: z.string() },
  },
  async ({ code }) => {
    try {
      return textResult(importSpecTool({ code }))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  "start_session",
  {
    description:
      "Start a Live Agent Session: a workflow a human can watch being built in real time in the Stitch canvas (if they have it open and subscribed to /api/live-sessions/stream). Returns a sessionId — pass it to add_step, run_session, and end_session. Use this instead of run_workflow when you want the build process itself to be visible, not just the final result.",
    inputSchema: { name: z.string(), baseUrl: z.string().url() },
  },
  async ({ name, baseUrl }) => {
    try {
      return textResult(startSessionTool({ name, baseUrl }))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  "add_step",
  {
    description:
      "Add one block to a Live Agent Session — appears immediately in a watching browser's canvas. Same blockId validation as run_workflow: unknown or custom block ids are rejected. Call repeatedly to build up the workflow one visible step at a time, then call run_session.",
    inputSchema: { sessionId: z.string(), blockId: z.string(), parameters: z.record(z.string()).optional() },
  },
  async ({ sessionId, blockId, parameters }) => {
    try {
      return textResult(addStepTool({ sessionId, blockId, parameters }))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  "run_session",
  {
    description:
      "Run every step currently in a Live Agent Session against a real browser. A human watching the canvas sees each block light up running/passed/failed live, the same way a manually-triggered run looks. The session stays open afterward (status returns to 'building') so you can add more steps and run again — call end_session when truly done.",
    inputSchema: { sessionId: z.string() },
  },
  async ({ sessionId }) => {
    try {
      return workflowResult(await runSessionTool({ sessionId }))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  "end_session",
  {
    description:
      "Mark a Live Agent Session finished. Lifts the read-only lock in the Stitch canvas so the human can edit it normally afterward, same as any other workflow. Call this once you're done building/running, not after every run_session.",
    inputSchema: { sessionId: z.string() },
  },
  async ({ sessionId }) => {
    try {
      return textResult(endSessionTool({ sessionId }))
    } catch (error) {
      return errorResult(error)
    }
  },
)

server.registerTool(
  "inspect_page",
  {
    description:
      "Open a URL in a real (throwaway) browser and return ready-to-use selectors for every interactive element on the page (buttons, links, inputs, selects, textareas, roles). Use this to discover real selectors before composing a run_workflow/add_step call instead of guessing them. Same selector-priority logic Stitch's browser extension uses for human element picking: data-testid family > stable id > aria-label > name/placeholder > button/link text > role > filtered class.",
    inputSchema: {
      url: z.string().describe("Absolute URL, or a path like /login if baseUrl is also given"),
      baseUrl: z.string().url().optional(),
    },
  },
  async ({ url, baseUrl }) => {
    try {
      return textResult(await inspectPageTool({ url, baseUrl }))
    } catch (error) {
      return errorResult(error)
    }
  },
)
}

async function handle(request: NextRequest): Promise<Response> {
  const authError = checkApiKeyRaw(request)
  if (authError) return authError

  // enableJsonResponse: this endpoint only ever does one-shot request/response tool calls, no
  // server-initiated notifications — plain JSON avoids SSE-stream lifecycle issues entirely
  // (an SSE response here raced with our per-request transport teardown below).
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  const server = createServer()
  try {
    await server.connect(transport)
    return await transport.handleRequest(request)
  } finally {
    await transport.close()
  }
}

export async function POST(request: NextRequest) {
  return handle(request)
}

// This transport is stateless (sessionIdGenerator: undefined): every tool call is a single
// POST request/response, so GET (SSE server-push stream) and DELETE (session termination) have
// no meaningful semantics here. Routing them into handle() used to open a transport just to
// close it again in the same tick — a stream that opens then instantly EOFs instead of a clean
// error. Reject them outright instead.
function methodNotAllowed() {
  return NextResponse.json(
    { error: "This MCP endpoint only supports POST" },
    { status: 405, headers: { Allow: "POST" } },
  )
}

export async function GET() {
  return methodNotAllowed()
}

export async function DELETE() {
  return methodNotAllowed()
}
