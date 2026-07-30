import { Type, Keyboard, AlignLeft, CheckSquare, Upload, Minus, Terminal } from "lucide-react"
import type { BlockDefinition } from "./types"
import { validateParameters } from "./types"
import { esc } from "./navigation"
import { sanitizePath } from "@/lib/security"

export const formBlocks: BlockDefinition[] = [
	{
		id: "fill",
		name: "Fill Input",
		description: "Clears and fills a text input. Use for login forms, search fields, or any text input. For inputs with autocomplete or live validation, use Type instead.",
		icon: Type,
		color: "bg-purple-500",
		category: "Form Inputs",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "input[name='email']", required: true },
			{ id: "value", name: "Value", type: "text", placeholder: "test@example.com", required: true },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "10000", defaultValue: "10000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector", "value"])
			const selector = parameters.selector as string
			const value = parameters.value as string
			const timeout = Number.parseInt(parameters.timeout as string) || 10000
			try {
				console.log(`📝 Filling "${selector}" with: ${value}`)
				await page.waitForSelector(selector, { state: "visible", timeout })
				await page.fill(selector, value)
				console.log(`✅ Successfully filled: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to fill "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.selector || "element")}').fill('${esc(p.value || "")}', { timeout: ${p.timeout || 10000} });`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').clear().type('${esc(p.value || "")}');`,
	},
	{
		id: "pressKey",
		name: "Press Key",
		description: "Presses a keyboard key. Use Enter to submit forms, Tab to move focus, Escape to close modals, or arrow keys for dropdowns and date pickers.",
		icon: Keyboard,
		color: "bg-purple-500",
		category: "Form Inputs",
		parameters: [
			{
				id: "key",
				name: "Key",
				type: "select",
				defaultValue: "Enter",
				options: [
					{ value: "Enter", label: "Enter" },
					{ value: "Tab", label: "Tab" },
					{ value: "Escape", label: "Escape" },
					{ value: "Space", label: "Space" },
					{ value: "ArrowUp", label: "Arrow Up" },
					{ value: "ArrowDown", label: "Arrow Down" },
					{ value: "ArrowLeft", label: "Arrow Left" },
					{ value: "ArrowRight", label: "Arrow Right" },
					{ value: "Backspace", label: "Backspace" },
					{ value: "Delete", label: "Delete" },
					{ value: "Control+a", label: "Ctrl+A (Select All)" },
					{ value: "Control+c", label: "Ctrl+C (Copy)" },
					{ value: "Control+v", label: "Ctrl+V (Paste)" },
					{ value: "Control+z", label: "Ctrl+Z (Undo)" },
				],
			},
			{ id: "selector", name: "Target Selector (optional)", type: "selector", placeholder: "input" },
		],
		async execute(page, parameters) {
			const key = (parameters.key as string) || "Enter"
			const selector = parameters.selector as string
			try {
				if (selector) {
					console.log(`⌨️ Pressing "${key}" on: ${selector}`)
					await page.locator(selector).press(key)
				} else {
					console.log(`⌨️ Pressing "${key}"`)
					await page.keyboard.press(key)
				}
				console.log(`✅ Key pressed: ${key}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to press key "${key}": ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.selector
				? `  await page.locator('${esc(p.selector)}').press('${p.key || "Enter"}');`
				: `  await page.keyboard.press('${p.key || "Enter"}');`,
		toCypress: (p) => `    cy.get('${p.selector ? esc(p.selector) : "body"}').type('{${(p.key || "Enter").toLowerCase()}}');`,
	},
	{
		id: "selectOption",
		name: "Select Option",
		description: "Selects an option from a native <select> dropdown. Use value for the option's value attribute, or label for the visible text.",
		icon: AlignLeft,
		color: "bg-purple-500",
		category: "Form Inputs",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "select[name='country']", required: true },
			{ id: "value", name: "Value", type: "text", placeholder: "option-value" },
			{ id: "label", name: "Label (alternative)", type: "text", placeholder: "Option Label" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			try {
				console.log(`🔽 Selecting option on: ${selector}`)
				if (parameters.label) {
					await page.locator(selector).selectOption({ label: parameters.label as string })
				} else {
					await page.locator(selector).selectOption((parameters.value as string) || "")
				}
				console.log(`✅ Option selected on: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to select option on "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.label
				? `  await page.locator('${esc(p.selector || "element")}').selectOption({ label: '${esc(p.label)}' });`
				: `  await page.locator('${esc(p.selector || "element")}').selectOption('${esc(p.value || "")}');`,
		toCypress: (p) =>
			p.label
				? `    cy.get('${esc(p.selector || "element")}').select('${esc(p.label)}');`
				: `    cy.get('${esc(p.selector || "element")}').select('${esc(p.value || "")}');`,
	},
	{
		id: "check",
		name: "Check / Uncheck",
		description: "Checks or unchecks a checkbox or radio button. Use to toggle settings, accept terms, or select options in a form.",
		icon: CheckSquare,
		color: "bg-purple-500",
		category: "Form Inputs",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "input[type='checkbox']", required: true },
			{ id: "checked", name: "Checked", type: "boolean", defaultValue: "true" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const checked = parameters.checked !== "false" && parameters.checked !== false
			try {
				console.log(`☑️ ${checked ? "Checking" : "Unchecking"}: ${selector}`)
				if (checked) {
					await page.locator(selector).check()
				} else {
					await page.locator(selector).uncheck()
				}
				console.log(`✅ ${checked ? "Checked" : "Unchecked"}: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to check/uncheck "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.checked === "false"
				? `  await page.locator('${esc(p.selector || "element")}').uncheck();`
				: `  await page.locator('${esc(p.selector || "element")}').check();`,
		toCypress: (p) =>
			p.checked === "false"
				? `    cy.get('${esc(p.selector || "element")}').uncheck();`
				: `    cy.get('${esc(p.selector || "element")}').check();`,
	},
	{
		id: "uploadFile",
		name: "Upload File",
		description: "Sets a file on a file input without opening the OS file dialog. The file path must exist on the server running the test.",
		icon: Upload,
		color: "bg-purple-500",
		category: "Form Inputs",
		parameters: [
			{ id: "selector", name: "File Input Selector", type: "selector", placeholder: "input[type='file']", required: true },
			{ id: "filePath", name: "File Path", type: "text", placeholder: "./fixtures/test.pdf", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector", "filePath"])
			const selector = parameters.selector as string
			const safePath = sanitizePath(parameters.filePath as string)
			try {
				console.log(`📎 Uploading file to: ${selector}`)
				await page.locator(selector).setInputFiles(safePath)
				console.log(`✅ File uploaded: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to upload file to "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.selector || "element")}').setInputFiles('${esc(p.filePath || "")}');`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').selectFile('${esc(p.filePath || "")}');`,
	},
	{
		id: "clearInput",
		name: "Clear Input",
		description: "Clears the value of an input field without typing anything. Use before Fill if the field might already have a value.",
		icon: Minus,
		color: "bg-purple-500",
		category: "Form Inputs",
		parameters: [{ id: "selector", name: "Selector", type: "selector", placeholder: "input[name='search']", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			try {
				console.log(`🧹 Clearing: ${selector}`)
				await page.locator(selector).clear()
				console.log(`✅ Cleared: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to clear "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.selector || "element")}').clear();`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').clear();`,
	},

	// ── Advanced ──
	{
		id: "type",
		name: "Type (Realistic)",
		description: "Types text character by character with a delay between keystrokes, instead of setting the value at once. Use to trigger input event handlers, autocomplete, or live validation that Fill Input can miss.",
		icon: Terminal,
		color: "bg-purple-600",
		category: "Advanced",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "input[name='search']", required: true },
			{ id: "text", name: "Text", type: "text", placeholder: "hello world", required: true },
			{ id: "delay", name: "Delay Between Keys (ms)", type: "number", defaultValue: "100" },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "10000", defaultValue: "10000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector", "text"])
			const selector = parameters.selector as string
			const text = parameters.text as string
			const delay = Number.parseInt(parameters.delay as string) || 100
			const timeout = Number.parseInt(parameters.timeout as string) || 10000
			try {
				console.log(`⌨️ Typing in "${selector}": ${text}`)
				await page.waitForSelector(selector, { state: "visible", timeout })
				await page.type(selector, text, { delay })
				console.log(`✅ Successfully typed in: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to type in "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.selector || "element")}').pressSequentially('${esc(p.text || "")}', { delay: ${p.delay || 100} });`,
	},
]
