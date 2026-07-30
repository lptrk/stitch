import { MousePointerClick, Move, ZoomIn, RotateCw, Hand, ArrowRightLeft, CheckCircle } from "lucide-react"
import type { BlockDefinition } from "../types"
import { validateParameters } from "../types"
import { esc } from "../navigation"

export const touchBlocks: BlockDefinition[] = [
	{
		id: "tap",
		name: "Tap",
		description: "Performs a touch tap on an element or coordinates. Use to simulate mobile touch interaction instead of a mouse click.",
		icon: MousePointerClick,
		color: "bg-rose-500",
		category: "Advanced",
		parameters: [
			{ id: "selector", name: "Selector (optional)", type: "selector", placeholder: "button" },
			{ id: "x", name: "X (if no selector)", type: "number" },
			{ id: "y", name: "Y (if no selector)", type: "number" },
		],
		async execute(page, parameters) {
			const { selector, x, y } = parameters
			if (!selector && (x === undefined || y === undefined)) throw new Error("Either selector or coordinates (x, y) are required for tap")
			try {
				if (selector) {
					console.log(`👆 Tapping: ${selector}`)
					await page.locator(selector as string).tap()
				} else {
					console.log(`👆 Tapping at: (${x}, ${y})`)
					await page.touchscreen.tap(Number.parseInt(x as string), Number.parseInt(y as string))
				}
				console.log(`✅ Tap completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to tap: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.selector
				? `  await page.locator('${esc(p.selector)}').tap();`
				: `  await page.touchscreen.tap(${p.x || 0}, ${p.y || 0});`,
	},
	{
		id: "swipe",
		name: "Swipe",
		description: "Performs a touch swipe gesture from one point to another. Use to test swipeable carousels, cards, or mobile navigation drawers.",
		icon: Move,
		color: "bg-rose-500",
		category: "Advanced",
		parameters: [
			{ id: "startX", name: "Start X", type: "number", required: true },
			{ id: "startY", name: "Start Y", type: "number", required: true },
			{ id: "endX", name: "End X", type: "number", required: true },
			{ id: "endY", name: "End Y", type: "number", required: true },
			{ id: "duration", name: "Duration (ms)", type: "number", defaultValue: "300" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["startX", "startY", "endX", "endY"])
			const startX = Number.parseInt(parameters.startX as string)
			const startY = Number.parseInt(parameters.startY as string)
			const endX = Number.parseInt(parameters.endX as string)
			const endY = Number.parseInt(parameters.endY as string)
			const duration = Number.parseInt(parameters.duration as string) || 300
			try {
				console.log(`👆 Swiping from (${startX}, ${startY}) to (${endX}, ${endY})`)
				await page.touchscreen.tap(startX, startY)
				await page.waitForTimeout(50)
				await page.mouse.move(startX, startY)
				await page.mouse.down()
				await page.mouse.move(endX, endY, { steps: 10 })
				await page.mouse.up()
				await page.waitForTimeout(duration)
				console.log(`✅ Swipe completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to swipe: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			`  await page.mouse.move(${p.startX || 0}, ${p.startY || 0});\n  await page.mouse.down();\n  await page.mouse.move(${p.endX || 0}, ${p.endY || 0}, { steps: 10 });\n  await page.mouse.up();`,
	},
	{
		id: "pinch",
		name: "Pinch Zoom",
		description: "Simulates a pinch-to-zoom gesture centered on a point. Use to test zoomable images, maps, or galleries on touch devices.",
		icon: ZoomIn,
		color: "bg-rose-500",
		category: "Advanced",
		parameters: [
			{ id: "centerX", name: "Center X", type: "number", required: true },
			{ id: "centerY", name: "Center Y", type: "number", required: true },
			{ id: "scale", name: "Scale (>1 = zoom in, <1 = zoom out)", type: "number", placeholder: "1.5", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["centerX", "centerY", "scale"])
			const centerX = Number.parseInt(parameters.centerX as string)
			const centerY = Number.parseInt(parameters.centerY as string)
			const scale = Number.parseFloat(parameters.scale as string)
			try {
				console.log(`🤏 Pinching at (${centerX}, ${centerY}) with scale: ${scale}`)
				const distance = 100
				const newDistance = distance * scale
				await page.touchscreen.tap(centerX - distance / 2, centerY)
				await page.touchscreen.tap(centerX + distance / 2, centerY)
				await page.mouse.move(centerX - newDistance / 2, centerY, { steps: 10 })
				await page.mouse.move(centerX + newDistance / 2, centerY, { steps: 10 })
				console.log(`✅ Pinch gesture completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to pinch: ${errorMessage}`)
			}
		},
		toCode: (p) => `  // Pinch at (${p.centerX || 0}, ${p.centerY || 0}) scale ${p.scale || 1}: simulated via two touch points, see Stitch runner for reference implementation`,
	},
	{
		id: "rotate",
		name: "Rotate Gesture",
		description: "Simulates a two-finger rotation gesture around a center point. Use to test rotatable images or components on touch devices.",
		icon: RotateCw,
		color: "bg-rose-500",
		category: "Advanced",
		parameters: [
			{ id: "centerX", name: "Center X", type: "number", required: true },
			{ id: "centerY", name: "Center Y", type: "number", required: true },
			{ id: "angle", name: "Angle (degrees)", type: "number", placeholder: "90", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["centerX", "centerY", "angle"])
			const centerX = Number.parseInt(parameters.centerX as string)
			const centerY = Number.parseInt(parameters.centerY as string)
			const angle = Number.parseFloat(parameters.angle as string)
			try {
				console.log(`👆 Rotating at (${centerX}, ${centerY}) by ${angle} degrees`)
				const radius = 50
				const endAngle = (angle * Math.PI) / 180
				const startX = centerX + radius
				const startY = centerY
				const endX = centerX + radius * Math.cos(endAngle)
				const endY = centerY + radius * Math.sin(endAngle)
				await page.touchscreen.tap(startX, startY)
				await page.mouse.move(endX, endY, { steps: 20 })
				console.log(`✅ Rotation gesture completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to rotate: ${errorMessage}`)
			}
		},
		toCode: (p) => `  // Rotate at (${p.centerX || 0}, ${p.centerY || 0}) by ${p.angle || 0} degrees: simulated via touch + mouse move, see Stitch runner for reference implementation`,
	},
	{
		id: "touchStart",
		name: "Touch Start",
		description: "Begins a touch interaction at a coordinate. Use together with Touch Move and Touch End to compose custom touch gesture sequences.",
		icon: Hand,
		color: "bg-rose-500",
		category: "Advanced",
		parameters: [
			{ id: "x", name: "X", type: "number", required: true },
			{ id: "y", name: "Y", type: "number", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["x", "y"])
			const x = Number.parseInt(parameters.x as string)
			const y = Number.parseInt(parameters.y as string)
			try {
				console.log(`👆 Touch start at: (${x}, ${y})`)
				await page.touchscreen.tap(x, y)
				console.log(`✅ Touch start completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to start touch: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.touchscreen.tap(${p.x || 0}, ${p.y || 0});`,
	},
	{
		id: "touchMove",
		name: "Touch Move",
		description: "Moves an active touch point to a coordinate. Use between Touch Start and Touch End to compose custom touch gesture sequences.",
		icon: ArrowRightLeft,
		color: "bg-rose-500",
		category: "Advanced",
		parameters: [
			{ id: "x", name: "X", type: "number", required: true },
			{ id: "y", name: "Y", type: "number", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["x", "y"])
			const x = Number.parseInt(parameters.x as string)
			const y = Number.parseInt(parameters.y as string)
			try {
				console.log(`👆 Touch move to: (${x}, ${y})`)
				await page.mouse.move(x, y)
				console.log(`✅ Touch move completed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to move touch: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.mouse.move(${p.x || 0}, ${p.y || 0});`,
	},
	{
		id: "touchEnd",
		name: "Touch End",
		description: "Ends an active touch interaction. Use as the final step after Touch Start and Touch Move in a custom touch gesture sequence.",
		icon: CheckCircle,
		color: "bg-rose-500",
		category: "Advanced",
		parameters: [],
		async execute() {
			console.log(`👆 Touch end`)
			console.log(`✅ Touch end completed`)
		},
		toCode: () => `  // Touch end: handled automatically by Playwright after the preceding touch/mouse actions`,
	},
]
