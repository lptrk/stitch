import { Save, Upload, Key, X, Shield } from "lucide-react"
import type { BlockDefinition } from "./types"
import { validateParameters } from "./types"
import { esc } from "./navigation"
import { sanitizePath } from "@/lib/security"

export const authBlocks: BlockDefinition[] = [
	{
		id: "saveAuthState",
		name: "Save Auth State",
		description: "Saves cookies and localStorage to a file. Use at the end of a login workflow so other workflows can skip the login step by loading this state.",
		icon: Save,
		color: "bg-green-600",
		category: "Authentication",
		parameters: [{ id: "path", name: "File Path", type: "text", placeholder: "./auth-state.json", defaultValue: "./auth-state.json" }],
		async execute(page, parameters) {
			const safePath = sanitizePath((parameters.path as string) || "auth-state.json")
			try {
				console.log(`🔐 Saving authentication state`)
				await page.context().storageState({ path: safePath })
				console.log(`✅ Authentication state saved`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to save auth state: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.context().storageState({ path: '${p.path || "./auth-state.json"}' });`,
	},
	{
		id: "loadAuthState",
		name: "Load Auth State",
		description: "Restores a previously saved auth state (cookies + localStorage). Use at the start of workflows that require login to skip the login steps entirely.",
		icon: Upload,
		color: "bg-green-600",
		category: "Authentication",
		parameters: [{ id: "path", name: "File Path", type: "text", placeholder: "./auth-state.json", required: true }],
		async execute(page, parameters) {
			validateParameters(parameters, ["path"])
			const safePath = sanitizePath(parameters.path as string)
			try {
				console.log(`🔐 Loading authentication state`)
				const fs = await import(/* webpackIgnore: true */ "fs")
				const authState = JSON.parse(fs.readFileSync(safePath, "utf8"))
				if (authState.cookies) {
					await page.context().addCookies(authState.cookies)
				}
				if (authState.origins) {
					for (const origin of authState.origins) {
						if (origin.localStorage) {
							await page.evaluate((items) => {
								items.forEach((item: any) => window.localStorage.setItem(item.name, item.value))
							}, origin.localStorage)
						}
					}
				}
				console.log(`✅ Authentication state loaded`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to load auth state: ${errorMessage}`)
			}
		},
		toCode: () => `  // storageState is set via playwright.config.ts or browser context options\n  // context = await browser.newContext({ storageState: './auth-state.json' });`,
	},
	{
		id: "setLocalStorage",
		name: "Set LocalStorage",
		description: "Sets a value in localStorage before the page loads any logic. Use to inject feature flags, auth tokens, or user preferences without going through the UI.",
		icon: Key,
		color: "bg-green-600",
		category: "Authentication",
		parameters: [
			{ id: "key", name: "Key", type: "text", placeholder: "authToken", required: true },
			{ id: "value", name: "Value", type: "text", placeholder: "eyJhbGci...", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["key", "value"])
			const key = parameters.key as string
			const value = parameters.value as string
			try {
				console.log(`🔑 Setting localStorage: ${key}`)
				await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value])
				console.log(`✅ localStorage set: ${key}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to set localStorage: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.evaluate(([k, v]) => localStorage.setItem(k, v), ['${p.key || ""}', '${esc(p.value || "")}']);`,
	},
	{
		id: "setCookie",
		name: "Set Cookie",
		description: "Sets a browser cookie before making requests. Use to inject session tokens, feature flags, or consent cookies without going through the login flow.",
		icon: Key,
		color: "bg-green-600",
		category: "Authentication",
		parameters: [
			{ id: "name", name: "Cookie Name", type: "text", placeholder: "session", required: true },
			{ id: "value", name: "Cookie Value", type: "text", placeholder: "abc123", required: true },
			{ id: "domain", name: "Domain (optional)", type: "text", placeholder: "localhost" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["name", "value"])
			const name = parameters.name as string
			const value = parameters.value as string
			const domain = (parameters.domain as string) || "localhost"
			try {
				console.log(`🍪 Setting cookie: ${name}`)
				await page.context().addCookies([{ name, value, domain, path: "/" }])
				console.log(`✅ Cookie set: ${name}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to set cookie: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.context().addCookies([{ name: '${p.name || ""}', value: '${esc(p.value || "")}', domain: '${p.domain || "localhost"}', path: '/' }]);`,
		toCypress: (p) => `    cy.setCookie('${p.name || ""}', '${esc(p.value || "")}');`,
	},
	{
		id: "clearCookies",
		name: "Clear Cookies",
		description: "Removes all browser cookies. Use at the start of a test to ensure a clean, unauthenticated state, or to test logout behavior.",
		icon: X,
		color: "bg-green-600",
		category: "Authentication",
		parameters: [],
		async execute(page) {
			try {
				console.log(`🧹 Clearing cookies`)
				await page.context().clearCookies()
				console.log(`✅ Cookies cleared`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to clear cookies: ${errorMessage}`)
			}
		},
		toCode: () => `  await page.context().clearCookies();`,
		toCypress: () => `    cy.clearCookies();`,
	},

	// ── Advanced ──
	{
		id: "setAuthState",
		name: "Set Auth State (Batch)",
		description: "Sets cookies, localStorage entries, and an auth token in a single step. Use as a shortcut when several Set Cookie / Set LocalStorage steps would otherwise be needed.",
		icon: Shield,
		color: "bg-green-700",
		category: "Advanced",
		parameters: [
			{ id: "token", name: "Auth Token (optional)", type: "text", placeholder: "eyJhbGci..." },
			{ id: "cookies", name: "Cookies (JSON array, optional)", type: "textarea", placeholder: '[{"name":"session","value":"abc","domain":"localhost","path":"/"}]' },
			{ id: "localStorage", name: "LocalStorage (JSON object, optional)", type: "textarea", placeholder: '{"featureFlag":"on"}' },
		],
		async execute(page, parameters) {
			try {
				console.log(`🔐 Setting authentication state`)
				if (parameters.cookies) {
					const cookies = typeof parameters.cookies === "string" ? JSON.parse(parameters.cookies) : parameters.cookies
					await page.context().addCookies(cookies)
				}
				if (parameters.localStorage) {
					const storage = typeof parameters.localStorage === "string" ? JSON.parse(parameters.localStorage) : parameters.localStorage
					await page.evaluate((s) => {
						Object.entries(s).forEach(([key, value]) => window.localStorage.setItem(key, value as string))
					}, storage)
				}
				if (parameters.token) {
					const token = parameters.token as string
					await page.evaluate((t) => window.localStorage.setItem("authToken", t), token)
				}
				console.log(`✅ Authentication state set`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to set auth state: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			`  await page.context().addCookies(${p.cookies || "[]"});\n  await page.evaluate((s) => {\n    Object.entries(s).forEach(([k, v]) => localStorage.setItem(k, v));\n  }, ${p.localStorage || "{}"});`,
	},
]
