/**
 * Facade over the single source of truth in lib/blocks/. Kept so existing imports
 * of blockRegistry / BlockParameters / validateParameters / executeCustomBlock
 * (TestRunner, scripts) don't need to change.
 */
export type { BlockParameters, BlockFunction } from "@/lib/blocks/types"
export { validateParameters } from "@/lib/blocks/types"
export { executionRegistry as blockRegistry } from "@/lib/blocks/registry"
export { executeCustomBlock } from "./custom-executor"
