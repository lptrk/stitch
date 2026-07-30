/**
 * Command-line interface for the Stitch Playwright Test Runner.
 * Handles CLI argument parsing, workflow file validation, and result output formatting.
 * Provides user-friendly error messages and lists available workflows when files aren't found.
 * Supports environment variable configuration for headless mode and debugging.
 * Exits with appropriate status codes for CI/CD integration.
 */

import { TestRunner } from "./runner/TestRunner"
import chalk from "chalk"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// CLI execution
async function main(): Promise<void> {
	const args = process.argv.slice(2)

	// Show help
	if (args.includes("--help") || args.includes("-h")) {
		showHelp()
		process.exit(0)
	}

	// Show version
	if (args.includes("--version") || args.includes("-v")) {
		showVersion()
		process.exit(0)
	}

	const workflowPath = args.find((arg) => !arg.startsWith("--")) || "./workflows/simple-example.json"

	// Parse CLI flags
	const ignoreHTTPSErrors = args.includes("--ignore-https-errors")
	const headless = !args.includes("--no-headless")
	const debug = args.includes("--debug")
	const timeoutArg = args.find((arg) => arg.startsWith("--timeout="))
	const timeout = timeoutArg ? Number.parseInt(timeoutArg.split("=")[1]) : undefined
	const browserArg = args.find((arg) => arg.startsWith("--browser="))
	const browser = browserArg ? browserArg.split("=")[1] : undefined

	if (!fs.existsSync(workflowPath)) {
		console.error(chalk.red(`❌ Workflow file not found: ${workflowPath}`))

		// Show available workflows
		const workflowsDir = "./workflows"
		if (fs.existsSync(workflowsDir)) {
			const availableWorkflows = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".json"))
			if (availableWorkflows.length > 0) {
				console.log(chalk.yellow("\n📋 Available workflows:"))
				availableWorkflows.forEach((workflow) => {
					console.log(chalk.white(`  - ${workflowsDir}/${workflow}`))
				})
				console.log(chalk.gray("\nUsage: stitch-runner <workflow-file> [options]"))
				console.log(chalk.gray("Run 'stitch-runner --help' for more information"))
			}
		}

		process.exit(1)
	}

	const runner = new TestRunner({
		headless,
		ignoreHTTPSErrors,
		debug,
		timeout,
		browser,
	})

	try {
		console.log(chalk.blue("🚀 Starting Stitch Test Runner..."))
		console.log(chalk.gray(`📁 Workflow: ${workflowPath}`))
		console.log(chalk.gray(`🌐 Browser: ${browser || "chromium"}`))
		console.log(chalk.gray(`👁️  Headless: ${headless}`))
		console.log(chalk.gray(`🔒 Ignore HTTPS Errors: ${ignoreHTTPSErrors}`))
		console.log(chalk.gray(`🐛 Debug: ${debug}`))
		console.log(chalk.gray(`⏱️  Timeout: ${timeout || 30000}ms`))
		console.log("")

		const result = await runner.runWorkflow(workflowPath)

		// Output final results
		console.log("\n=== FINAL_RESULTS ===")
		console.log(JSON.stringify(result.stepResults, null, 2))
		console.log("=== END_RESULTS ===")

		if (result.success) {
			console.log(chalk.green("\n✅ TESTS PASSED"))
			console.log(chalk.gray(`⏱️  Duration: ${result.duration}ms`))
			console.log(chalk.gray(`📊 Steps: ${result.stepResults.length}`))
			process.exit(0)
		} else {
			console.log(chalk.red("\n❌ TESTS FAILED"))
			console.error(chalk.red("Error:"), result.error)
			console.log(chalk.gray(`⏱️  Duration: ${result.duration}ms`))
			console.log(chalk.gray(`📊 Steps: ${result.stepResults.length}`))
			process.exit(1)
		}
	} catch (error) {
		console.error(chalk.red("❌ CLI Error:"), error)
		process.exit(1)
	} finally {
		await runner.cleanup()
	}
}

function showHelp(): void {
	console.log(chalk.blue("🎭 Stitch - Playwright Test Runner"))
	console.log("")
	console.log(chalk.white("USAGE:"))
	console.log("  stitch-runner <workflow-file> [options]")
	console.log("")
	console.log(chalk.white("OPTIONS:"))
	console.log("  --help, -h              Show this help message")
	console.log("  --version, -v           Show version information")
	console.log("  --no-headless           Run browser in headed mode")
	console.log("  --ignore-https-errors   Ignore HTTPS certificate errors")
	console.log("  --debug                 Enable debug mode with verbose logging")
	console.log("  --timeout=<ms>          Set timeout in milliseconds (default: 30000)")
	console.log("  --browser=<name>        Set browser (chromium, firefox, webkit)")
	console.log("")
	console.log(chalk.white("EXAMPLES:"))
	console.log("  stitch-runner workflow.json")
	console.log("  stitch-runner workflow.json --no-headless --debug")
	console.log("  stitch-runner workflow.json --ignore-https-errors --timeout=60000")
	console.log("  stitch-runner workflow.json --browser=firefox")
	console.log("")
	console.log(chalk.white("ENVIRONMENT VARIABLES:"))
	console.log("  HEADLESS=false          Same as --no-headless")
	console.log("  DEBUG=true              Same as --debug")
	console.log("  IGNORE_HTTPS_ERRORS=true Same as --ignore-https-errors")
}

function showVersion(): void {
	try {
		// Try to find package.json from the project root
		const packageJsonPath = path.resolve(__dirname, "../package.json")
		if (fs.existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
			console.log(chalk.blue(`Stitch v${packageJson.version}`))
		} else {
			console.log(chalk.blue("Stitch v0.1.4"))
		}
	} catch {
		console.log(chalk.blue("Stitch v0.1.4"))
	}
}

// Auto-execute when this module is run directly
main().catch((error) => {
	console.error(chalk.red("❌ Fatal Error:"), error)
	process.exit(1)
})
