import { Globe, Shield, Edit, Wifi, List } from "lucide-react"
import type { BlockDefinition } from "./types"
import { validateParameters } from "./types"

export const networkBlocks: BlockDefinition[] = [
	{
		id: "mockResponse",
		name: "Mock API Response",
		description: "Intercepts a network request and returns a fake response. Use to test error states, empty states, or specific data scenarios without changing the backend.",
		icon: Globe,
		color: "bg-violet-500",
		category: "Network & API",
		parameters: [
			{ id: "urlPattern", name: "URL Pattern", type: "text", placeholder: "**/api/users", required: true },
			{ id: "status", name: "Status Code", type: "number", placeholder: "200", defaultValue: "200" },
			{ id: "body", name: "Response Body (JSON)", type: "textarea", placeholder: '{"users": []}', required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["urlPattern", "body"])
			const urlPattern = parameters.urlPattern as string
			const status = Number.parseInt(parameters.status as string) || 200
			try {
				console.log(`🌐 Mocking response for: ${urlPattern}`)
				await page.route(urlPattern, async (route) => {
					await route.fulfill({
						status,
						contentType: "application/json",
						body: parameters.body as string,
					})
				})
				console.log(`✅ Response mock set up`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to mock response: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.route('${p.urlPattern || "**"}', route => route.fulfill({\n    status: ${p.status || 200},\n    body: JSON.stringify(${p.body || "{}"}),\n    contentType: 'application/json',\n  }));`,
		toCypress: (p) => `    cy.intercept('${p.urlPattern || "**"}', { statusCode: ${p.status || 200}, body: ${p.body || "{}"} });`,
	},
	{
		id: "blockRequests",
		name: "Block Requests",
		description: "Prevents matching requests from being sent. Use to disable analytics, ads, or third-party scripts that slow down or interfere with tests.",
		icon: Shield,
		color: "bg-violet-500",
		category: "Network & API",
		parameters: [{ id: "urlPattern", name: "URL Pattern", type: "text", placeholder: "**/analytics/**", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["urlPattern"])
			const urlPattern = parameters.urlPattern as string
			try {
				console.log(`🌐 Blocking requests for: ${urlPattern}`)
				await page.route(urlPattern, (route) => route.abort())
				console.log(`✅ Request blocking set up`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to block requests: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.route('${p.urlPattern || "**"}', route => route.abort());`,
		toCypress: (p) => `    cy.intercept('${p.urlPattern || "**"}', { forceNetworkError: true });`,
	},
	{
		id: "modifyRequest",
		name: "Modify Request Headers",
		description: "Adds or overrides HTTP headers on outgoing requests. Use to inject auth tokens, set Accept-Language, or simulate specific client environments.",
		icon: Edit,
		color: "bg-violet-500",
		category: "Network & API",
		parameters: [
			{ id: "urlPattern", name: "URL Pattern", type: "text", placeholder: "**/api/**", required: true },
			{ id: "headers", name: "Headers (JSON)", type: "textarea", placeholder: '{"Authorization": "Bearer token"}', required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["urlPattern", "headers"])
			const urlPattern = parameters.urlPattern as string
			try {
				console.log(`🌐 Modifying requests for: ${urlPattern}`)
				const extraHeaders = JSON.parse((parameters.headers as string) || "{}")
				await page.route(urlPattern, async (route) => {
					const request = route.request()
					await route.continue({ headers: { ...request.headers(), ...extraHeaders } })
				})
				console.log(`✅ Request modification set up`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to modify request: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.route('${p.urlPattern || "**"}', route => route.continue({ headers: { ...route.request().headers(), ...${p.headers || "{}"} } }));`,
	},

	// ── Advanced ──
	{
		id: "waitForNetworkCall",
		name: "Wait for Network Call",
		description: "Waits for a specific network request, optionally matching an HTTP method. Use to confirm a background call fired before asserting on its effects.",
		icon: Wifi,
		color: "bg-violet-600",
		category: "Advanced",
		parameters: [
			{ id: "urlPattern", name: "URL Pattern", type: "text", placeholder: "**/api/orders", required: true },
			{ id: "method", name: "HTTP Method (optional)", type: "text", placeholder: "POST" },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["urlPattern"])
			const urlPattern = parameters.urlPattern as string
			const method = parameters.method as string
			const timeout = Number.parseInt(parameters.timeout as string) || 30000
			try {
				console.log(`🌐 Waiting for network call: ${urlPattern}`)
				if (method) {
					await page.waitForRequest((request) => request.url().includes(urlPattern) && request.method() === method.toUpperCase(), { timeout })
				} else {
					await page.waitForRequest(urlPattern, { timeout })
				}
				console.log(`✅ Network call detected`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to wait for network call: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.method
				? `  await page.waitForRequest(r => r.url().includes('${p.urlPattern || ""}') && r.method() === '${(p.method || "").toUpperCase()}', { timeout: ${p.timeout || 30000} });`
				: `  await page.waitForRequest('${p.urlPattern || ""}', { timeout: ${p.timeout || 30000} });`,
	},
	{
		id: "getNetworkLogs",
		name: "Get Network Logs",
		description: "Reads captured network request logs, optionally filtered by URL pattern. Requires request/response logging to have been enabled for this page.",
		icon: List,
		color: "bg-violet-600",
		category: "Advanced",
		parameters: [{ id: "filterPattern", name: "Filter Pattern (optional)", type: "text", placeholder: "/api/" }],
		async execute(page, parameters) {
			const filterPattern = parameters.filterPattern as string
			try {
				console.log(`🌐 Getting network logs${filterPattern ? ` (filter: ${filterPattern})` : ""}`)
				const requests = (page as any)._networkLogs || []
				const filtered = filterPattern ? requests.filter((req: any) => req.url.includes(filterPattern)) : requests
				console.log(`📊 Network logs (${filtered.length} entries):`, filtered)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to get network logs: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) => `  const networkLogs${ctx.index + 1} = (page as any)._networkLogs || [];\n  console.log('networkLogs${ctx.index + 1}:', networkLogs${ctx.index + 1});`,
	},
]
