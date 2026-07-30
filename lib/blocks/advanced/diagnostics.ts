import { ScrollText, AlertTriangle, FolderOpen } from "lucide-react"
import type { BlockDefinition } from "../types"

export const diagnosticsBlocks: BlockDefinition[] = [
	{
		id: "waitForConsoleMessage",
		name: "Wait for Console Message",
		description: "Waits for a browser console message matching a type and/or text. Use to confirm client-side logging fires, or to catch expected warnings.",
		icon: ScrollText,
		color: "bg-amber-600",
		category: "Advanced",
		parameters: [
			{ id: "text", name: "Text Contains (optional)", type: "text", placeholder: "checkout complete" },
			{
				id: "type",
				name: "Console Type (optional)",
				type: "select",
				options: [
					{ value: "log", label: "log" },
					{ value: "warning", label: "warning" },
					{ value: "error", label: "error" },
					{ value: "info", label: "info" },
				],
			},
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" },
		],
		async execute(page, parameters) {
			const { text, type, timeout } = parameters
			const timeoutMs = Number.parseInt(timeout as string) || 30000
			try {
				console.log(`📝 Waiting for console message (timeout: ${timeoutMs}ms)`)
				await page.waitForEvent("console", {
					predicate: (msg) => (!type || msg.type() === type) && (!text || msg.text().includes(text as string)),
					timeout: timeoutMs,
				})
				console.log(`✅ Console message detected`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to wait for console message: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			`  await page.waitForEvent('console', { predicate: msg => ${p.type ? `msg.type() === '${p.type}'` : "true"} && ${p.text ? `msg.text().includes('${p.text}')` : "true"}, timeout: ${p.timeout || 30000} });`,
	},
	{
		id: "waitForPageCrash",
		name: "Wait for Page Crash",
		description: "Waits for the page to crash (e.g. out-of-memory renderer crash). Use in stress tests where a crash itself is the condition under test.",
		icon: AlertTriangle,
		color: "bg-amber-600",
		category: "Advanced",
		parameters: [{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" }],
		async execute(page, parameters) {
			const timeout = Number.parseInt(parameters.timeout as string) || 30000
			try {
				console.log(`💥 Waiting for page crash (timeout: ${timeout}ms)`)
				await page.waitForEvent("crash", { timeout })
				console.log(`💥 Page crash detected`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to wait for page crash: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.waitForEvent('crash', { timeout: ${p.timeout || 30000} });`,
	},
	{
		id: "waitForFileChooser",
		name: "Wait for File Chooser",
		description: "Waits for the native file picker dialog to open, optionally triggering it first by clicking an element. Use before uploading via a real file input flow.",
		icon: FolderOpen,
		color: "bg-amber-600",
		category: "Advanced",
		parameters: [
			{ id: "triggerSelector", name: "Trigger Selector (optional)", type: "selector", placeholder: "#upload-button" },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" },
		],
		async execute(page, parameters) {
			const { triggerSelector, timeout } = parameters
			const timeoutMs = Number.parseInt(timeout as string) || 30000
			try {
				console.log(`📁 Waiting for file chooser (timeout: ${timeoutMs}ms)`)
				const fileChooserPromise = page.waitForEvent("filechooser", { timeout: timeoutMs })
				if (triggerSelector) await page.click(triggerSelector as string)
				const fileChooser = await fileChooserPromise
				console.log(`✅ File chooser opened (accepts: ${fileChooser.isMultiple() ? "multiple" : "single"} files)`)
				;(page as any)._lastFileChooser = fileChooser
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to wait for file chooser: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.triggerSelector
				? `  const [fileChooser] = await Promise.all([\n    page.waitForEvent('filechooser', { timeout: ${p.timeout || 30000} }),\n    page.click('${p.triggerSelector}'),\n  ]);`
				: `  const fileChooser = await page.waitForEvent('filechooser', { timeout: ${p.timeout || 30000} });`,
	},
]
