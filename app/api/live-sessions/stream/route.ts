import { type NextRequest } from "next/server"
import { checkApiKeyQueryParam } from "@/lib/security"
import { liveSessionEvents, listSessions } from "@/lib/live-sessions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Global SSE broadcast of all live-session activity (session-created / step-added /
 * step-status / session-status / session-ended), tagged with sessionId. One connection covers
 * every session — the browser filters client-side for whichever workflow it's displaying.
 * Same ReadableStream/event-framing pattern as run-workflow-stream/route.ts.
 */
export async function GET(request: NextRequest) {
  const authError = checkApiKeyQueryParam(request)
  if (authError) return authError

  const encoder = new TextEncoder()

  let listener: ((payload: unknown) => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: session-event\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          // controller already closed (client disconnected) — listener gets removed in cancel()
        }
      }

      // Snapshot current sessions first, so a client that connects mid-session isn't blind
      // until the next mutation.
      for (const session of listSessions()) {
        send({ type: "snapshot", sessionId: session.id, session })
      }

      listener = (payload: unknown) => send(payload)
      liveSessionEvents.on("event", listener)
    },
    cancel() {
      if (listener) liveSessionEvents.off("event", listener)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
