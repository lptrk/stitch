import { Clock, Search, Loader, Globe } from "lucide-react"
import type { BlockDefinition } from "./types"
import { validateParameters } from "./types"
import { esc } from "./navigation"

export const waitingBlocks: BlockDefinition[] = [
	{
		id: "wait",
		name: "Wait",
		description: "Pauses for a fixed time in milliseconds. Avoid using this as a substitute for proper waits – prefer Wait for Element or Wait for Load State instead.",
		icon: Clock,
		color: "bg-gray-500",
		category: "Waiting",
		parameters: [{ id: "ms", name: "Milliseconds", type: "number", placeholder: "1000", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["ms"])
			const ms = Number.parseInt(parameters.ms as string)
			if (ms < 0) throw new Error("Wait time must be positive")
			try {
				console.log(`⏱️ Waiting for ${ms}ms`)
				await page.waitForTimeout(ms)
				console.log(`✅ Wait completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Wait failed: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.waitForTimeout(${p.ms || 1000});`,
		toCypress: (p) => `    cy.wait(${p.ms || 1000});`,
	},
	{
		id: "waitForSelector",
		name: "Wait for Element",
		description: "Waits until an element reaches a specific state (visible, hidden, etc.). Use instead of fixed waits to make tests faster and more reliable.",
		icon: Search,
		color: "bg-gray-500",
		category: "Waiting",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: ".content", required: true },
			{
				id: "state",
				name: "State",
				type: "select",
				defaultValue: "visible",
				options: [
					{ value: "visible", label: "Visible" },
					{ value: "hidden", label: "Hidden" },
					{ value: "attached", label: "Attached" },
					{ value: "detached", label: "Detached" },
				],
			},
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const state = (parameters.state as any) || "visible"
			const timeout = Number.parseInt(parameters.timeout as string) || 30000
			try {
				console.log(`⏳ Waiting for selector "${selector}" to be ${state}`)
				await page.waitForSelector(selector, { state, timeout })
				console.log(`✅ Selector "${selector}" is ${state}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Wait for selector failed "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.locator('${esc(p.selector || "element")}').waitFor({ state: '${p.state || "visible"}', timeout: ${p.timeout || 30000} });`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}', { timeout: ${p.timeout || 30000} }).should('${p.state === "hidden" ? "not.be.visible" : "exist"}');`,
	},
	{
		id: "waitForLoadState",
		name: "Wait for Load State",
		description: "Waits for the page to finish loading. Use 'Network Idle' after actions that trigger API calls, 'Load' for regular navigation.",
		icon: Loader,
		color: "bg-gray-500",
		category: "Waiting",
		parameters: [
			{
				id: "state",
				name: "Load State",
				type: "select",
				defaultValue: "load",
				options: [
					{ value: "load", label: "Load" },
					{ value: "domcontentloaded", label: "DOM Content Loaded" },
					{ value: "networkidle", label: "Network Idle" },
				],
			},
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" },
		],
		async execute(page, parameters) {
			const state = (parameters.state as "load" | "domcontentloaded" | "networkidle") || "load"
			const timeout = Number.parseInt(parameters.timeout as string) || 30000
			try {
				console.log(`⏳ Waiting for load state: ${state}`)
				await page.waitForLoadState(state, { timeout })
				console.log(`✅ Load state reached: ${state}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Wait for load state failed: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.waitForLoadState('${p.state || "load"}', { timeout: ${p.timeout || 30000} });`,
		toCypress: () => `    cy.document().its('readyState').should('eq', 'complete');`,
	},
	{
		id: "waitForResponse",
		name: "Wait for Response",
		description: "Waits for a specific HTTP response before continuing. Use after clicking buttons that trigger API calls to ensure the data is loaded before asserting.",
		icon: Globe,
		color: "bg-gray-500",
		category: "Waiting",
		parameters: [
			{ id: "urlOrPredicate", name: "URL Pattern", type: "text", placeholder: "**/api/users", required: true },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["urlOrPredicate"])
			const urlOrPredicate = parameters.urlOrPredicate as string
			const timeout = Number.parseInt(parameters.timeout as string) || 30000
			try {
				console.log(`⏳ Waiting for response: ${urlOrPredicate}`)
				await page.waitForResponse(urlOrPredicate, { timeout })
				console.log(`✅ Response received: ${urlOrPredicate}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Wait for response failed: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.waitForResponse(r => r.url().includes('${p.urlOrPredicate || ""}'), { timeout: ${p.timeout || 30000} });`,
		toCypress: (p, ctx) => `    cy.intercept('${p.urlOrPredicate || "**"}').as('req${ctx.index + 1}');\n    cy.wait('@req${ctx.index + 1}', { timeout: ${p.timeout || 30000} });`,
	},
	{
		id: "waitForRequest",
		name: "Wait for Request",
		description: "Waits for a specific HTTP request to be sent. Use to confirm that an action (e.g. form submit) triggered the expected API call.",
		icon: Globe,
		color: "bg-gray-500",
		category: "Waiting",
		parameters: [
			{ id: "urlOrPredicate", name: "URL Pattern", type: "text", placeholder: "**/api/login", required: true },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["urlOrPredicate"])
			const urlOrPredicate = parameters.urlOrPredicate as string
			const timeout = Number.parseInt(parameters.timeout as string) || 30000
			try {
				console.log(`⏳ Waiting for request: ${urlOrPredicate}`)
				await page.waitForRequest(urlOrPredicate, { timeout })
				console.log(`✅ Request detected: ${urlOrPredicate}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Wait for request failed: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.waitForRequest(r => r.url().includes('${p.urlOrPredicate || ""}'), { timeout: ${p.timeout || 30000} });`,
	},
]
