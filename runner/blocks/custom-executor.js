/**
 * Executes custom JavaScript code blocks safely
 */
export async function executeCustomBlock(page, parameters = {}, customCode = "") {
  if (!customCode) {
    throw new Error("No custom code provided")
  }

  try {
    // Create a safe execution context
    const context = {
      page,
      parameters,
      console: {
        log: (...args) => console.log("📝 Custom Block:", ...args),
        error: (...args) => console.error("❌ Custom Block Error:", ...args),
        warn: (...args) => console.warn("⚠️ Custom Block Warning:", ...args),
      },
      // Add some utility functions
      wait: (ms) => page.waitForTimeout(ms),
      click: (selector) => page.click(selector),
      fill: (selector, text) => page.fill(selector, text),
      goto: (url) => page.goto(url),
      waitForSelector: (selector) => page.waitForSelector(selector),
    }

    // Create function from code string
    const asyncFunction = new Function(
      "page",
      "parameters",
      "console",
      "wait",
      "click",
      "fill",
      "goto",
      "waitForSelector",
      `
      return (async () => {
        ${customCode}
      })();
      `,
    )

    // Execute the custom code
    await asyncFunction(
      context.page,
      context.parameters,
      context.console,
      context.wait,
      context.click,
      context.fill,
      context.goto,
      context.waitForSelector,
    )

    console.log("✅ Custom block executed successfully")
  } catch (error) {
    console.error("❌ Custom block execution failed:", error.message)
    throw new Error(`Custom block failed: ${error.message}`)
  }
}
