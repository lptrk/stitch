import { Layers, Box, Search } from "lucide-react"
import type { BlockDefinition } from "../types"
import { validateParameters } from "../types"

export const shadowDomBlocks: BlockDefinition[] = [
	{
		id: "pierceSelector",
		name: "Pierce Shadow DOM",
		description: "Clicks, fills, or reads an element inside a shadow DOM using a piercing selector. Use for web-component-based UI that regular selectors can't reach.",
		icon: Layers,
		color: "bg-fuchsia-600",
		category: "Advanced",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "my-component >>> button", required: true },
			{
				id: "action",
				name: "Action",
				type: "select",
				defaultValue: "verify",
				options: [
					{ value: "verify", label: "Verify Exists" },
					{ value: "click", label: "Click" },
					{ value: "fill", label: "Fill" },
					{ value: "getText", label: "Get Text" },
				],
			},
			{ id: "value", name: "Value (for Fill)", type: "text" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const action = parameters.action as string
			const value = parameters.value as string
			try {
				console.log(`🌑 Piercing shadow DOM: ${selector}`)
				const element = page.locator(`pierce=${selector}`)
				if (action === "click") {
					await element.click()
				} else if (action === "fill" && value) {
					await element.fill(value)
				} else if (action === "getText") {
					const text = await element.textContent()
					console.log(`🌑 Shadow DOM text: ${text}`)
				} else {
					await element.waitFor()
				}
				console.log(`✅ Shadow DOM pierced successfully`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to pierce shadow DOM: ${errorMessage}`)
			}
		},
		toCode: (p) => {
			const loc = `page.locator('pierce=${p.selector || ""}')`
			if (p.action === "click") return `  await ${loc}.click();`
			if (p.action === "fill") return `  await ${loc}.fill('${p.value || ""}');`
			if (p.action === "getText") return `  const shadowText = await ${loc}.textContent();\n  console.log('shadowText:', shadowText);`
			return `  await ${loc}.waitFor();`
		},
	},
	{
		id: "shadowRoot",
		name: "Access Shadow Root",
		description: "Reads text, HTML, or clicks an element inside a named shadow host's shadow root. Use for components that expose a shadowRoot but no piercing selector.",
		icon: Box,
		color: "bg-fuchsia-600",
		category: "Advanced",
		parameters: [
			{ id: "hostSelector", name: "Shadow Host Selector", type: "selector", placeholder: "my-widget", required: true },
			{ id: "shadowSelector", name: "Selector Inside Shadow Root", type: "selector", placeholder: ".button", required: true },
			{
				id: "action",
				name: "Action",
				type: "select",
				defaultValue: "getText",
				options: [
					{ value: "getText", label: "Get Text" },
					{ value: "click", label: "Click" },
					{ value: "getHtml", label: "Get Outer HTML" },
				],
			},
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["hostSelector", "shadowSelector"])
			const hostSelector = parameters.hostSelector as string
			const shadowSelector = parameters.shadowSelector as string
			const action = parameters.action as string
			try {
				console.log(`🌑 Accessing shadow root: ${hostSelector} -> ${shadowSelector}`)
				const result = await page.evaluate(
					({ hostSelector, shadowSelector, action }) => {
						const host = document.querySelector(hostSelector) as any
						if (!host || !host.shadowRoot) return null
						const shadowElement = host.shadowRoot.querySelector(shadowSelector)
						if (!shadowElement) return null
						if (action === "getText") return shadowElement.textContent
						if (action === "click") {
							shadowElement.click()
							return "clicked"
						}
						return shadowElement.outerHTML
					},
					{ hostSelector, shadowSelector, action },
				)
				console.log(`🌑 Shadow DOM result:`, result)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to access shadow root: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) =>
			`  const shadowResult${ctx.index + 1} = await page.evaluate(({ hostSelector, shadowSelector, action }) => {\n    const host = document.querySelector(hostSelector);\n    if (!host || !host.shadowRoot) return null;\n    const el = host.shadowRoot.querySelector(shadowSelector);\n    if (!el) return null;\n    if (action === 'getText') return el.textContent;\n    if (action === 'click') { el.click(); return 'clicked'; }\n    return el.outerHTML;\n  }, { hostSelector: '${p.hostSelector || ""}', shadowSelector: '${p.shadowSelector || ""}', action: '${p.action || "getText"}' });`,
	},
	{
		id: "queryShadowDOM",
		name: "Query Shadow DOM",
		description: "Checks whether an element exists inside a named shadow host's shadow root, without interacting with it. Use as a lightweight existence assertion.",
		icon: Search,
		color: "bg-fuchsia-600",
		category: "Advanced",
		parameters: [
			{ id: "hostSelector", name: "Shadow Host Selector", type: "selector", placeholder: "my-widget", required: true },
			{ id: "shadowSelector", name: "Selector Inside Shadow Root", type: "selector", placeholder: ".icon", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["hostSelector", "shadowSelector"])
			const hostSelector = parameters.hostSelector as string
			const shadowSelector = parameters.shadowSelector as string
			try {
				console.log(`🌑 Querying shadow DOM: ${hostSelector} -> ${shadowSelector}`)
				const exists = await page.evaluate(
					({ hostSelector, shadowSelector }) => {
						const host = document.querySelector(hostSelector) as any
						if (!host || !host.shadowRoot) return false
						return !!host.shadowRoot.querySelector(shadowSelector)
					},
					{ hostSelector, shadowSelector },
				)
				console.log(`🌑 Shadow DOM element exists: ${exists}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to query shadow DOM: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) =>
			`  const shadowExists${ctx.index + 1} = await page.evaluate(({ hostSelector, shadowSelector }) => {\n    const host = document.querySelector(hostSelector);\n    return !!(host && host.shadowRoot && host.shadowRoot.querySelector(shadowSelector));\n  }, { hostSelector: '${p.hostSelector || ""}', shadowSelector: '${p.shadowSelector || ""}' });`,
	},
]
