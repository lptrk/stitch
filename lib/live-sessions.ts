/**
 * In-memory store for "Live Agent Sessions" — the deliberate, scoped exception to Stitch's
 * usual "server holds no state" rule (see the approved plan). A live session exists only for
 * as long as this Node process runs; it does not need to survive a restart, only to be visible
 * across the MCP tool calls that build it and the SSE connection(s) that watch it.
 *
 * Every mutation emits on `liveSessionEvents` so app/api/live-sessions/stream/route.ts can
 * broadcast it to connected browsers without polling.
 */
import { EventEmitter } from "events"
import { uiBlocks } from "@/lib/blocks/registry"
import type { WorkflowItem, Workflow } from "@/types/workflow"

export type LiveSessionStatus = "building" | "running" | "idle"

export interface LiveSession {
  id: string
  name: string
  baseUrl: string
  items: WorkflowItem[]
  status: LiveSessionStatus
  createdAt: number
  updatedAt: number
}

// Next.js dev mode can evaluate this module more than once across different route bundles
// (hot reload recompiles routes independently) — a plain module-scope `const` would then give
// the MCP route and the SSE route two different Maps/EventEmitters that never see each other's
// writes. Stashing on `globalThis` guarantees every evaluation of this module reuses the same
// instance, the standard workaround for this class of Next.js dev-mode singleton bug (same
// pattern commonly used for Prisma/DB clients). Harmless in production, where there's only ever
// one instantiation anyway.
const globalForLiveSessions = globalThis as unknown as {
  __stitchLiveSessions?: Map<string, LiveSession>
  __stitchLiveSessionEvents?: EventEmitter
}

const sessions = globalForLiveSessions.__stitchLiveSessions ?? new Map<string, LiveSession>()
globalForLiveSessions.__stitchLiveSessions = sessions

/** Single event name ("event"), payload carries its own `type` — simplest possible bus for a
 * handful of SSE listeners; no need for per-event-type EventEmitter events here. */
export const liveSessionEvents = globalForLiveSessions.__stitchLiveSessionEvents ?? new EventEmitter()
globalForLiveSessions.__stitchLiveSessionEvents = liveSessionEvents
liveSessionEvents.setMaxListeners(50)

function touch(session: LiveSession) {
  session.updatedAt = Date.now()
}

function requireSession(id: string): LiveSession {
  const session = sessions.get(id)
  if (!session) throw new Error(`Live session "${id}" not found (it may have ended or expired).`)
  return session
}

export function createSession(name: string, baseUrl: string): LiveSession {
  const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const session: LiveSession = {
    id,
    name,
    baseUrl,
    items: [],
    status: "building",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  sessions.set(id, session)
  liveSessionEvents.emit("event", { type: "session-created", sessionId: id, name, baseUrl })
  return session
}

export function getSession(id: string): LiveSession | undefined {
  return sessions.get(id)
}

/** Used to snapshot current state to a newly-connected SSE client — without this, a browser
 * that (re)connects mid-session sees nothing until the next mutation. */
export function listSessions(): LiveSession[] {
  return [...sessions.values()]
}

export function addStep(sessionId: string, blockId: string, parameters: Record<string, string> = {}): WorkflowItem {
  const session = requireSession(sessionId)
  if (session.status === "idle") {
    throw new Error(`Live session "${sessionId}" has already ended — start a new session to add more steps.`)
  }
  const block = uiBlocks.find((b) => b.id === blockId)
  if (!block) throw new Error(`Unknown block id: ${blockId}`)

  const item: WorkflowItem = {
    id: `${blockId}-${Date.now()}-${session.items.length}`,
    blockId,
    block,
    parameters,
  }
  session.items.push(item)
  touch(session)
  liveSessionEvents.emit("event", { type: "step-added", sessionId, item })
  return item
}

export function setSessionStatus(sessionId: string, status: LiveSessionStatus): void {
  const session = requireSession(sessionId)
  session.status = status
  touch(session)
  liveSessionEvents.emit("event", { type: "session-status", sessionId, status })
}

export function updateStepStatus(
  sessionId: string,
  itemId: string,
  patch: Partial<Pick<WorkflowItem, "executionStatus" | "executionError" | "executionDuration">>,
): void {
  const session = sessions.get(sessionId)
  if (!session) return
  const item = session.items.find((i) => i.id === itemId)
  if (!item) return
  Object.assign(item, patch)
  touch(session)
  liveSessionEvents.emit("event", { type: "step-status", sessionId, itemId, patch })
}

export function endSession(sessionId: string): LiveSession {
  const session = requireSession(sessionId)
  session.status = "idle"
  touch(session)
  liveSessionEvents.emit("event", { type: "session-ended", sessionId })
  return session
}

export function toWorkflow(session: LiveSession): Workflow {
  return {
    id: session.id,
    name: session.name,
    items: session.items,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
  }
}

/** Safety net, not a feature: evict sessions nobody has touched in 4h so this Map can't grow
 * unbounded on a long-running server. `.unref()` so this timer never keeps the process alive. */
const TTL_MS = 4 * 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 30 * 60 * 1000
const sweepTimer = setInterval(() => {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > TTL_MS) sessions.delete(id)
  }
}, SWEEP_INTERVAL_MS)
sweepTimer.unref?.()
