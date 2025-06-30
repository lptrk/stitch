import chalk from "chalk"

export class Logger {
  constructor(debug = false) {
    this.debug_mode = debug
  }

  info(message) {
    console.log(chalk.blue("ℹ"), message)
  }

  success(message) {
    console.log(chalk.green("✅"), message)
  }

  error(message, error = null) {
    console.log(chalk.red("❌"), message)
    if (error && this.debug_mode) {
      console.error(error)
    }
  }

  warning(message) {
    console.log(chalk.yellow("⚠"), message)
  }

  debug(message) {
    if (this.debug_mode) {
      console.log(chalk.gray("🐛"), chalk.gray(message))
    }
  }

  step(stepNumber, blockName) {
    console.log(chalk.cyan(`  ${stepNumber}.`), chalk.yellow(blockName))
  }
}
