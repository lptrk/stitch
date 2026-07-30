// background.js – Service Worker (MV3)

let stitchTabId = null
let pickingTabId = null

const DEFAULT_STITCH_URL = "http://localhost:3000"

// Load stitchTabId and URL after service worker restart
chrome.storage.session.get(["stitchTabId"], (data) => {
  if (data.stitchTabId) stitchTabId = data.stitchTabId
})

function getStitchUrl(cb) {
  chrome.storage.sync.get(["stitchUrl"], (data) => {
    cb(data.stitchUrl || DEFAULT_STITCH_URL)
  })
}

function isStitchTab(url, stitchUrl) {
  if (!url) return false
  try {
    const stitchOrigin = new URL(stitchUrl).origin
    return new URL(url).origin === stitchOrigin
  } catch {
    return false
  }
}

// Dynamically inject stitch-bridge into the Stitch tab when it loads
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== "complete" || !tab.url) return
  getStitchUrl((stitchUrl) => {
    if (!isStitchTab(tab.url, stitchUrl)) return
    stitchTabId = tabId
    chrome.storage.session.set({ stitchTabId })
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["stitch-bridge.js"],
    }).catch(() => {})
  })
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "STITCH_REGISTER") {
    stitchTabId = sender.tab?.id ?? null
    chrome.storage.session.set({ stitchTabId })
    sendResponse({ ok: true })
    return
  }

  if (msg.type === "START_PICKING") {
    const { paramId, fieldLabel, baseUrl } = msg

    chrome.tabs.query({ currentWindow: true }, (allTabs) => {
      getStitchUrl((stitchUrl) => {
        const appTabs = allTabs.filter(t =>
          t.id !== stitchTabId &&
          t.url &&
          !t.url.startsWith("chrome") &&
          !t.url.startsWith("about") &&
          !t.url.startsWith("edge") &&
          !t.url.startsWith("devtools") &&
          !isStitchTab(t.url, stitchUrl)
        )

        let matchingTab = null
        if (baseUrl) {
          try {
            const base = new URL(baseUrl).origin
            matchingTab = appTabs.find(t => {
              try { return new URL(t.url).origin === base } catch { return false }
            })
          } catch {}
        }

        if (matchingTab) {
          activatePickerInTab(matchingTab.id, paramId, fieldLabel, sendResponse)
        } else if (appTabs.length === 1) {
          activatePickerInTab(appTabs[0].id, paramId, fieldLabel, sendResponse)
        } else if (appTabs.length === 0 && baseUrl) {
          chrome.tabs.create({ url: baseUrl, active: true }, (newTab) => {
            pickingTabId = newTab.id
            const listener = (tabId, info) => {
              if (tabId === newTab.id && info.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener)
                setTimeout(() => activatePickerInTab(newTab.id, paramId, fieldLabel, sendResponse), 300)
              }
            }
            chrome.tabs.onUpdated.addListener(listener)
          })
        } else {
          chrome.storage.session.set({
            pendingPick: { paramId, fieldLabel },
            appTabs: appTabs.map(t => ({ id: t.id, title: t.title, url: t.url, favIconUrl: t.favIconUrl }))
          })
          chrome.action.openPopup()
          sendResponse({ ok: true, needsTabSelection: true })
        }
      })
    })

    return true
  }

  if (msg.type === "TAB_SELECTED") {
    chrome.storage.session.get(["pendingPick"], (data) => {
      if (data.pendingPick) {
        activatePickerInTab(msg.tabId, data.pendingPick.paramId, data.pendingPick.fieldLabel, () => {})
        chrome.storage.session.remove(["pendingPick", "appTabs"])
      }
    })
    sendResponse({ ok: true })
    return
  }

  if (msg.type === "SELECTOR_PICKED") {
    const sendToStitch = (tabId) => {
      chrome.tabs.sendMessage(tabId, {
        type: "SELECTOR_PICKED",
        paramId: msg.paramId,
        selector: msg.selector,
        selectorInfo: msg.selectorInfo,
      }).catch(() => {})
      chrome.tabs.update(tabId, { active: true })
    }

    if (stitchTabId) {
      sendToStitch(stitchTabId)
    } else {
      // Fallback: find Stitch tab by configured URL
      getStitchUrl((stitchUrl) => {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          const stitch = tabs.find(t => isStitchTab(t.url, stitchUrl))
          if (stitch) sendToStitch(stitch.id)
        })
      })
    }
    sendResponse({ ok: true })
    return
  }

  if (msg.type === "PICK_CANCELLED") {
    if (stitchTabId) {
      chrome.tabs.sendMessage(stitchTabId, { type: "PICK_CANCELLED", paramId: msg.paramId })
    }
    sendResponse({ ok: true })
    return
  }

  if (msg.type === "VALIDATE_SELECTOR") {
    const targetId = msg.tabId || pickingTabId
    if (!targetId) { sendResponse({ count: 0, error: "No target tab" }); return }
    chrome.tabs.sendMessage(targetId, { type: "VALIDATE_SELECTOR", selector: msg.selector })
      .then(r => sendResponse(r))
      .catch(e => sendResponse({ count: 0, error: e.message }))
    return true
  }
})

function activatePickerInTab(tabId, paramId, fieldLabel, sendResponse) {
  pickingTabId = tabId
  chrome.tabs.update(tabId, { active: true }, () => {
    chrome.scripting.executeScript(
      { target: { tabId }, files: ["content.js"] },
      () => {
        chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] }, () => {})
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { type: "ACTIVATE_PICKER", paramId, fieldLabel })
            .then(() => sendResponse({ ok: true }))
            .catch(() => {
              if (stitchTabId) {
                chrome.tabs.sendMessage(stitchTabId, {
                  type: "PICK_ERROR", paramId,
                  error: "Could not activate picker. Try refreshing the app tab."
                })
              }
              sendResponse({ ok: false })
            })
        }, 200)
      }
    )
  })
}
