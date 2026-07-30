import { AlignLeft, Code, Type, Ruler, Eye, Palette } from "lucide-react"
import type { BlockDefinition } from "./types"
import { validateParameters } from "./types"
import { esc } from "./navigation"

export const dataExtractionBlocks: BlockDefinition[] = [
	{
		id: "getText",
		name: "Get Text",
		description: "Reads the text content of an element. Combine with an output variable to use the value in later steps (e.g. read a confirmation number, then assert it elsewhere).",
		icon: AlignLeft,
		color: "bg-teal-500",
		category: "Data Extraction",
		parameters: [{ id: "selector", name: "Selector", type: "selector", placeholder: "h1", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			try {
				console.log(`📝 Getting text from: ${selector}`)
				const text = await page.locator(selector).textContent()
				console.log(`📝 Text: ${text}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to get text from "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p, ctx) => `  const text${ctx.index + 1} = await page.locator('${esc(p.selector || "element")}').textContent();\n  console.log('text${ctx.index + 1}:', text${ctx.index + 1});`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').invoke('text').then(t => cy.log('text:', t));`,
	},
	{
		id: "getAttribute",
		name: "Get Attribute",
		description: "Reads an attribute value from an element (e.g. href, src, data-id). Use with an output variable to pass the value to later steps.",
		icon: Code,
		color: "bg-teal-500",
		category: "Data Extraction",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "a.link", required: true },
			{ id: "attribute", name: "Attribute", type: "text", placeholder: "href", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector", "attribute"])
			const selector = parameters.selector as string
			const attribute = parameters.attribute as string
			try {
				console.log(`📝 Getting attribute "${attribute}" from: ${selector}`)
				const value = await page.locator(selector).getAttribute(attribute)
				console.log(`📝 Value: ${value}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to get attribute from "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p, ctx) => `  const attr${ctx.index + 1} = await page.locator('${esc(p.selector || "element")}').getAttribute('${p.attribute || ""}');\n  console.log('attr${ctx.index + 1}:', attr${ctx.index + 1});`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').invoke('attr', '${p.attribute || ""}').then(a => cy.log('attr:', a));`,
	},
	{
		id: "getInputValue",
		name: "Get Input Value",
		description: "Reads the current value of an input field. Use to capture what was auto-filled, calculated, or pre-populated by the application.",
		icon: Type,
		color: "bg-teal-500",
		category: "Data Extraction",
		parameters: [{ id: "selector", name: "Selector", type: "selector", placeholder: "input[name='email']", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			try {
				console.log(`📝 Getting input value from: ${selector}`)
				const value = await page.locator(selector).inputValue()
				console.log(`📝 Value: ${value}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to get input value from "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p, ctx) => `  const value${ctx.index + 1} = await page.locator('${esc(p.selector || "element")}').inputValue();\n  console.log('value${ctx.index + 1}:', value${ctx.index + 1});`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').invoke('val').then(v => cy.log('value:', v));`,
	},
	{
		id: "executeJavaScript",
		name: "Execute JavaScript",
		description: "Execute custom JavaScript and optionally capture the return value. Runs sandboxed inside the browser tab (page.evaluate) — the same execution context as any page's own scripts, not the Node server.",
		icon: Code,
		color: "bg-teal-500",
		category: "Data Extraction",
		parameters: [{ id: "code", name: "JavaScript Code", type: "textarea", placeholder: "return document.title;", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["code"])
			const code = parameters.code as string
			try {
				console.log(`⚙️ Executing custom JavaScript`)
				const result = await page.evaluate((code) => new Function(code)(), code)
				console.log(`⚙️ Result:`, result)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Execute JavaScript failed: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.evaluate(() => {\n    ${p.code || "// no code"}\n  });`,
		toCypress: (p) => `    cy.window().then(win => {\n      ${p.code || "// no code"}\n    });`,
	},

	// ── Advanced: element utilities ──
	{
		id: "getElementBounds",
		name: "Get Element Bounds",
		description: "Reads an element's position and size (x, y, width, height). Use to verify layout, alignment, or that an element is positioned within the viewport.",
		icon: Ruler,
		color: "bg-teal-600",
		category: "Advanced",
		parameters: [{ id: "selector", name: "Selector", type: "selector", placeholder: "#hero", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			try {
				console.log(`📐 Getting element bounds: ${selector}`)
				const bounds = await page.locator(selector).boundingBox()
				if (!bounds) throw new Error(`Element not found or not visible: ${selector}`)
				console.log(`📐 Bounds: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to get element bounds: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) => `  const bounds${ctx.index + 1} = await page.locator('${esc(p.selector || "element")}').boundingBox();\n  console.log('bounds${ctx.index + 1}:', bounds${ctx.index + 1});`,
	},
	{
		id: "isElementInViewport",
		name: "Is Element In Viewport",
		description: "Checks whether an element is currently visible within the viewport. Use for lazy-load or sticky-element testing.",
		icon: Eye,
		color: "bg-teal-600",
		category: "Advanced",
		parameters: [{ id: "selector", name: "Selector", type: "selector", placeholder: "#footer", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			try {
				console.log(`👀 Checking if in viewport: ${selector}`)
				const isVisible = await page.locator(selector).isVisible()
				console.log(`👀 In viewport: ${isVisible}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to check viewport visibility: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) => `  const inViewport${ctx.index + 1} = await page.locator('${esc(p.selector || "element")}').isVisible();\n  console.log('inViewport${ctx.index + 1}:', inViewport${ctx.index + 1});`,
	},
	{
		id: "getComputedStyle",
		name: "Get Computed Style",
		description: "Reads a computed CSS property value from an element. Use to verify colors, spacing, or visibility driven by CSS rather than inline styles.",
		icon: Palette,
		color: "bg-teal-600",
		category: "Advanced",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: ".button-primary", required: true },
			{ id: "property", name: "CSS Property (optional)", type: "text", placeholder: "background-color" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const property = parameters.property as string
			try {
				console.log(`🎨 Getting computed style for: ${selector}`)
				const style = await page.evaluate(
					({ selector, property }) => {
						const element = document.querySelector(selector)
						if (!element) return null
						const computedStyle = window.getComputedStyle(element)
						return property ? computedStyle.getPropertyValue(property) : computedStyle.cssText
					},
					{ selector, property },
				)
				console.log(`🎨 Style: ${style}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to get computed style: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) =>
			`  const style${ctx.index + 1} = await page.evaluate(({ selector, property }) => {\n    const el = document.querySelector(selector);\n    if (!el) return null;\n    const cs = window.getComputedStyle(el);\n    return property ? cs.getPropertyValue(property) : cs.cssText;\n  }, { selector: '${esc(p.selector || "")}', property: '${p.property || ""}' });\n  console.log('style${ctx.index + 1}:', style${ctx.index + 1});`,
	},
	{
		id: "evaluateOnElement",
		name: "Evaluate On Element",
		description: "Runs custom JavaScript scoped to a specific element. Runs sandboxed inside the browser tab (locator.evaluate) — the same execution context as any page's own scripts, not the Node server.",
		icon: Code,
		color: "bg-teal-600",
		category: "Advanced",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "#widget", required: true },
			{ id: "code", name: "JavaScript Code", type: "textarea", placeholder: "return el.textContent;", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector", "code"])
			const selector = parameters.selector as string
			const code = parameters.code as string
			try {
				console.log(`⚙️ Evaluating on element: ${selector}`)
				const result = await page.locator(selector).evaluate((el, code) => new Function("el", code)(el), code)
				console.log(`⚙️ Result:`, result)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Evaluate on element "${selector}" failed: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) => `  const evalResult${ctx.index + 1} = await page.locator('${esc(p.selector || "element")}').evaluate((el) => {\n    ${p.code || "// no code"}\n  });\n  console.log('evalResult${ctx.index + 1}:', evalResult${ctx.index + 1});`,
	},
]
