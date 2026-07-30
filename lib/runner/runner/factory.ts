/**
 * Factory functions for creating TestRunner instances with simplified APIs.
 * Provides convenient methods for one-shot workflow executions and runner creation.
 * Ideal for quick integrations where full TestRunner lifecycle management isn't needed.
 * Handles automatic initialization and cleanup for streamlined usage patterns.
 * Used by library consumers who want minimal setup overhead.
 */

import { TestRunner } from "./TestRunner"
import type { TestRunnerOptions, WorkflowConfig, TestResult } from "../types/index"

/**
 * Factory function to create a new TestRunner instance
 */
export function createTestRunner(options?: TestRunnerOptions): TestRunner {
  return new TestRunner(options)
}

/**
 * Utility function to run a workflow with minimal setup
 * Perfect for one-off executions
 */
export async function runWorkflow(
  workflowConfigOrPath: WorkflowConfig | string,
  options?: TestRunnerOptions,
): Promise<TestResult> {
  const runner = createTestRunner(options)

  try {
    const baseUrl = typeof workflowConfigOrPath === "string" ? undefined : workflowConfigOrPath.baseUrl
    await runner.initialize(baseUrl)
    const result = await runner.runWorkflow(workflowConfigOrPath)
    return result
  } finally {
    await runner.cleanup()
  }
}
