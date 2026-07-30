/**
 * Block categories with metadata for UI organization
 */


export interface BlockCategory {
	id: string
	name: string
	description: string
	icon: string
	color: string
	blockCount: number
}

export const blockCategories: BlockCategory[] = [
	{
		id: "navigation",
		name: "Navigation",
		description: "Navigate between pages and URLs",
		icon: "Navigation",
		color: "bg-blue-500",
		blockCount: 3,
	},
	{
		id: "interactions",
		name: "Interactions",
		description: "Click, hover, and interact with elements",
		icon: "MousePointer",
		color: "bg-green-500",
		blockCount: 6,
	},
	{
		id: "form-inputs",
		name: "Form Inputs",
		description: "Fill forms and input fields",
		icon: "Type",
		color: "bg-purple-500",
		blockCount: 4,
	},
	{
		id: "assertions",
		name: "Assertions",
		description: "Verify page content and state",
		icon: "Eye",
		color: "bg-orange-500",
		blockCount: 6,
	},
	{
		id: "waiting",
		name: "Waiting",
		description: "Wait for elements and conditions",
		icon: "Clock",
		color: "bg-gray-500",
		blockCount: 6,
	},
	{
		id: "screenshots",
		name: "Screenshots",
		description: "Capture page screenshots",
		icon: "Camera",
		color: "bg-pink-500",
		blockCount: 2,
	},
	{
		id: "multi-tab",
		name: "Multi-Tab",
		description: "Manage browser tabs",
		icon: "Tabs",
		color: "bg-cyan-500",
		blockCount: 5,
	},
	{
		id: "file-operations",
		name: "File Operations",
		description: "Handle file uploads and downloads",
		icon: "Download",
		color: "bg-emerald-500",
		blockCount: 4,
	},
	{
		id: "network-api",
		name: "Network & API",
		description: "Mock and intercept network requests",
		icon: "Globe",
		color: "bg-violet-500",
		blockCount: 5,
	},
	{
		id: "mobile-touch",
		name: "Mobile & Touch",
		description: "Touch gestures and mobile interactions",
		icon: "Hand",
		color: "bg-yellow-500",
		blockCount: 7,
	},
	{
		id: "advanced-input",
		name: "Advanced Input",
		description: "Advanced keyboard and mouse operations",
		icon: "Keyboard",
		color: "bg-teal-500",
		blockCount: 5,
	},
	{
		id: "pdf-printing",
		name: "PDF & Printing",
		description: "Generate PDFs and print pages",
		icon: "FileText",
		color: "bg-red-500",
		blockCount: 3,
	},
	{
		id: "authentication",
		name: "Authentication",
		description: "Manage auth state and permissions",
		icon: "Key",
		color: "bg-amber-500",
		blockCount: 5,
	},
	{
		id: "advanced-elements",
		name: "Advanced Elements",
		description: "Advanced element operations",
		icon: "Square",
		color: "bg-slate-500",
		blockCount: 5,
	},
	{
		id: "shadow-dom",
		name: "Shadow DOM",
		description: "Work with shadow DOM elements",
		icon: "Layers",
		color: "bg-stone-500",
		blockCount: 3,
	},
	{
		id: "websocket",
		name: "WebSocket",
		description: "WebSocket testing and communication",
		icon: "Wifi",
		color: "bg-lime-500",
		blockCount: 3,
	},
	{
		id: "browser-context",
		name: "Browser Context",
		description: "Manage browser contexts",
		icon: "Monitor",
		color: "bg-rose-500",
		blockCount: 4,
	},
	{
		id: "frame-handling",
		name: "Frame Handling",
		description: "Work with iframes and frames",
		icon: "Square",
		color: "bg-zinc-500",
		blockCount: 4,
	},
	{
		id: "advanced-waiting",
		name: "Advanced Waiting",
		description: "Advanced waiting conditions",
		icon: "Timer",
		color: "bg-neutral-500",
		blockCount: 3,
	},
	{
		id: "workflow-control",
		name: "Workflow Control",
		description: "Control workflow execution",
		icon: "GitBranch",
		color: "bg-violet-500",
		blockCount: 1,
	},
]

// Helper functions for category management
export function getCategoryById(id: string): BlockCategory | undefined {
	return blockCategories.find((category) => category.id === id)
}

export function getCategoryByName(name: string): BlockCategory | undefined {
	return blockCategories.find((category) => category.name === name)
}
