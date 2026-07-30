/**
 * Main library exports for programmatic usage of Stitch Playwright Test Runner.
 * This file provides the primary API for using Stitch as a library in other projects.
 * Exports include TestRunner class, block registry, logger, types, and factory functions.
 * Use this for integrating Stitch into custom test management tools or CI/CD pipelines.
 * Supports both one-shot executions and advanced runner configurations with callbacks.
 */

// Main library exports for programmatic usage
export {TestRunner} from "./runner/TestRunner"
export {blockRegistry} from "./blocks/index"
export {Logger} from "./utils/logger"

// Export all types
export type {
	WorkflowStep,
	Workflow,
	WorkflowConfig,
	CustomBlock,
	StepResult,
	TestResult,
	TestRunnerOptions,
	BlockParameters,
	BlockFunction,
} from "./types/index"

// Utility functions for easy usage
export {createTestRunner, runWorkflow} from "./runner/factory"


export {blockCategories} from "./categories"
export {
	testBlocks,
	getBlocksByCategory,
	getAllCategories,
	searchBlocks,
	type TestBlockDefinition,
	type TestBlockParameter,
} from "./definitions"