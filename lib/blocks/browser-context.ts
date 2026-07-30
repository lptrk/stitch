import { Square, MapPin, Shield, Plus, ArrowRightLeft, X, Hash, Clock, Layers, Settings } from "lucide-react"
import type { BlockDefinition } from "./types"
import { validateParameters } from "./types"
import { resolveUrl } from "./navigation"

export const browserContextBlocks: BlockDefinition[] = [
	{
		id: "setViewport",
		name: "Set Viewport",
		description: "Changes the browser window size. Use to test responsive layouts at specific breakpoints (mobile: 375×667, tablet: 768×1024, desktop: 1280×720).",
		icon: Square,
		color: "bg-gray-600",
		category: "Browser Context",
		parameters: [
			{ id: "width", name: "Width (px)", type: "number", placeholder: "1280", defaultValue: "1280", required: true },
			{ id: "height", name: "Height (px)", type: "number", placeholder: "720", defaultValue: "720", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["width", "height"])
			const width = Number.parseInt(parameters.width as string)
			const height = Number.parseInt(parameters.height as string)
			try {
				console.log(`📱 Setting viewport to ${width}x${height}`)
				await page.setViewportSize({ width, height })
				console.log(`✅ Viewport set`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to set viewport: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.setViewportSize({ width: ${p.width || 1280}, height: ${p.height || 720} });`,
		toCypress: (p) => `    cy.viewport(${p.width || 1280}, ${p.height || 720});`,
	},
	{
		id: "setGeolocation",
		name: "Set Geolocation",
		description: "Overrides the browser's GPS location. Use to test location-based features like store finders, delivery zones, or locale-specific content.",
		icon: MapPin,
		color: "bg-gray-600",
		category: "Browser Context",
		parameters: [
			{ id: "latitude", name: "Latitude", type: "number", placeholder: "51.5074", required: true },
			{ id: "longitude", name: "Longitude", type: "number", placeholder: "-0.1278", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["latitude", "longitude"])
			const latitude = Number.parseFloat(parameters.latitude as string)
			const longitude = Number.parseFloat(parameters.longitude as string)
			try {
				console.log(`🌍 Setting geolocation: ${latitude}, ${longitude}`)
				await page.context().setGeolocation({ latitude, longitude })
				console.log(`✅ Geolocation set`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to set geolocation: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.context().setGeolocation({ latitude: ${p.latitude || 0}, longitude: ${p.longitude || 0} });`,
	},
	{
		id: "grantPermissions",
		name: "Grant Permissions",
		description: "Grants browser permissions without showing the native prompt. Use before testing features that require camera, microphone, geolocation, or notifications.",
		icon: Shield,
		color: "bg-gray-600",
		category: "Browser Context",
		parameters: [
			{
				id: "permissions",
				name: "Permissions",
				type: "select",
				defaultValue: "geolocation",
				options: [
					{ value: "geolocation", label: "Geolocation" },
					{ value: "camera", label: "Camera" },
					{ value: "microphone", label: "Microphone" },
					{ value: "notifications", label: "Notifications" },
					{ value: "clipboard-read", label: "Clipboard Read" },
					{ value: "clipboard-write", label: "Clipboard Write" },
				],
			},
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["permissions"])
			const permissions = parameters.permissions
			try {
				const permissionList = Array.isArray(permissions) ? permissions : [permissions]
				console.log(`🔐 Granting permissions: ${permissionList.join(", ")}`)
				await page.context().grantPermissions(permissionList)
				console.log(`✅ Permissions granted`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to grant permissions: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.context().grantPermissions(['${p.permissions || "geolocation"}']);`,
	},
	{
		id: "openNewTab",
		name: "Open New Tab",
		description: "Opens a new browser tab, optionally navigating to a URL. Use to test multi-tab flows, or links that open in a new window.",
		icon: Plus,
		color: "bg-gray-600",
		category: "Browser Context",
		parameters: [{ id: "url", name: "URL (optional)", type: "text", placeholder: "https://example.com" }],
		async execute(page, parameters) {
			const url = parameters.url as string
			try {
				console.log(`🗂️ Opening new tab${url ? ` with URL: ${url}` : ""}`)
				const context = page.context()
				const newPage = await context.newPage()
				if (url) {
					await newPage.goto(url)
					await newPage.waitForLoadState("networkidle")
				}
				console.log(`✅ New tab opened (Total tabs: ${context.pages().length})`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to open new tab: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) =>
			p.url
				? `  const newPage${ctx.index + 1} = await page.context().newPage();\n  await newPage${ctx.index + 1}.goto('${resolveUrl(p.url, ctx.baseUrl)}');`
				: `  const newPage${ctx.index + 1} = await page.context().newPage();`,
	},
	{
		id: "switchToTab",
		name: "Switch to Tab",
		description: "Switches the active browser tab by index or URL. Use after opening a new tab to continue interacting with that tab's content.",
		icon: ArrowRightLeft,
		color: "bg-gray-600",
		category: "Browser Context",
		parameters: [
			{ id: "index", name: "Tab Index", type: "number", placeholder: "0" },
			{ id: "url", name: "URL Pattern (alternative)", type: "text", placeholder: "example.com" },
		],
		async execute(page, parameters) {
			const { index, url } = parameters
			if (index === undefined && !url) throw new Error("Either index or url is required for switchToTab")
			try {
				const pages = page.context().pages()
				if (index !== undefined) {
					const tabIndex = Number.parseInt(index as string)
					if (tabIndex < 0 || tabIndex >= pages.length) throw new Error(`Tab index ${tabIndex} out of range (0-${pages.length - 1})`)
					console.log(`🗂️ Switching to tab at index: ${tabIndex}`)
					await pages[tabIndex].bringToFront()
				} else {
					console.log(`🗂️ Switching to tab with URL: ${url}`)
					const targetPage = pages.find((p) => p.url().includes(url as string))
					if (!targetPage) throw new Error(`Tab with URL "${url}" not found`)
					await targetPage.bringToFront()
				}
				console.log(`✅ Successfully switched to tab`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to switch tab: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) =>
			p.index !== undefined
				? `  const pages${ctx.index + 1} = page.context().pages();\n  await pages${ctx.index + 1}[${p.index}].bringToFront();`
				: `  const targetPage${ctx.index + 1} = page.context().pages().find(pg => pg.url().includes('${p.url || ""}'));\n  await targetPage${ctx.index + 1}?.bringToFront();`,
	},
	{
		id: "closeTab",
		name: "Close Tab",
		description: "Closes a browser tab. Use to clean up after testing a new tab flow, or to switch focus back to the main tab.",
		icon: X,
		color: "bg-gray-600",
		category: "Browser Context",
		parameters: [{ id: "index", name: "Tab Index (empty = current)", type: "number", placeholder: "1" }],
		async execute(page, parameters) {
			const index = parameters.index
			try {
				const context = page.context()
				const pages = context.pages()
				if (index === undefined) {
					console.log("🗂️ Closing current tab")
					await page.close()
				} else {
					const tabIndex = Number.parseInt(index as string)
					if (tabIndex < 0 || tabIndex >= pages.length) throw new Error(`Tab index ${tabIndex} out of range`)
					console.log(`🗂️ Closing tab at index: ${tabIndex}`)
					await pages[tabIndex].close()
				}
				console.log(`✅ Tab closed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to close tab: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) =>
			p.index !== undefined
				? `  const pages${ctx.index + 1} = page.context().pages();\n  await pages${ctx.index + 1}[${p.index}]?.close();`
				: `  await page.close();`,
	},

	// ── Advanced: tabs ──
	{
		id: "getTabCount",
		name: "Get Tab Count",
		description: "Reads the current number of open browser tabs. Use after opening or closing tabs to verify the expected number remain.",
		icon: Hash,
		color: "bg-gray-700",
		category: "Advanced",
		parameters: [],
		async execute(page) {
			try {
				const count = page.context().pages().length
				console.log(`🗂️ Current tab count: ${count}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to get tab count: ${errorMessage}`)
			}
		},
		toCode: (_p, ctx) => `  const tabCount${ctx.index + 1} = page.context().pages().length;\n  console.log('tabCount${ctx.index + 1}:', tabCount${ctx.index + 1});`,
	},
	{
		id: "waitForNewTab",
		name: "Wait for New Tab",
		description: "Waits until a new browser tab opens, e.g. after clicking a link with target=\"_blank\". Use before Switch to Tab when the new tab isn't opened by Stitch itself.",
		icon: Clock,
		color: "bg-gray-700",
		category: "Advanced",
		parameters: [{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" }],
		async execute(page, parameters) {
			const timeout = Number.parseInt(parameters.timeout as string) || 30000
			try {
				console.log(`🗂️ Waiting for new tab (timeout: ${timeout}ms)`)
				await page.context().waitForEvent("page", { timeout })
				console.log(`✅ New tab detected`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to wait for new tab: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.context().waitForEvent('page', { timeout: ${p.timeout || 30000} });`,
	},

	// ── Advanced: browser contexts ──
	{
		id: "createContext",
		name: "Create Browser Context",
		description: "Creates a new isolated browser context (separate cookies/storage) with its own page. Use to simulate multiple independent users or sessions in one test.",
		icon: Layers,
		color: "bg-gray-700",
		category: "Advanced",
		parameters: [
			{ id: "userAgent", name: "User Agent (optional)", type: "text" },
			{ id: "locale", name: "Locale (optional)", type: "text", placeholder: "en-US" },
		],
		async execute(page, parameters) {
			try {
				console.log(`🌐 Creating new browser context`)
				const browser = page.context().browser()
				if (!browser) throw new Error("Browser not available")
				const newContext = await browser.newContext({
					viewport: { width: 1280, height: 720 },
					userAgent: parameters.userAgent as string,
					locale: parameters.locale as string,
				})
				await newContext.newPage()
				console.log(`✅ New context created`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to create context: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			`  // Requires access to the 'browser' fixture (not just 'page') — add { browser } to the test args:\n  // const context = await browser.newContext({ userAgent: '${p.userAgent || ""}', locale: '${p.locale || ""}' });\n  // const contextPage = await context.newPage();`,
	},
	{
		id: "switchContext",
		name: "Switch Browser Context",
		description: "Switches the active page to a different browser context by index. Use together with Create Browser Context to move between simulated users.",
		icon: ArrowRightLeft,
		color: "bg-gray-700",
		category: "Advanced",
		parameters: [{ id: "index", name: "Context Index", type: "number", placeholder: "0", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["index"])
			const index = Number.parseInt(parameters.index as string)
			try {
				console.log(`🌐 Switching to context at index: ${index}`)
				const browser = page.context().browser()
				if (!browser) throw new Error("Browser not available")
				const contexts = browser.contexts()
				if (index < 0 || index >= contexts.length) throw new Error(`Context index ${index} out of range`)
				const pages = contexts[index].pages()
				if (pages.length > 0) await pages[0].bringToFront()
				console.log(`✅ Switched to context ${index}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to switch context: ${errorMessage}`)
			}
		},
		toCode: (p) => `  // Switch to context index ${p.index || 0}: keep a reference to each context returned by browser.newContext()`,
	},
	{
		id: "closeContext",
		name: "Close Browser Context",
		description: "Closes a browser context (and all its tabs). Use to clean up a simulated user session created with Create Browser Context.",
		icon: X,
		color: "bg-gray-700",
		category: "Advanced",
		parameters: [{ id: "index", name: "Context Index (empty = current)", type: "number", placeholder: "0" }],
		async execute(page, parameters) {
			const index = parameters.index
			try {
				if (index === undefined) {
					console.log(`🌐 Closing current context`)
					await page.context().close()
				} else {
					const browser = page.context().browser()
					if (!browser) throw new Error("Browser not available")
					const contexts = browser.contexts()
					const contextIndex = Number.parseInt(index as string)
					if (contextIndex < 0 || contextIndex >= contexts.length) throw new Error(`Context index ${contextIndex} out of range`)
					await contexts[contextIndex].close()
				}
				console.log(`✅ Context closed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to close context: ${errorMessage}`)
			}
		},
		toCode: (p) => `  // Close context ${p.index !== undefined ? `index ${p.index}` : "(current)"}: await context.close();`,
	},
	{
		id: "setContextOptions",
		name: "Set Context Options",
		description: "Applies viewport, user agent, or other options to the current browser context. Use to adjust environment settings mid-workflow.",
		icon: Settings,
		color: "bg-gray-700",
		category: "Advanced",
		parameters: [
			{ id: "userAgent", name: "User Agent (optional)", type: "text" },
			{ id: "width", name: "Viewport Width (optional)", type: "number" },
			{ id: "height", name: "Viewport Height (optional)", type: "number" },
		],
		async execute(page, parameters) {
			try {
				console.log(`🌐 Setting context options`)
				if (parameters.width && parameters.height) {
					await page.setViewportSize({ width: Number.parseInt(parameters.width as string), height: Number.parseInt(parameters.height as string) })
				}
				if (parameters.userAgent) {
					await page.context().setExtraHTTPHeaders({ "User-Agent": parameters.userAgent as string })
				}
				console.log(`✅ Context options set`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to set context options: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			`  ${p.width && p.height ? `await page.setViewportSize({ width: ${p.width}, height: ${p.height} });\n  ` : ""}${p.userAgent ? `await page.context().setExtraHTTPHeaders({ 'User-Agent': '${p.userAgent}' });` : "// no context options set"}`,
	},
]
