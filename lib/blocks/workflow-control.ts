import { GitBranch } from "lucide-react"
import type { BlockDefinition } from "./types"

export const workflowControlBlocks: BlockDefinition[] = [
	{
		id: "callWorkflow",
		name: "Call Workflow",
		description: "Runs another workflow as a sub-routine. Use to reuse common sequences like login, navigation, or data setup across multiple workflows without duplicating steps.",
		icon: GitBranch,
		color: "bg-violet-500",
		category: "Workflow Control",
		parameters: [{ id: "workflowId", name: "Workflow to Call", type: "workflow", placeholder: "Select workflow...", required: true }],
		// Never actually invoked: TestRunner special-cases "callWorkflow" before
		// consulting the block registry (see lib/runner/runner/TestRunner.ts).
		async execute() {
			throw new Error("callWorkflow must be handled by the workflow executor, not called directly")
		},
		toCode: (p) => `  // Sub-workflow: ${p.workflowId || "unknown"}\n  // Extract the steps of '${p.workflowId || "unknown"}' into a helper function and call it here.`,
		toCypress: (p) => `    // Sub-workflow: ${p.workflowId || "unknown"}\n    // Extract the steps of '${p.workflowId || "unknown"}' into a Cypress custom command and call it here.`,
	},
]
