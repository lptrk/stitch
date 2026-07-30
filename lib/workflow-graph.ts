import type { Workflow } from "@/types/workflow"

/** True if adding a "Call Workflow → targetWorkflowId" step inside fromWorkflowId would create
 * a circular reference — either they're the same workflow, or targetWorkflowId can already
 * (transitively, via its own callWorkflow steps) reach back to fromWorkflowId. */
export function wouldCreateCycle(workflows: Workflow[], fromWorkflowId: string, targetWorkflowId: string): boolean {
	if (fromWorkflowId === targetWorkflowId) return true

	const byId = new Map(workflows.map((w) => [w.id, w]))
	const visited = new Set<string>()

	function canReach(currentId: string): boolean {
		if (currentId === fromWorkflowId) return true
		if (visited.has(currentId)) return false
		visited.add(currentId)

		const workflow = byId.get(currentId)
		if (!workflow) return false

		return workflow.items.some(
			(item) => item.blockId === "callWorkflow" && item.parameters?.workflowId && canReach(item.parameters.workflowId),
		)
	}

	return canReach(targetWorkflowId)
}
