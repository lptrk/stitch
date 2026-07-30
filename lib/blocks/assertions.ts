import { Eye, EyeOff, FileText, AlignLeft, Link, ToggleLeft, CheckSquare, Hash, Code } from "lucide-react"
import type { BlockDefinition } from "./types"
import { validateParameters } from "./types"
import { esc } from "./navigation"

export const assertionBlocks: BlockDefinition[] = [
	{
		id: "expectVisible",
		name: "Expect Visible",
		description: "Asserts that an element is visible on screen. Use after clicks or navigation to confirm the expected UI appeared (e.g. success message, modal, next page).",
		icon: Eye,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: ".success-message", required: true },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "10000", defaultValue: "10000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const timeout = Number.parseInt(parameters.timeout as string) || 10000
			try {
				console.log(`👀 Checking visibility: ${selector}`)
				await page.waitForSelector(selector, { state: "visible", timeout })
				console.log(`✅ Element is visible: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Element not visible "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await expect(page.locator('${esc(p.selector || "element")}')).toBeVisible({ timeout: ${p.timeout || 10000} });`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}', { timeout: ${p.timeout || 10000} }).should('be.visible');`,
	},
	{
		id: "expectHidden",
		name: "Expect Hidden",
		description: "Asserts that an element is not visible or not in the DOM. Use to confirm modals are closed, loaders disappeared, or error messages are gone.",
		icon: EyeOff,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: ".loading-spinner", required: true },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "10000", defaultValue: "10000" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const timeout = Number.parseInt(parameters.timeout as string) || 10000
			try {
				console.log(`🙈 Checking element is hidden: ${selector}`)
				await page.waitForSelector(selector, { state: "hidden", timeout })
				console.log(`✅ Element is hidden: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Element not hidden "${selector}": ${errorMessage}`)
			}
		},
		toCode: (p) => `  await expect(page.locator('${esc(p.selector || "element")}')).toBeHidden({ timeout: ${p.timeout || 10000} });`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}', { timeout: ${p.timeout || 10000} }).should('not.be.visible');`,
	},
	{
		id: "expectText",
		name: "Expect Text",
		description: "Asserts that an element contains specific text. Use to verify page headings, success messages, error messages, or data displayed after an action.",
		icon: FileText,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "h1", required: true },
			{ id: "text", name: "Expected Text", type: "text", placeholder: "Welcome", required: true },
			{ id: "exact", name: "Exact Match", type: "boolean", defaultValue: "false" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector", "text"])
			const selector = parameters.selector as string
			const expectedText = parameters.text as string
			const exact = parameters.exact === "true" || parameters.exact === true
			try {
				console.log(`📝 Checking text in "${selector}": ${expectedText}`)
				const actualText = await page.locator(selector).textContent()
				if (!actualText) throw new Error(`No text content found in element: ${selector}`)
				const matches = exact ? actualText.trim() === expectedText : actualText.includes(expectedText)
				if (!matches) throw new Error(`Text mismatch in "${selector}". Expected: "${expectedText}", Actual: "${actualText}"`)
				console.log(`✅ Text verified in "${selector}": ${expectedText}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Text assertion failed: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.exact === "true"
				? `  await expect(page.locator('${esc(p.selector || "element")}')).toHaveText('${esc(p.text || "")}');`
				: `  await expect(page.locator('${esc(p.selector || "element")}')).toContainText('${esc(p.text || "")}');`,
		toCypress: (p) =>
			p.exact === "true"
				? `    cy.get('${esc(p.selector || "element")}').should('have.text', '${esc(p.text || "")}');`
				: `    cy.get('${esc(p.selector || "element")}').should('contain.text', '${esc(p.text || "")}');`,
	},
	{
		id: "expectValue",
		name: "Expect Input Value",
		description: "Asserts the current value of an input field. Use to verify a form was pre-filled correctly, or that a field retained its value after submit.",
		icon: AlignLeft,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "input[name='email']", required: true },
			{ id: "value", name: "Expected Value", type: "text", placeholder: "test@example.com", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector", "value"])
			const selector = parameters.selector as string
			const expectedValue = parameters.value as string
			try {
				console.log(`📝 Checking input value in "${selector}": ${expectedValue}`)
				const actualValue = await page.locator(selector).inputValue()
				if (actualValue !== expectedValue) {
					throw new Error(`Value mismatch in "${selector}". Expected: "${expectedValue}", Actual: "${actualValue}"`)
				}
				console.log(`✅ Value verified in "${selector}": ${expectedValue}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Value assertion failed: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await expect(page.locator('${esc(p.selector || "element")}')).toHaveValue('${esc(p.value || "")}');`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').should('have.value', '${esc(p.value || "")}');`,
	},
	{
		id: "expectUrl",
		name: "Expect URL",
		description: "Asserts the current page URL. Use after navigation or form submission to confirm the user landed on the correct page. Supports partial matches.",
		icon: Link,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "url", name: "Expected URL or Pattern", type: "text", placeholder: "/dashboard or https://example.com/dashboard", required: true },
			{ id: "exact", name: "Exact Match", type: "boolean", defaultValue: "false" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["url"])
			const expectedUrl = parameters.url as string
			const exact = parameters.exact === "true" || parameters.exact === true
			try {
				const currentUrl = page.url()
				console.log(`🌐 Checking current URL: ${currentUrl}`)
				const matches = exact ? currentUrl === expectedUrl : currentUrl.includes(expectedUrl)
				if (!matches) throw new Error(`URL mismatch. Expected: "${expectedUrl}", Actual: "${currentUrl}"`)
				console.log(`✅ URL verified: ${currentUrl}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`URL assertion failed: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.exact === "true"
				? `  await expect(page).toHaveURL('${esc(p.url || "")}');`
				: `  await expect(page).toHaveURL(new RegExp('${esc(p.url || "")}'));`,
		toCypress: (p) => `    cy.url().should('include', '${esc(p.url || "")}');`,
	},
	{
		id: "expectTitle",
		name: "Expect Page Title",
		description: "Asserts the browser tab title. Use to verify the correct page loaded, especially in multi-page apps where titles change per page.",
		icon: FileText,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "title", name: "Expected Title", type: "text", placeholder: "My App – Dashboard", required: true },
			{ id: "exact", name: "Exact Match", type: "boolean", defaultValue: "false" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["title"])
			const expectedTitle = parameters.title as string
			const exact = parameters.exact === "true" || parameters.exact === true
			try {
				const actualTitle = await page.title()
				console.log(`📋 Checking page title: "${actualTitle}"`)
				const matches = exact ? actualTitle === expectedTitle : actualTitle.includes(expectedTitle)
				if (!matches) throw new Error(`Title mismatch. Expected: "${expectedTitle}", Actual: "${actualTitle}"`)
				console.log(`✅ Page title verified: "${actualTitle}"`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Title assertion failed: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.exact === "true"
				? `  await expect(page).toHaveTitle('${esc(p.title || "")}');`
				: `  await expect(page).toHaveTitle(new RegExp('${esc(p.title || "")}'));`,
		toCypress: (p) => `    cy.title().should('include', '${esc(p.title || "")}');`,
	},
	{
		id: "expectEnabled",
		name: "Expect Enabled / Disabled",
		description: "Asserts that a button or input is enabled or disabled. Use to verify submit buttons are locked until a form is valid, or unlocked after a condition is met.",
		icon: ToggleLeft,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "button[type='submit']", required: true },
			{ id: "enabled", name: "Should Be Enabled", type: "boolean", defaultValue: "true" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const shouldBeEnabled = parameters.enabled !== "false" && parameters.enabled !== false
			try {
				console.log(`🔘 Checking enabled state: ${selector}`)
				const isEnabled = await page.locator(selector).isEnabled()
				if (isEnabled !== shouldBeEnabled) {
					throw new Error(`Expected "${selector}" to be ${shouldBeEnabled ? "enabled" : "disabled"}, but it was ${isEnabled ? "enabled" : "disabled"}`)
				}
				console.log(`✅ Enabled state verified: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Enabled assertion failed: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.enabled === "false"
				? `  await expect(page.locator('${esc(p.selector || "element")}')).toBeDisabled();`
				: `  await expect(page.locator('${esc(p.selector || "element")}')).toBeEnabled();`,
		toCypress: (p) =>
			p.enabled === "false"
				? `    cy.get('${esc(p.selector || "element")}').should('be.disabled');`
				: `    cy.get('${esc(p.selector || "element")}').should('be.enabled');`,
	},
	{
		id: "expectChecked",
		name: "Expect Checked",
		description: "Asserts that a checkbox or radio button is in the checked or unchecked state. Use to verify toggle defaults or confirm a selection was saved.",
		icon: CheckSquare,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "input[type='checkbox']", required: true },
			{ id: "checked", name: "Should Be Checked", type: "boolean", defaultValue: "true" },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector"])
			const selector = parameters.selector as string
			const shouldBeChecked = parameters.checked !== "false" && parameters.checked !== false
			try {
				console.log(`☑️ Checking checked state: ${selector}`)
				const isChecked = await page.locator(selector).isChecked()
				if (isChecked !== shouldBeChecked) {
					throw new Error(`Expected "${selector}" to be ${shouldBeChecked ? "checked" : "unchecked"}, but it was ${isChecked ? "checked" : "unchecked"}`)
				}
				console.log(`✅ Checked state verified: ${selector}`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Checked assertion failed: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			p.checked === "false"
				? `  await expect(page.locator('${esc(p.selector || "element")}')).not.toBeChecked();`
				: `  await expect(page.locator('${esc(p.selector || "element")}')).toBeChecked();`,
		toCypress: (p) =>
			p.checked === "false"
				? `    cy.get('${esc(p.selector || "element")}').should('not.be.checked');`
				: `    cy.get('${esc(p.selector || "element")}').should('be.checked');`,
	},
	{
		id: "expectCount",
		name: "Expect Element Count",
		description: "Asserts the number of elements matching a selector. Use to verify a list has the right number of items, or that duplicates don't appear.",
		icon: Hash,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "li.item", required: true },
			{ id: "count", name: "Expected Count", type: "number", placeholder: "5", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector", "count"])
			const selector = parameters.selector as string
			const expectedCount = Number.parseInt(parameters.count as string) || 0
			try {
				console.log(`🔢 Checking element count: ${selector}`)
				const actualCount = await page.locator(selector).count()
				if (actualCount !== expectedCount) {
					throw new Error(`Count mismatch for "${selector}". Expected: ${expectedCount}, Actual: ${actualCount}`)
				}
				console.log(`✅ Count verified: ${selector} (${actualCount})`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Count assertion failed: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await expect(page.locator('${esc(p.selector || "element")}')).toHaveCount(${p.count || 0});`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').should('have.length', ${p.count || 0});`,
	},
	{
		id: "expectAttribute",
		name: "Expect Attribute",
		description: "Asserts the value of an HTML attribute on an element. Use to verify image sources, link hrefs, aria-labels, or data attributes.",
		icon: Code,
		color: "bg-orange-500",
		category: "Assertions",
		parameters: [
			{ id: "selector", name: "Selector", type: "selector", placeholder: "img.logo", required: true },
			{ id: "attribute", name: "Attribute Name", type: "text", placeholder: "src", required: true },
			{ id: "value", name: "Expected Value", type: "text", placeholder: "/logo.png", required: true },
		],
		async execute(page, parameters) {
			validateParameters(parameters, ["selector", "attribute", "value"])
			const selector = parameters.selector as string
			const attribute = parameters.attribute as string
			const expectedValue = parameters.value as string
			try {
				console.log(`🏷️ Checking attribute "${attribute}" on: ${selector}`)
				const actualValue = await page.locator(selector).getAttribute(attribute)
				if (actualValue !== expectedValue) {
					throw new Error(`Attribute mismatch for "${selector}" [${attribute}]. Expected: "${expectedValue}", Actual: "${actualValue}"`)
				}
				console.log(`✅ Attribute verified: ${selector} [${attribute}]`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Attribute assertion failed: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await expect(page.locator('${esc(p.selector || "element")}')).toHaveAttribute('${p.attribute || ""}', '${esc(p.value || "")}');`,
		toCypress: (p) => `    cy.get('${esc(p.selector || "element")}').should('have.attr', '${p.attribute || ""}', '${esc(p.value || "")}');`,
	},
]
