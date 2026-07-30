// stitch-bridge.js
// Injected into the Stitch tab (localhost:3000)

;(function () {
  if (window.__stitchBridgeInjected) return
  window.__stitchBridgeInjected = true

  function safeSend(msg, callback) {
    try {
      if (callback) {
        chrome.runtime.sendMessage(msg, callback)
      } else {
        chrome.runtime.sendMessage(msg)
      }
    } catch (e) {
      // Extension context invalidated – page needs reload
      if (e.message?.includes("Extension context invalidated")) {
        window.__stitchBridgeInjected = false
        showReloadHint()
      }
    }
  }

  function showReloadHint() {
    // Only show once
    if (document.getElementById("__stitch-reload-hint")) return
    const hint = document.createElement("div")
    hint.id = "__stitch-reload-hint"
    hint.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:9999;background:#1e40af;color:white;padding:10px 14px;border-radius:8px;font-size:13px;font-family:sans-serif;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3)"
    hint.textContent = "🔌 Stitch extension reloaded – click to refresh"
    hint.onclick = () => window.location.reload()
    document.body.appendChild(hint)
  }

  // Register this tab as Stitch
  safeSend({ type: "STITCH_REGISTER" })

  // Stitch → Extension
  window.addEventListener("message", (event) => {
    if (event.source !== window) return
    if (event.origin !== window.location.origin) return
    const msg = event.data

    if (msg?.type === "STITCH_EXTENSION_PING") {
      window.postMessage({ type: "STITCH_EXTENSION_PONG" }, window.location.origin)
      return
    }

    if (msg?.type === "STITCH_START_PICK") {
      safeSend(
        { type: "START_PICKING", paramId: msg.paramId, fieldLabel: msg.fieldLabel, baseUrl: msg.baseUrl },
        (response) => {
          if (chrome.runtime.lastError || !response?.ok) {
            window.postMessage({
              type: "PICK_ERROR",
              paramId: msg.paramId,
              error: response?.error || chrome.runtime.lastError?.message || "Extension error",
            }, window.location.origin)
          }
        }
      )
      return
    }

    if (msg?.type === "STITCH_CANCEL_PICK") {
      safeSend({ type: "CANCEL_PICKER", paramId: msg.paramId })
      return
    }

    if (msg?.type === "STITCH_VALIDATE_SELECTOR") {
      safeSend(
        { type: "VALIDATE_SELECTOR", selector: msg.selector, baseUrl: msg.baseUrl },
        (response) => {
          window.postMessage({
            type: "VALIDATE_SELECTOR_RESULT",
            requestId: msg.requestId,
            count: response?.count ?? 0,
            error: chrome.runtime.lastError?.message || response?.error,
          }, window.location.origin)
        }
      )
      return
    }
  })

  // Extension → Stitch
  chrome.runtime.onMessage.addListener((msg) => {
    if (["SELECTOR_PICKED", "PICK_CANCELLED", "PICK_ERROR"].includes(msg.type)) {
      window.postMessage(msg, window.location.origin)
    }
  })
})()
