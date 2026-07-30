/**
 * TypeScript type definitions for the Stitch Playwright Test Runner.
 * Defines interfaces and types used throughout the application including workflow configurations,
 * test results, runner options, and block function signatures.
 * These types ensure type safety and provide IntelliSense support for developers.
 * Used by both CLI and library implementations for consistent data structures.
 */

import type { Page } from "playwright"

export interface BlockParameters {
  [key: string]: any
}

export type BlockFunction = (page: Page, parameters: BlockParameters) => Promise<void>

export interface WorkflowStep {
  block: string
  parameters?: Record<string, any>
}

export interface Workflow {
  name: string
  description?: string
  workflow: WorkflowStep[]
}

export interface CustomBlock {
  name: string
  description?: string
  code: string
}

export interface WorkflowConfig {
  baseUrl?: string
  workflows: Record<string, Workflow>
  mainWorkflow: string
  customBlocks?: Record<string, CustomBlock>
}

export interface StepResult {
  stepNumber: number
  // Position of this step within its own workflow (1-based) — what canvas highlighting indexes into.
  workflowId: string
  // Monotonically increasing across the whole execution tree (main workflow + any callWorkflow'd
  // sub-workflows), used to drive the overall progress bar without resetting on nested calls.
  globalStepNumber: number
  blockId: string
  status: "success" | "failed" | "running"
  duration?: number
  error?: string
  timestamp: string
  screenshot?: string // data URL (PNG from the `screenshot` block, or a best-effort JPEG auto-captured on step failure)
}

export interface TestResult {
  success: boolean
  duration: number
  error?: string
  stepResults: StepResult[]
}

export interface TestRunnerOptions{
  headless?: boolean
  ignoreHTTPSErrors?: boolean
  browser?: string
  timeout?: number
  debug?: boolean
  onStepStart?: (step: StepResult) => void
  onStepComplete?: (step: StepResult) => void
  onProgress?: (progress: { current: number; total: number; step: StepResult }) => void
}
