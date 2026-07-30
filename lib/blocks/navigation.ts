import { Navigation, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import type { BlockDefinition } from "./types"

function resolveUrl(url: string, baseUrl: string): string {
	if (!url) return baseUrl
	if (url.startsWith("http")) return url
	return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`
}

function esc(s: string): string {
	return (s || "").replace(/'/g, "\\'")
}

export const navigationBlocks: BlockDefinition[] = [
	{
		id: "goto",
		name: "Navigate to URL",
		description: "Start here. Opens a page before interacting with it. Use absolute URLs (https://…) or relative paths (/login) resolved against the base URL.",
		icon: Navigation,
		color: "bg-blue-500",
		category: "Navigation",
		parameters: [
			{ id: "url", name: "URL", type: "text", placeholder: "/login or https://example.com", required: true },
			{
				id: "waitUntil",
				name: "Wait Until",
				type: "select",
				defaultValue: "load",
				options: [
					{ value: "load", label: "Load" },
					{ value: "domcontentloaded", label: "DOM Content Loaded" },
					{ value: "networkidle", label: "Network Idle" },
					{ value: "commit", label: "Commit" },
				],
			},
		],
		async execute(page, parameters) {
			const url = parameters.url as string
			if (!url) throw new Error("URL parameter is required for goto block")
			// Mirrors toCode: respect the waitUntil param (default "load") instead of hardcoding
			// "networkidle", which never resolves for pages with a persistent connection (SSE,
			// WebSocket, polling) — e.g. testing Stitch itself, which keeps a live-sessions
			// EventSource open, hung every goto for a full 60s timeout before this fix.
			const waitUntil = (parameters.waitUntil as any) || "load"
			try {
				console.log(`🌐 Navigating to: ${url}`)
				await page.goto(url)
				await page.waitForLoadState(waitUntil)
				console.log(`✅ Successfully navigated to: ${url}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to navigate to "${url}": ${errorMessage}`)
			}
		},
		toCode: (p, ctx) =>
			`  await page.goto('${resolveUrl(p.url || "/", ctx.baseUrl)}');\n  await page.waitForLoadState('${p.waitUntil || "load"}');`,
		toCypress: (p, ctx) => `    cy.visit('${resolveUrl(p.url || "/", ctx.baseUrl)}');`,
	},
	{
		id: "reload",
		name: "Reload Page",
		description: "Refreshes the current page. Useful to test how a page behaves after a hard reload, or to clear client-side state.",
		icon: RefreshCw,
		color: "bg-blue-500",
		category: "Navigation",
		parameters: [
			{
				id: "waitUntil",
				name: "Wait Until",
				type: "select",
				defaultValue: "load",
				options: [
					{ value: "load", label: "Load" },
					{ value: "networkidle", label: "Network Idle" },
				],
			},
		],
		async execute(page, parameters) {
			const waitUntil = (parameters.waitUntil as any) || "load"
			try {
				console.log(`🔄 Reloading page`)
				await page.reload({ waitUntil })
				console.log(`✅ Page reloaded`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to reload page: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.reload({ waitUntil: '${p.waitUntil || "load"}' });`,
		toCypress: () => `    cy.reload();`,
	},
	{
		id: "goBack",
		name: "Go Back",
		description: "Navigates back in browser history. Use to test that the back button works correctly after a form submit or navigation.",
		icon: ChevronLeft,
		color: "bg-blue-500",
		category: "Navigation",
		parameters: [],
		async execute(page) {
			try {
				console.log(`⬅️ Navigating back`)
				await page.goBack()
				console.log(`✅ Navigated back`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to go back: ${errorMessage}`)
			}
		},
		toCode: () => `  await page.goBack();`,
		toCypress: () => `    cy.go('back');`,
	},
	{
		id: "goForward",
		name: "Go Forward",
		description: "Navigates forward in browser history. Pair with Go Back to test browser navigation flows.",
		icon: ChevronRight,
		color: "bg-blue-500",
		category: "Navigation",
		parameters: [],
		async execute(page) {
			try {
				console.log(`➡️ Navigating forward`)
				await page.goForward()
				console.log(`✅ Navigated forward`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to go forward: ${errorMessage}`)
			}
		},
		toCode: () => `  await page.goForward();`,
		toCypress: () => `    cy.go('forward');`,
	},
]

export { resolveUrl, esc }
