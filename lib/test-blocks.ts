// Facade over the single source of truth in lib/blocks/registry.ts.
// Kept as a separate module so existing imports of `testBlocks` don't need to change.
export { uiBlocks as testBlocks } from "./blocks/registry"
