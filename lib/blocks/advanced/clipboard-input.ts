import { AlignLeft, Copy, Clipboard, Keyboard, Mouse } from "lucide-react"
import type { BlockDefinition } from "../types"
import { validateParameters } from "../types"
import { esc } from "../navigation"

export const clipboardInputBlocks: BlockDefinition[] = [
	{
		id: "selectText",
		name: "Select Text",
		description: "Selects all text in an element, or a specific character range. Use before Copy to Clipboard, or to test selection-dependent UI.",
		icon: AlignLeft,
		color: "bg-purple-600",
		category: "Advanced",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "input[name='code']", required: true },
			{ id: "start", name: "Start Index (optional)", type: "number" },
			{ id: "end", name: "End Index (optional)", type: "number" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const { start, end } = parameters
			try {
				console.log(`📝 Selecting text in: ${selector}`)
				if (start !== undefined && end !== undefined) {
					await page.evaluate(
						({ selector, start, end }) => {
							const element = document.querySelector(selector) as HTMLInputElement
							if (element) element.setSelectionRange(start, end)
						},
						{ selector, start: Number.parseInt(start as string), end: Number.parseInt(end as string) },
					)
				} else {
					await page.locator(selector).selectText()
				}
				console.log(`✅ Text selected`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to select text: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.selector || "element")}').selectText();`,
	},
	{
		id: "copyToClipboard",
		name: "Copy to Clipboard",
		description: "Copies text (or the current selection) to the clipboard. Use to test copy buttons, or to prepare a value for Paste from Clipboard.",
		icon: Copy,
		color: "bg-purple-600",
		category: "Advanced",
		parameters: [
			{ id: "text", name: "Text (optional)", type: "text", placeholder: "value to copy" },
			{ id: "selector", name: "Or select text from (optional)", type: "selector", placeholder: "#code-block" },
		],
		async execute(page, parameters) {
			const { text, selector } = parameters
			if (!text && !selector) throw new Error("Either text or selector is required for copyToClipboard")
			try {
				if (text) {
					console.log(`📋 Copying text to clipboard: ${text}`)
					await page.evaluate((t) => navigator.clipboard.writeText(t), text as string)
				} else {
					console.log(`📋 Copying selected text from: ${selector}`)
					await page.locator(selector as string).selectText()
					await page.keyboard.press("Control+C")
				}
				console.log(`✅ Text copied to clipboard`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to copy to clipboard: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.text
				? `  await page.evaluate((t) => navigator.clipboard.writeText(t), '${esc(p.text)}');`
				: `  await page.locator('${esc(p.selector || "element")}').selectText();\n  await page.keyboard.press('Control+C');`,
	},
	{
		id: "pasteFromClipboard",
		name: "Paste from Clipboard",
		description: "Pastes clipboard contents into a focused element, or the current focus. Use together with Copy to Clipboard to test copy/paste flows.",
		icon: Clipboard,
		color: "bg-purple-600",
		category: "Advanced",
		parameters: [{ id: "selector", name: "Target Selector (optional)", type: "selector", placeholder: "input[name='code']" }],
		async execute(page, parameters) {
			const selector = parameters.selector as string
			try {
				if (selector) {
					console.log(`📋 Pasting to: ${selector}`)
					await page.locator(selector).focus()
				} else {
					console.log(`📋 Pasting at current focus`)
				}
				await page.keyboard.press("Control+V")
				console.log(`✅ Text pasted from clipboard`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to paste from clipboard: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.selector
				? `  await page.locator('${esc(p.selector)}').focus();\n  await page.keyboard.press('Control+V');`
				: `  await page.keyboard.press('Control+V');`,
	},
	{
		id: "pressKeySequence",
		name: "Press Key Sequence",
		description: "Presses multiple keys in order, with a delay between each. Use for multi-key shortcuts or simulating a user typing a sequence of special keys.",
		icon: Keyboard,
		color: "bg-purple-600",
		category: "Advanced",
		parameters: [
			{ id: "keys", name: "Keys (comma-separated)", type: "text", placeholder: "Tab, Tab, Enter", required: true },
			{ id: "selector", name: "Target Selector (optional)", type: "selector" },
			{ id: "delay", name: "Delay Between Keys (ms)", type: "number", defaultValue: "100" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["keys"])
			const keySequence = (parameters.keys as string).split(",").map((k) => k.trim()).filter(Boolean)
			const selector = parameters.selector as string
			const delay = Number.parseInt(parameters.delay as string) || 100
			try {
				if (selector) {
					console.log(`⌨️ Pressing key sequence on ${selector}: ${keySequence.join(" + ")}`)
					await page.locator(selector).focus()
				} else {
					console.log(`⌨️ Pressing key sequence: ${keySequence.join(" + ")}`)
				}
				for (const key of keySequence) {
					await page.keyboard.press(key)
					await page.waitForTimeout(delay)
				}
				console.log(`✅ Key sequence completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to press key sequence: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			(p.keys || "")
				.split(",")
				.map((k) => k.trim())
				.filter(Boolean)
				.map((k) => `  await page.keyboard.press('${k}');\n  await page.waitForTimeout(${p.delay || 100});`)
				.join("\n"),
	},
	{
		id: "mouseWheel",
		name: "Mouse Wheel",
		description: "Scrolls using a simulated mouse wheel, optionally after moving the cursor to a position first. Use for custom-scroll containers that ignore Scroll Page.",
		icon: Mouse,
		color: "bg-purple-600",
		category: "Advanced",
		parameters: [
			{ id: "deltaX", name: "Delta X (px)", type: "number", defaultValue: "0" },
			{ id: "deltaY", name: "Delta Y (px)", type: "number", defaultValue: "500" },
			{ id: "x", name: "Cursor X (optional)", type: "number" },
			{ id: "y", name: "Cursor Y (optional)", type: "number" },
		],
		async execute(page, parameters) {
			const deltaX = Number.parseInt(parameters.deltaX as string) || 0
			const deltaY = Number.parseInt(parameters.deltaY as string) || 0
			const { x, y } = parameters
			try {
				console.log(`🖱️ Mouse wheel: deltaX=${deltaX}, deltaY=${deltaY}`)
				if (x !== undefined && y !== undefined) {
					await page.mouse.move(Number.parseInt(x as string), Number.parseInt(y as string))
				}
				await page.mouse.wheel(deltaX, deltaY)
				console.log(`✅ Mouse wheel action completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to perform mouse wheel: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.x !== undefined && p.y !== undefined
				? `  await page.mouse.move(${p.x}, ${p.y});\n  await page.mouse.wheel(${p.deltaX || 0}, ${p.deltaY || 500});`
				: `  await page.mouse.wheel(${p.deltaX || 0}, ${p.deltaY || 500});`,
	},
]
