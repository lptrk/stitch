import type { WorkflowItem, Workflow, WorkflowConfig } from "@/types/workflow"
import { generatePlaywrightCode, generateCypressCode } from "./blocks/registry"

export function buildWorkflowConfig(workflows: Workflow[], currentWorkflowId: string, baseUrl: string): WorkflowConfig {
  return {
    baseUrl,
    workflows: workflows.reduce(
      (acc, workflow) => {
        acc[workflow.id] = {
          name: workflow.name,
          description: workflow.description,
          workflow: workflow.items.map((item) => ({
            block: item.blockId,
            parameters: item.parameters,
          })),
        }
        return acc
      },
      {} as WorkflowConfig["workflows"],
    ),
    mainWorkflow: currentWorkflowId,
  }
}

// ─── Playwright ────────────────────────────────────────────────────────────────
// Delegates to lib/blocks/registry.ts, the single source of truth per block.

export function blockToPlaywright(item: WorkflowItem, index: number, baseUrl: string): string {
  return generatePlaywrightCode(item, index, baseUrl)
}

/** Bare step-statement code for the Block Mode / Code Mode toggle — no test() wrapper, just
 * the lines that would normally live inside one test body. Pairs with parseCodeToBlockItems
 * (lib/spec-import/parse-code-block.ts), which parses this same shape back into block items.
 *
 * `callWorkflow` is special-cased here instead of going through the block registry: its
 * normal `toCode` (used for CI export) emits a plain comment ("extract this into a helper by
 * hand"), which is fine for a human finishing a standalone export but produces zero parseable
 * statements — round-tripping through Code mode would silently drop the step. `workflows` lets
 * us render the referenced workflow by name (its id is an opaque, unstable string) so the code
 * stays both readable and something parseCodeToBlockItems can recognize and resolve back. */
export function workflowItemsToEditableCode(items: WorkflowItem[], baseUrl: string, workflows: Workflow[] = []): string {
  return items
    .map((item, i) => {
      if (item.blockId === "callWorkflow") {
        const targetId = item.parameters?.workflowId
        const target = workflows.find((w) => w.id === targetId)
        return `  await callWorkflow('${esc(target?.name ?? targetId ?? "")}');`
      }
      return blockToPlaywright(item, i, baseUrl)
    })
    .join("\n\n")
}

// ─── Cypress ───────────────────────────────────────────────────────────────────

export function blockToCypress(item: WorkflowItem, index: number, baseUrl: string): string {
  return generateCypressCode(item, index, baseUrl)
}

// ─── CI Bundle files ───────────────────────────────────────────────────────────

function esc(s: string): string {
  return (s || "").replace(/'/g, "\\'")
}

/** Strips characters that would break out of a `//` line comment if a workflow name contained
 * them (e.g. an embedded newline would end the comment early and turn the rest of the name
 * into real code). */
function commentSafe(s: string): string {
  return s.replace(/[\r\n*/]/g, " ")
}

/** Recursively inlines `callWorkflow` steps so exported code is a real, self-contained test —
 * Stitch's own runtime (lib/runner/runner/TestRunner.ts) resolves callWorkflow live against the
 * full in-app workflow list, but there is no such runtime in an exported CI bundle / Cypress
 * spec / copied snippet, so the referenced workflow's steps have to be expanded in place instead.
 * Cycle-safe defense in depth: the UI (components/block-parameters.tsx) and the live runner both
 * already refuse to create/execute a circular Call Workflow reference, but an export shouldn't
 * hang or recurse forever if one somehow exists anyway (hand-edited JSON, etc.) — it just stops
 * expanding and leaves a comment instead. */
export function expandWorkflowSteps(
  items: WorkflowItem[],
  workflows: Workflow[],
  baseUrl: string,
  gen: (item: WorkflowItem, index: number, baseUrl: string) => string,
  visited: Set<string> = new Set(),
): string {
  return items
    .map((item, i) => {
      if (item.blockId !== "callWorkflow") return gen(item, i, baseUrl)
      const targetId = item.parameters?.workflowId
      const target = workflows.find((w) => w.id === targetId)
      if (!target) return `  // Call Workflow: referenced workflow not found`
      if (visited.has(target.id)) return `  // Call Workflow: '${commentSafe(target.name)}' skipped — circular reference`
      const nested = expandWorkflowSteps(target.items, workflows, baseUrl, gen, new Set(visited).add(target.id))
      return `  // ── Sub-workflow: ${commentSafe(target.name)} ──\n${nested}\n  // ── End: ${commentSafe(target.name)} ──`
    })
    .join("\n\n")
}

export function generatePlaywrightSpecTS(
  workflow: { name: string; description?: string; items: WorkflowItem[] },
  baseUrl: string,
  workflows: Workflow[] = [],
): string {
  const steps = expandWorkflowSteps(workflow.items, workflows, baseUrl, blockToPlaywright)
  return `import { test, expect } from '@playwright/test';

test('${esc(workflow.name)}', async ({ page }) => {
${steps}
});
`
}

export function generateCypressSpecTS(
  workflow: { name: string; items: WorkflowItem[] },
  baseUrl: string,
  workflows: Workflow[] = [],
): string {
  const steps = expandWorkflowSteps(workflow.items, workflows, baseUrl, blockToCypress)
  return `describe('${esc(workflow.name)}', () => {
  beforeEach(() => { cy.viewport(1280, 720); });

  it('should execute workflow', () => {
${steps}
  });
});
`
}

export function generatePlaywrightConfig(baseUrl: string): string {
  return `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? '${baseUrl}',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
`
}

export function generatePackageJson(workflowName: string): string {
  return JSON.stringify(
    {
      name: workflowName.toLowerCase().replace(/\s+/g, "-") + "-e2e",
      version: "1.0.0",
      private: true,
      scripts: {
        test: "playwright test",
        "test:headed": "playwright test --headed",
        "test:report": "playwright show-report",
      },
      devDependencies: {
        "@playwright/test": "^1.44.0",
        "@types/node": "^20.0.0",
      },
    },
    null,
    2
  )
}

export function generateGitHubActionsWorkflow(baseUrl: string): string {
  return `name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm test
        env:
          BASE_URL: \${{ vars.BASE_URL || '${baseUrl}' }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
`
}
