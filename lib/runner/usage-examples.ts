/**
 * Usage examples for different block types
 */

export const blockUsageExamples = {
	// Navigation Examples
	goto: {
		basic: { url: "/" },
		withPath: { url: "/dashboard" },
		external: { url: "https://example.com" },
	},

	// Interaction Examples
	click: {
		button: { selector: "button" },
		link: { selector: "a[href='/login']" },
		dataTestId: { selector: "[data-testid='submit-btn']" },
	},

	fill: {
		email: { selector: "input[name='email']", value: "test@example.com" },
		password: { selector: "input[type='password']", value: "password123" },
		textarea: { selector: "textarea", value: "Long text content here..." },
	},

	// Assertion Examples
	expectVisible: {
		element: { selector: ".success-message" },
		withTimeout: { selector: ".loading", timeout: 5000 },
	},

	expectText: {
		exact: { selector: "h1", text: "Welcome", exact: true },
		contains: { selector: ".message", text: "Success" },
	},

	// Waiting Examples
	waitForSelector: {
		visible: { selector: ".content", state: "visible" },
		hidden: { selector: ".spinner", state: "hidden" },
	},

	// Screenshot Examples
	screenshot: {
		basic: { path: "screenshots/test.png" },
		fullPage: { path: "screenshots/full.png", fullPage: true },
		quality: { path: "screenshots/compressed.jpg", quality: 60 },
	},

	// Mobile Examples
	tap: {
		element: { selector: ".mobile-button" },
		coordinates: { x: 100, y: 200 },
	},

	swipe: {
		leftToRight: { startX: 50, startY: 300, endX: 250, endY: 300 },
		topToBottom: { startX: 200, startY: 100, endX: 200, endY: 400 },
	},

	// Network Examples
	mockResponse: {
		users: {
			urlPattern: "**/api/users",
			response: {
				status: 200,
				body: { users: [{ id: 1, name: "John Doe" }] },
			},
		},
		error: {
			urlPattern: "**/api/error",
			response: {
				status: 500,
				body: { error: "Internal Server Error" },
			},
		},
	},
}
