import { Camera } from "lucide-react"
import type { BlockDefinition } from "./types"

// Special symbol used by TestRunner to extract the screenshot from the block result
export const SCREENSHOT_RESULT_KEY = "__stitchScreenshot"

export const screenshotBlocks: BlockDefinition[] = [
	{
		id: "screenshot",
		name: "Take Screenshot",
		description: "Captures the page or a specific element as an image. The screenshot appears in the right panel after the run and can be downloaded directly from the browser.",
		icon: Camera,
		color: "bg-pink-500",
		category: "Screenshots",
		parameters: [
			{ id: "name", name: "Name", type: "text", placeholder: "login-page, checkout-step-2 …", required: false },
			{ id: "fullPage", name: "Full page", type: "boolean", defaultValue: "true" },
			{
				id: "format",
				name: "Format",
				type: "select",
				defaultValue: "png",
				options: [
					{ value: "png", label: "PNG (lossless)" },
					{ value: "jpeg", label: "JPEG (smaller file)" },
				],
			},
			{ id: "selector", name: "Element only (optional)", type: "selector", placeholder: ".chart-container, #invoice-preview" },
			{ id: "mask", name: "Mask sensitive fields (optional)", type: "selector", placeholder: "input[type='password'], .credit-card-number" },
			{ id: "omitBackground", name: "Transparent background (PNG only)", type: "boolean", defaultValue: "false" },
		],
		async execute(page, parameters) {
			const name = (parameters.name as string)?.trim()
			const format = (parameters.format as string) === "jpeg" ? "jpeg" : "png"
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
			const filename = name ? `${name.replace(/[^a-z0-9_\-]/gi, "-")}-${timestamp}.${format}` : `screenshot-${timestamp}.${format}`

			const fullPage = parameters.fullPage === "true" || parameters.fullPage === true
			const omitBackground = parameters.omitBackground === "true" || parameters.omitBackground === true
			const quality = parameters.quality ? Number.parseInt(parameters.quality as string) : undefined

			const maskSelectors = ((parameters.mask as string) || "").split(",").map((s) => s.trim()).filter(Boolean)
			const mask = maskSelectors.map((sel) => page.locator(sel))

			const elementSelector = (parameters.selector as string)?.trim()

			console.log(`📸 Taking ${elementSelector ? "element" : fullPage ? "full-page" : "viewport"} screenshot: ${filename}`)

			let buffer: Buffer

			if (elementSelector) {
				const locator = page.locator(elementSelector)
				await locator.waitFor({ state: "visible", timeout: 10000 })
				buffer = await locator.screenshot({
					type: format,
					quality: format === "jpeg" ? (quality ?? 90) : undefined,
					omitBackground: format === "png" ? omitBackground : undefined,
					mask: mask.length > 0 ? mask : undefined,
				})
			} else {
				buffer = await page.screenshot({
					fullPage,
					type: format,
					quality: format === "jpeg" ? (quality ?? 90) : undefined,
					omitBackground: format === "png" ? omitBackground : undefined,
					mask: mask.length > 0 ? mask : undefined,
				})
			}

			const base64 = buffer.toString("base64")
			const dataUrl = `data:image/${format};base64,${base64}`
			;(page as any)[SCREENSHOT_RESULT_KEY] = { dataUrl, filename, format }

			console.log(`✅ Screenshot captured: ${filename} (${Math.round(buffer.length / 1024)}KB)`)
		},
		toCode: (p, ctx) =>
			p.selector
				? `  await page.locator('${p.selector}').screenshot({ path: '${p.path || `step-${ctx.index + 1}.png`}' });`
				: `  await page.screenshot({ path: '${p.path || `step-${ctx.index + 1}.png`}', fullPage: ${p.fullPage === "true"} });`,
		toCypress: (p, ctx) => `    cy.screenshot('${p.path || `step-${ctx.index + 1}`}');`,
	},
]
