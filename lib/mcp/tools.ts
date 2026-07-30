/**
 * MCP tool handlers for Stitch. Framework-agnostic — no Next.js or MCP SDK imports here,
 * only Stitch's own already-existing business logic (block registry, code generation,
 * the TestRunner, the spec-import pipeline). The route handler (app/api/mcp/route.ts) is
 * the only place that knows about the MCP protocol; this file just wraps what already exists.
 *
 * Security rule (see the approved plan): every step submitted through these tools is a bare
 * `{blockId, parameters}` pair — there is no way to submit a custom block's raw code through
 * MCP at all. `validateBlockIds` rejects any blockId that isn't a real, registered block, so
 * an AI agent can only ever compose workflows out of the same vetted block set a human sees
 * in the UI, never arbitrary server-executed code.
 */
import { chromium } from "playwright"
import { uiBlocks, executionRegistry } from "@/lib/blocks/registry"
import { runWorkflow as runTestWorkflow } from "@/lib/runner/runner/factory"
import { TestRunner } from "@/lib/runner/runner/TestRunner"
import { generatePlaywrightSpecTS } from "@/lib/code-generators"
import { parseSpecFile } from "@/lib/spec-import/parse"
import { buildImportResult } from "@/lib/spec-import/build-workflow"
import { resolveUrl } from "@/lib/blocks/navigation"
import { discoverSelectors } from "@/lib/selector-discovery"
import type { WorkflowConfig as RunnerWorkflowConfig, StepResult } from "@/lib/runner/types"
import {
  createSession,
  getSession,
  addStep as addLiveStep,
  setSessionStatus,
  updateStepStatus,
  endSession as endLiveSession,
} from "@/lib/live-sessions"

/** Shared by run_workflow/run_session: first 3 failed steps, screenshot included so the route
 * handler can peel it off into an MCP image content block. Capped so a workflow with many
 * failures doesn't blow up the response. */
const MAX_REPORTED_FAILURES = 3

function collectFailures(stepResults: StepResult[]) {
  return stepResults
    .filter((s) => s.status === "failed")
    .slice(0, MAX_REPORTED_FAILURES)
    .map((s) => ({ stepNumber: s.stepNumber, blockId: s.blockId, error: s.error, screenshot: s.screenshot }))
}

export interface McpStep {
  blockId: string
  parameters?: Record<string, string>
}

/** Throws if any step references an unknown blockId. This is the one place that enforces
 * "MCP can only run real, registered blocks" — never skip or soften this check. */
function validateBlockIds(steps: McpStep[]): void {
  const unknown = steps.map((s) => s.blockId).filter((id) => !(id in executionRegistry))
  if (unknown.length > 0) {
    throw new Error(
      `Unknown block id(s): ${[...new Set(unknown)].join(", ")}. Call list_blocks to see the full set of valid block ids.`,
    )
  }
}

// ─── list_blocks ─────────────────────────────────────────────────────────────

export function listBlocks(category?: string) {
  const blocks = category ? uiBlocks.filter((b) => b.category === category) : uiBlocks
  return blocks.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    category: b.category,
    parameters: (b.parameters || []).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      required: !!p.required,
      defaultValue: p.defaultValue,
      options: p.options,
    })),
  }))
}

// ─── run_workflow ────────────────────────────────────────────────────────────

export async function runWorkflowTool(input: { name: string; baseUrl: string; steps: McpStep[] }) {
  validateBlockIds(input.steps)

  const config: RunnerWorkflowConfig = {
    baseUrl: input.baseUrl,
    workflows: {
      main: {
        name: input.name,
        workflow: input.steps.map((s) => ({ block: s.blockId, parameters: s.parameters || {} })),
      },
    },
    mainWorkflow: "main",
  }

  const result = await runTestWorkflow(config, { headless: true, timeout: 60000, debug: false })

  return {
    success: result.success,
    duration: result.duration,
    error: result.error,
    steps: result.stepResults.map((s) => ({
      stepNumber: s.stepNumber,
      blockId: s.blockId,
      status: s.status,
      duration: s.duration,
      error: s.error,
      screenshot: s.screenshot,
    })),
    totalSteps: result.stepResults.length,
    passedSteps: result.stepResults.filter((s) => s.status === "success").length,
    failedSteps: result.stepResults.filter((s) => s.status === "failed").length,
    failures: collectFailures(result.stepResults),
  }
}

// ─── generate_playwright_code ───────────────────────────────────────────────

