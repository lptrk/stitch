import { Wifi, Send, WifiOff } from "lucide-react"
import type { BlockDefinition } from "../types"

export const websocketBlocks: BlockDefinition[] = [
	{
		id: "waitForWebSocket",
		name: "Wait for WebSocket",
		description: "Waits until a WebSocket connection opens, optionally matching a URL. Use to confirm a real-time feature initiated its connection.",
		icon: Wifi,
		color: "bg-sky-600",
		category: "Advanced",
		parameters: [
			{ id: "url", name: "URL Contains (optional)", type: "text", placeholder: "wss://example.com/socket" },
			{ id: "timeout", name: "Timeout (ms)", type: "number", placeholder: "30000", defaultValue: "30000" },
		],
		async execute(page, parameters) {
			const url = parameters.url as string
			const timeout = Number.parseInt(parameters.timeout as string) || 30000
			try {
				console.log(`🔌 Waiting for WebSocket connection${url ? ` to ${url}` : ""} (timeout: ${timeout}ms)`)
				await page.waitForEvent("websocket", { predicate: (ws) => !url || ws.url().includes(url), timeout })
				console.log(`✅ WebSocket connection detected`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to wait for WebSocket: ${errorMessage}`)
			}
		},
		toCode: (p) => `  await page.waitForEvent('websocket', { predicate: ws => ${p.url ? `ws.url().includes('${p.url}')` : "true"}, timeout: ${p.timeout || 30000} });`,
	},
	{
		id: "sendWebSocketMessage",
		name: "Send WebSocket Message",
		description: "Sends a message over an active WebSocket connection (or opens a new one). Use to simulate client-initiated real-time events.",
		icon: Send,
		color: "bg-sky-600",
		category: "Advanced",
		parameters: [
			{ id: "message", name: "Message", type: "text", placeholder: '{"type":"ping"}', required: true },
			{ id: "url", name: "WebSocket URL (if none active)", type: "text", placeholder: "ws://localhost:8080" },
		],
		async execute(page, parameters) {
			const message = parameters.message as string
			const url = parameters.url as string
			if (!message) throw new Error("message is required for sendWebSocketMessage")
			try {
				console.log(`🔌 Sending WebSocket message: ${message}`)
				await page.evaluate(
					({ message, url }) => {
						const ws = (window as any)._testWebSocket || new WebSocket(url || "ws://localhost:8080")
						ws.send(message)
						;(window as any)._testWebSocket = ws
					},
					{ message, url },
				)
				console.log(`✅ WebSocket message sent`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to send WebSocket message: ${errorMessage}`)
			}
		},
		toCode: (p) =>
			`  await page.evaluate(({ message, url }) => {\n    const ws = (window as any)._testWebSocket || new WebSocket(url || 'ws://localhost:8080');\n    ws.send(message);\n    (window as any)._testWebSocket = ws;\n  }, { message: '${p.message || ""}', url: '${p.url || ""}' });`,
	},
	{
		id: "closeWebSocket",
		name: "Close WebSocket",
		description: "Closes the WebSocket connection opened by Send WebSocket Message. Use to test disconnect/reconnect handling.",
		icon: WifiOff,
		color: "bg-sky-600",
		category: "Advanced",
		parameters: [],
		async execute(page) {
			try {
				console.log(`🔌 Closing WebSocket connection`)
				await page.evaluate(() => {
					const ws = (window as any)._testWebSocket
					if (ws) {
						ws.close()
						delete (window as any)._testWebSocket
					}
				})
				console.log(`✅ WebSocket connection closed`)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				throw new Error(`Failed to close WebSocket: ${errorMessage}`)
			}
		},
		toCode: () => `  await page.evaluate(() => {\n    const ws = (window as any)._testWebSocket;\n    if (ws) { ws.close(); delete (window as any)._testWebSocket; }\n  });`,
	},
]
