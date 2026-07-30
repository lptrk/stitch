/**
 * Logging utility class for the Stitch test runner with colored console output.
 * Provides different log levels (info, success, error, warning, debug) with emoji indicators.
 * Supports debug mode for detailed troubleshooting and step-by-step execution tracking.
 * Uses chalk library for colored terminal output to improve readability.
 * Handles both development debugging and production logging scenarios.
 */

import chalk from "chalk"

export class Logger {
  private debug_mode: boolean

  constructor(debug = false) {
    this.debug_mode = debug
  }

  info(message: string): void {
    console.log(chalk.blue("ℹ"), message)
  }

  success(message: string): void {
    console.log(chalk.green("✅"), message)
  }

  error(message: string, error: Error | null = null): void {
    console.log(chalk.red("❌"), message)
    if (error && this.debug_mode) {
      console.error(error)
    }
  }

  warning(message: string): void {
    console.log(chalk.yellow("⚠"), message)
  }

  debug(message: string): void {
    if (this.debug_mode) {
      console.log(chalk.gray("🐛"), chalk.gray(message))
    }
  }

  step(stepNumber: number, blockName: string): void {
    console.log(chalk.cyan(`  ${stepNumber}.`), chalk.yellow(blockName))
  }
}
