import { Layers, Hash, Home, Code } from "lucide-react"
import type { BlockDefinition } from "../types"
import { validateParameters } from "../types"

export const frameBlocks: BlockDefinition[] = [
	{
		id: "waitForFrame",
		name: "Wait for Frame",
		description: "Waits until an iframe matching a name or URL appears on the page. Use before interacting with content inside embedded widgets or payment forms.",
		icon: Layers,
		color: "bg-cyan-600",
		category: "Advanced",
		parameters: [
			{ id: "name", name: "Frame Name (optional)", type: "text", placeholder: "payment-frame" },
			{ id: "url", name: "Frame URL Contains (optional)", type: "text", placeholder: "stripe.com" },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" },
		],
		async execute(page, parameters) {
			const { name, url, timeout } = parameters
			const timeoutMs = Number.parseInt(timeout as string) || 30000
			if (!name && !url) throw new Error("Either name or url is required for waitForFrame")
			try {
				console.log(`🖼️ Waiting for frame (timeout: ${timeoutMs}ms)`)
				if (name) {
					await page.waitForFunction((n) => Array.from(document.querySelectorAll("iframe")).some((f) => f.name === n), name, { timeout: timeoutMs })
				} else {
					await page.waitForFunction((u) => Array.from(document.querySelectorAll("iframe")).some((f) => f.src.includes(u)), url, { timeout: timeoutMs })
				}
				console.log(`✅ Frame found`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to wait for frame: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.name
				? `  await page.waitForFunction((n) => Array.from(document.querySelectorAll('iframe')).some(f => f.name === n), '${p.name}', { timeout: ${p.timeout || 30000} });`
				: `  await page.waitForFunction((u) => Array.from(document.querySelectorAll('iframe')).some(f => f.src.includes(u)), '${p.url || ""}', { timeout: ${p.timeout || 30000} });`,
	},
	{
		id: "getFrameCount",
		name: "Get Frame Count",
		description: "Reads the number of frames currently on the page (including the main frame). Use to verify embedded widgets loaded as expected.",
		icon: Hash,
		color: "bg-cyan-600",
		category: "Advanced",
		parameters: [],
		async execute(page) {
			try {
				const count = page.frames().length
				console.log(`🖼️ Frame count: ${count}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to get frame count: ${errorMessage}`)
			}
		},
		toCode: (_p, ctx) => `  const frameCount${ctx.index + 1} = page.frames().length;\n  console.log('frameCount${ctx.index + 1}:', frameCount${ctx.index + 1});`,
	},
	{
		id: "switchToMainFrame",
		name: "Switch to Main Frame",
		description: "Semantic marker step for switching back to the page's main frame. Playwright always operates on the main frame by default, so this exists for workflow clarity.",
		icon: Home,
		color: "bg-cyan-600",
		category: "Advanced",
		parameters: [],
		async execute() {
			console.log(`🖼️ Switching to main frame`)
			console.log(`✅ Switched to main frame`)
		},
		toCode: () => `  // Switch to main frame: page.locator(...) already targets the main frame by default`,
	},
	{
		id: "executeInFrame",
		name: "Execute JavaScript In Frame",
		description: "Runs custom JavaScript inside a specific iframe. Runs sandboxed inside that frame's own browser context (frameLocator.evaluate) — the same execution context as the frame's own scripts, not the Node server.",
		icon: Code,
		color: "bg-cyan-600",
		category: "Advanced",
		parameters: [
			{ id: "frameSelector", name: "Frame Selector", type: "selector", placeholder: "iframe#payment", required: true },
			{ id: "code", name: "JavaScript Code", type: "textarea", placeholder: "return document.title;", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["frameSelector", "code"])
			const frameSelector = parameters.frameSelector as string
			const code = parameters.code as string
			try {
				console.log(`⚙️ Executing JavaScript in frame: ${frameSelector}`)
				const result = await page.frameLocator(frameSelector).locator("body").evaluate((el, code) => new Function(code)(), code)
				console.log(`⚙️ Result:`, result)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Execute JavaScript in frame "${frameSelector}" failed: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) => `  const frameResult${ctx.index + 1} = await page.frameLocator('${p.frameSelector || "iframe"}').locator('body').evaluate(() => {\n    ${p.code || "// no code"}\n  });`,
	},
]
