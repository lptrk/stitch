import { Download, FileText, CheckCircle, Clock, FolderOpen, Printer, Settings } from "lucide-react"
import type { BlockDefinition } from "./types"
import { validateParameters } from "./types"
import { esc } from "./navigation"
import { sanitizePath } from "@/lib/security"

export const fileOperationBlocks: BlockDefinition[] = [
	{
		id: "downloadFile",
		name: "Download File",
		description: "Clicks a download trigger and waits for the file to download. Use to test that export functions (CSV, PDF, etc.) produce a file successfully.",
		icon: Download,
		color: "bg-emerald-500",
		category: "File Operations",
		parameters: [
			{ id: "triggerSelector", name: "Download Trigger", type: "selector", placeholder: "#download-button", required: true },
			{ id: "savePath", name: "Save Path (optional)", type: "text", placeholder: "./downloads/file.pdf" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["triggerSelector"])
			const triggerSelector = parameters.triggerSelector as string
			const safeSavePath = parameters.savePath ? sanitizePath(parameters.savePath as string) : null
			try {
				console.log(`📥 Triggering download via: ${triggerSelector}`)
				const downloadPromise = page.waitForEvent("download")
				await page.click(triggerSelector)
				const download = await downloadPromise
				if (safeSavePath) {
					await download.saveAs(safeSavePath)
					console.log(`✅ File downloaded`)
				} else {
					await download.path()
					console.log(`✅ File downloaded to temp location`)
				}
				;(page as any)._lastDownload = download
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to download file: ${errorMessage}`)
			}
		},
		toCode: (p, ctx) =>
			p.savePath
				? `  const [download${ctx.index + 1}] = await Promise.all([\n    page.waitForEvent('download'),\n    page.locator('${esc(p.triggerSelector || "element")}').click(),\n  ]);\n  await download${ctx.index + 1}.saveAs('${p.savePath}');`
				: `  const [download${ctx.index + 1}] = await Promise.all([\n    page.waitForEvent('download'),\n    page.locator('${esc(p.triggerSelector || "element")}').click(),\n  ]);`,
		toCypress: (p) => `    cy.get('${esc(p.triggerSelector || "element")}').click();\n    // verify download: cy.readFile('./cypress/downloads/...')`,
	},
	{
		id: "generatePDF",
		name: "Generate PDF",
		description: "Saves the current page as a PDF file on the server. Use to capture print-ready reports or invoices as part of an automated workflow.",
		icon: FileText,
		color: "bg-emerald-500",
		category: "File Operations",
		parameters: [
			{ id: "path", name: "PDF Path", type: "text", placeholder: "reports/page.pdf", defaultValue: "page.pdf" },
			{
				id: "format",
				name: "Page Format",
				type: "select",
				defaultValue: "A4",
				options: [
					{ value: "A4", label: "A4" },
					{ value: "A3", label: "A3" },
					{ value: "Letter", label: "Letter" },
					{ value: "Legal", label: "Legal" },
				],
			},
			{ id: "landscape", name: "Landscape", type: "boolean", defaultValue: "false" },
		],
		async execute(page, parameters) {
			const safePath = sanitizePath((parameters.path as string) || `pdf-${Date.now()}.pdf`)
			const format = (parameters.format as string) || "A4"
			const landscape = parameters.landscape === true || parameters.landscape === "true"
			try {
				console.log(`📄 Generating PDF`)
				await page.pdf({ path: safePath, format: format as any, landscape, printBackground: true })
				console.log(`✅ PDF generated`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to generate PDF: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.pdf({ path: '${p.path || "page.pdf"}', format: '${p.format || "A4"}', landscape: ${p.landscape === "true"} });`,
	},

	// ── Advanced: downloads ──
	{
		id: "waitForDownload",
		name: "Wait for Download",
		description: "Waits for a file download to start without clicking anything itself. Use when the download is triggered indirectly (e.g. by a prior step).",
		icon: Clock,
		color: "bg-emerald-600",
		category: "Advanced",
		parameters: [{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" }],
		async execute(page, parameters) {
			const timeout = Number.parseInt(parameters.timeout as string) || 30000
			try {
				console.log(`📥 Waiting for download (timeout: ${timeout}ms)`)
				const download = await page.waitForEvent("download", { timeout })
				console.log(`✅ Download started: ${download.suggestedFilename()}`)
				;(page as any)._lastDownload = download
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to wait for download: ${errorMessage}`)
			}
		},
		toCode: (p) => `  const download = await page.waitForEvent('download', { timeout: ${p.timeout || 30000} });`,
	},
	{
		id: "verifyDownload",
		name: "Verify Download",
		description: "Asserts details about the most recent download (filename, size). Use after Download File or Wait for Download to confirm the right file arrived.",
		icon: CheckCircle,
		color: "bg-emerald-600",
		category: "Advanced",
		parameters: [
			{ id: "filename", name: "Expected Filename Contains (optional)", type: "text", placeholder: "invoice" },
			{ id: "minSize", name: "Min Size (bytes, optional)", type: "number" },
			{ id: "maxSize", name: "Max Size (bytes, optional)", type: "number" },
		],
		async execute(page, parameters) {
			const { filename, minSize, maxSize } = parameters
			try {
				const download = (page as any)._lastDownload
				if (!download) throw new Error("No download found. Use Wait for Download or Download File first.")
				const suggestedName = download.suggestedFilename()
				console.log(`📥 Verifying download: ${suggestedName}`)
				if (filename && !suggestedName.includes(filename as string)) {
					throw new Error(`Download filename "${suggestedName}" does not contain "${filename}"`)
				}
				if (minSize || maxSize) {
					const path = await download.path()
					if (path) {
						const fs = await import(/* webpackIgnore: true */ "fs")
						const size = fs.statSync(path).size
						if (minSize && size < Number.parseInt(minSize as string)) throw new Error(`Download size ${size} bytes is less than minimum ${minSize}`)
						if (maxSize && size > Number.parseInt(maxSize as string)) throw new Error(`Download size ${size} bytes is greater than maximum ${maxSize}`)
					}
				}
				console.log(`✅ Download verified: ${suggestedName}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to verify download: ${errorMessage}`)
			}
		},
		toCode: (p) => `  // verify download: expect(download.suggestedFilename()).toContain('${p.filename || ""}');`,
	},
	{
		id: "getDownloadPath",
		name: "Get Download Path",
		description: "Reads the local file path of the most recent download. Use after Download File or Wait for Download to inspect the file on disk.",
		icon: FolderOpen,
		color: "bg-emerald-600",
		category: "Advanced",
		parameters: [],
		async execute(page) {
			try {
				const download = (page as any)._lastDownload
				if (!download) throw new Error("No download found. Use Wait for Download or Download File first.")
				const path = await download.path()
				console.log(`📥 Download path: ${path}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to get download path: ${errorMessage}`)
			}
		},
		toCode: (_p, ctx) => `  const downloadPath${ctx.index + 1} = await download.path();\n  console.log('downloadPath${ctx.index + 1}:', downloadPath${ctx.index + 1});`,
	},

	// ── Advanced: printing ──
	{
		id: "printPage",
		name: "Print Page (PDF buffer)",
		description: "Renders the current page to a PDF buffer without saving it to disk. Use when you only need to inspect print output in-memory, not persist a file.",
		icon: Printer,
		color: "bg-emerald-600",
		category: "Advanced",
		parameters: [
			{
				id: "format",
				name: "Page Format",
				type: "select",
				defaultValue: "A4",
				options: [
					{ value: "A4", label: "A4" },
					{ value: "A3", label: "A3" },
					{ value: "Letter", label: "Letter" },
					{ value: "Legal", label: "Legal" },
				],
			},
			{ id: "landscape", name: "Landscape", type: "boolean", defaultValue: "false" },
		],
		async execute(page, parameters) {
			const format = (parameters.format as string) || "A4"
			const landscape = parameters.landscape === true || parameters.landscape === "true"
			try {
				console.log(`🖨️ Printing page`)
				await page.pdf({ format: format as any, landscape, printBackground: true })
				console.log(`✅ Page printed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to print page: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.pdf({ format: '${p.format || "A4"}', landscape: ${p.landscape === "true"} });`,
	},
	{
		id: "setPrintOptions",
		name: "Set Print/Media Options",
		description: "Emulates a media type, color scheme, or reduced-motion preference. Use to test print stylesheets or dark-mode CSS without a real print dialog.",
		icon: Settings,
		color: "bg-emerald-600",
		category: "Advanced",
		parameters: [
			{
				id: "mediaType",
				name: "Media Type",
				type: "select",
				defaultValue: "print",
				options: [
					{ value: "print", label: "Print" },
					{ value: "screen", label: "Screen" },
				],
			},
			{
				id: "colorScheme",
				name: "Color Scheme",
				type: "select",
				defaultValue: "light",
				options: [
					{ value: "light", label: "Light" },
					{ value: "dark", label: "Dark" },
					{ value: "no-preference", label: "No Preference" },
				],
			},
		],
		async execute(page, parameters) {
			const mediaType = (parameters.mediaType as string) || "print"
			const colorScheme = (parameters.colorScheme as string) || "light"
			try {
				console.log(`🖨️ Setting print/media options`)
				await page.emulateMedia({ media: mediaType as any, colorScheme: colorScheme as any })
				console.log(`✅ Print options set`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to set print options: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.emulateMedia({ media: '${p.mediaType || "print"}', colorScheme: '${p.colorScheme || "light"}' });`,
	},
]
