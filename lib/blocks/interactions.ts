import { MousePointer, Hand, ScanLine, Grab, ScrollText, Move } from "lucide-react"
import type { BlockDefinition } from "./types"
import { validateParameters } from "./types"
import { esc } from "./navigation"

export const interactionBlocks: BlockDefinition[] = [
	{
		id: "click",
		name: "Click",
		description: "Clicks a button, link, or any element. Waits for the element to be visible before clicking. The most common interaction block.",
		icon: MousePointer,
		color: "bg-green-500",
		category: "Interactions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "button, [data-testid='submit']", required: true },
			{
				id: "button",
				name: "Mouse Button",
				type: "select",
				defaultValue: "left",
				options: [
					{ value: "left", label: "Left" },
					{ value: "right", label: "Right" },
					{ value: "middle", label: "Middle" },
				],
			},
			{
				id: "clickCount",
				name: "Click Count",
				type: "select",
				defaultValue: "1",
				options: [
					{ value: "1", label: "Single Click" },
					{ value: "2", label: "Double Click" },
				],
			},
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "10000", defaultValue: "10000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const timeout = Number.parseInt(parameters.timeout as string) || 10000
			try {
				console.log(`🖱️ Clicking: ${selector}`)
				await page.waitForSelector(selector, { state: "visible", timeout })
				await page.click(selector, {
					button: (parameters.button as any) || "left",
					clickCount: Number.parseInt(parameters.clickCount as string) || 1,
				})
				console.log(`✅ Successfully clicked: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to click "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) =>
			`  await page.locator('${esc(p.selector || "element")}').click({ button: '${p.button || "left"}', clickCount: ${p.clickCount || 1}, timeout: ${p.timeout || 10000} });`,
		toCypress: (p) =>
			p.clickCount === "2"
				? `    cy.get('${esc(p.selector || "element")}').dblclick();`
				: p.button === "right"
				? `    cy.get('${esc(p.selector || "element")}').rightclick();`
				: `    cy.get('${esc(p.selector || "element")}', { timeout: ${p.timeout || 10000} }).click();`,
	},
	{
		id: "hover",
		name: "Hover",
		description: "Moves the mouse over an element without clicking. Use to trigger dropdown menus, tooltips, or hover-only UI states.",
		icon: Hand,
		color: "bg-green-500",
		category: "Interactions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: ".dropdown-trigger", required: true },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "10000", defaultValue: "10000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const timeout = Number.parseInt(parameters.timeout as string) || 10000
			try {
				console.log(`🖱️ Hovering: ${selector}`)
				await page.locator(selector).hover({ timeout })
				console.log(`✅ Hovered: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to hover "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.selector || "element")}').hover({ timeout: ${p.timeout || 10000} });`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').trigger('mouseover');`,
	},
	{
		id: "focus",
		name: "Focus",
		description: "Focuses an input or interactive element without typing. Use to test focus styles, or to prepare an input for keyboard events.",
		icon: ScanLine,
		color: "bg-green-500",
		category: "Interactions",
		parameters: [{ id: "selector", name: "Selector", type: "selector", placeholder: "input[name='email']", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			try {
				console.log(`🎯 Focusing: ${selector}`)
				await page.locator(selector).focus()
				console.log(`✅ Focused: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to focus "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.selector || "element")}').focus();`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').focus();`,
	},
	{
		id: "dragAndDrop",
		name: "Drag and Drop",
		description: "Drags an element from one place and drops it onto another. Use to test sortable lists, kanban boards, or file upload areas.",
		icon: Grab,
		color: "bg-green-500",
		category: "Interactions",
		parameters: [
			{ id: "source", name: "Source Selector", type: "selector", placeholder: "#drag-item", required: true },
			{ id: "target", name: "Target Selector", type: "selector", placeholder: "#drop-zone", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["source", "target"])
			const source = parameters.source as string
			const target = parameters.target as string
			try {
				console.log(`🖱️ Dragging "${source}" to "${target}"`)
				await page.locator(source).dragTo(page.locator(target))
				console.log(`✅ Drag and drop completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed drag and drop: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.source || "")}').dragTo(page.locator('${esc(p.target || "")}'));`,
		toCypress: (p) => `    cy.get('${esc(p.source || "")}').drag('${esc(p.target || "")}');`,
	},
	{
		id: "scrollTo",
		name: "Scroll To Element",
		description: "Scrolls an element into view. Use before interacting with elements that are off-screen, or to test lazy-loaded content.",
		icon: ScrollText,
		color: "bg-green-500",
		category: "Interactions",
		parameters: [{ id: "selector", name: "Selector", type: "selector", placeholder: "#footer", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			try {
				console.log(`📜 Scrolling into view: ${selector}`)
				await page.locator(selector).scrollIntoViewIfNeeded()
				console.log(`✅ Scrolled into view: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to scroll to "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.selector || "element")}').scrollIntoViewIfNeeded();`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').scrollIntoView();`,
	},
	{
		id: "scrollPage",
		name: "Scroll Page",
		description: "Scrolls the page by a pixel offset. Use to test infinite scroll, sticky headers, or elements that only appear after scrolling.",
		icon: Move,
		color: "bg-green-500",
		category: "Interactions",
		parameters: [
			{ id: "x", name: "Scroll X (px)", type: "number", placeholder: "0", defaultValue: "0" },
			{ id: "y", name: "Scroll Y (px)", type: "number", placeholder: "500", defaultValue: "500" },
		],
		async execute(page, parameters) {
			const x = Number.parseInt(parameters.x as string) || 0
			const y = Number.parseInt(parameters.y as string) || 500
			try {
				console.log(`📜 Scrolling page by (${x}, ${y})`)
				await page.mouse.wheel(x, y)
				console.log(`✅ Page scrolled`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to scroll page: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.mouse.wheel(${p.x || 0}, ${p.y || 500});`,
		toCypress: (p) => `    cy.scrollTo(${p.x || 0}, ${p.y || 500});`,
	},
]