export function generatePlaywrightCodeTool(input: { name: string; baseUrl: string; steps: McpStep[] }) {
  validateBlockIds(input.steps)

  const workflowItems = input.steps.map((s, i) => {
    const block = uiBlocks.find((b) => b.id === s.blockId)!
    return {
      id: `${s.blockId}-${i}`,
      blockId: s.blockId,
      block,
      parameters: s.parameters || {},
    }
  })

  const code = generatePlaywrightSpecTS({ name: input.name, items: workflowItems as any }, input.baseUrl)
  return { code }
}

// ─── import_spec ─────────────────────────────────────────────────────────────

export function importSpecTool(input: { code: string }) {
  if (!input.code.trim()) {
    throw new Error("Empty spec source — nothing to parse.")
  }
  const spec = parseSpecFile("mcp-import.spec.ts", input.code)
  if (spec.tests.length === 0) {
    throw new Error("No test(...) blocks found in this source.")
  }
  return buildImportResult(spec)
}

// ─── Live Agent Sessions ─────────────────────────────────────────────────────
// The incremental counterparts to run_workflow: instead of submitting a whole workflow in one
// call, an agent builds one step at a time so a human watching the Stitch canvas (subscribed to
// /api/live-sessions/stream) sees each block appear and run live. Same blockId validation as
// every other tool — there is still no way to add a custom-code step through this path.

export function startSessionTool(input: { name: string; baseUrl: string }) {
  const session = createSession(input.name, input.baseUrl)
  return { sessionId: session.id, name: session.name, baseUrl: session.baseUrl, status: session.status }
}

export function addStepTool(input: { sessionId: string; blockId: string; parameters?: Record<string, string> }) {
  validateBlockIds([{ blockId: input.blockId, parameters: input.parameters }])
  const item = addLiveStep(input.sessionId, input.blockId, input.parameters || {})
  return { itemId: item.id, blockId: item.blockId, parameters: item.parameters }
}

export async function runSessionTool(input: { sessionId: string }) {
  const session = getSession(input.sessionId)
  if (!session) throw new Error(`Live session "${input.sessionId}" not found (it may have ended or expired).`)
  if (session.items.length === 0) throw new Error("This session has no steps yet — call add_step first.")

  setSessionStatus(session.id, "running")

  const config: RunnerWorkflowConfig = {
    baseUrl: session.baseUrl,
    workflows: {
      main: {
        name: session.name,
        workflow: session.items.map((item) => ({ block: item.blockId, parameters: item.parameters || {} })),
      },
    },
    mainWorkflow: "main",
  }

  const runner = new TestRunner({
    headless: true,
    timeout: 60000,
    debug: false,
    onStepStart: (step) => {
      const item = session.items[step.stepNumber - 1]
      if (item) updateStepStatus(session.id, item.id, { executionStatus: "running" })
    },
    onStepComplete: (step) => {
      const item = session.items[step.stepNumber - 1]
      if (item) {
        updateStepStatus(session.id, item.id, {
          executionStatus: step.status,
          executionError: step.error,
          executionDuration: step.duration,
        })
      }
    },
  })

  try {
    await runner.initialize(session.baseUrl)
    const result = await runner.runWorkflow(config)
    // Back to "building", not "idle" — the agent may add more steps and run again. Only
    // end_session lifts the human read-only lock, so a run finishing doesn't silently hand
    // control back mid-iteration.
    setSessionStatus(session.id, "building")
    return {
      success: result.success,
      duration: result.duration,
      error: result.error,
      totalSteps: result.stepResults.length,
      passedSteps: result.stepResults.filter((s) => s.status === "success").length,
      failedSteps: result.stepResults.filter((s) => s.status === "failed").length,
      failures: collectFailures(result.stepResults),
    }
  } finally {
    await runner.cleanup()
  }
}

export function endSessionTool(input: { sessionId: string }) {
  const session = endLiveSession(input.sessionId)
  return { sessionId: session.id, status: session.status }
}

// ─── inspect_page ────────────────────────────────────────────────────────────
// Discovery tool, not an execution tool: opens its own short-lived Playwright browser (not the
// TestRunner — that class runs a whole workflow, this only navigates and reads) and returns
// ready-to-use selectors for every interactive element on the page, in the same priority order
// the browser extension uses for human element picking (see lib/selector-discovery.ts). Lets an
// agent discover real selectors before composing a run_workflow/add_step call instead of guessing.

export async function inspectPageTool(input: { url: string; baseUrl?: string }) {
  const target = resolveUrl(input.url, input.baseUrl || "")
  if (!/^https?:\/\//i.test(target)) {
    throw new Error(`"${input.url}" is not an absolute URL — pass baseUrl too, or use a full http(s):// URL.`)
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.goto(target)
    await page.waitForLoadState("load")

    const elements = await discoverSelectors(page)
    return { url: page.url(), title: await page.title(), elements }
  } finally {
    await browser.close()
  }
}
