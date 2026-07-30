// popup.js

const dot = document.getElementById("dot")
const statusText = document.getElementById("status-text")
const hint = document.getElementById("hint")
const tabPickerArea = document.getElementById("tab-picker-area")
const urlInput = document.getElementById("stitch-url-input")
const saveBtn = document.getElementById("save-url-btn")
const savedHint = document.getElementById("saved-hint")

const DEFAULT_URL = "http://localhost:3000"

// Guard: if any element is missing the HTML is stale – reload the popup
if (!urlInput || !saveBtn || !dot || !statusText) {
  location.reload()
}

// Load saved URL into input
chrome.storage.sync.get(["stitchUrl"], (data) => {
  if (urlInput) urlInput.value = data.stitchUrl || DEFAULT_URL
})

// Save URL on button click
if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    const url = (urlInput ? urlInput.value : "").trim()
    if (!url) return
    chrome.storage.sync.set({ stitchUrl: url }, () => {
      if (savedHint) {
        savedHint.style.display = "block"
        setTimeout(() => { savedHint.style.display = "none" }, 2000)
      }
    })
  })
}

// Save on Enter
if (urlInput) {
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && saveBtn) saveBtn.click()
  })
}

// Check connection status
chrome.storage.sync.get(["stitchUrl"], (data) => {
  const stitchUrl = data.stitchUrl || DEFAULT_URL

  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    let stitchOrigin = null
    try { stitchOrigin = new URL(stitchUrl).origin } catch {}

    const stitchTab = stitchOrigin
      ? tabs.find(t => { try { return new URL(t.url).origin === stitchOrigin } catch { return false } })
      : null

    if (dot && statusText) {
      if (stitchTab) {
        dot.className = "dot connected"
        statusText.textContent = "Stitch is connected"
        if (hint) hint.textContent = "Click 🎯 in a selector field to pick an element."
      } else {
        dot.className = "dot disconnected"
        statusText.textContent = "Stitch not open"
        if (hint) hint.textContent = `Open Stitch at ${stitchUrl} first, then reload this popup.`
      }
    }

    // Check for pending tab selection
    chrome.storage.session.get(["pendingPick", "appTabs"], (sessionData) => {
      if (!tabPickerArea || !sessionData.pendingPick || !sessionData.appTabs?.length) return

      if (statusText) statusText.textContent = "Which tab is your app?"
      if (hint) hint.textContent = ""
      tabPickerArea.innerHTML = ""

      const pickTitle = document.createElement("p")
      pickTitle.className = "pick-title"
      pickTitle.textContent = "Select the tab to pick from:"
      tabPickerArea.appendChild(pickTitle)

      const tabList = document.createElement("div")
      tabList.className = "tab-list"

      sessionData.appTabs.forEach(tab => {
        const item = document.createElement("div")
        item.className = "tab-item"

        const img = document.createElement("img")
        img.className = "tab-favicon"
        img.src = tab.favIconUrl || ""
        img.addEventListener("error", () => { img.style.display = "none" })

        const info = document.createElement("div")
        info.className = "tab-info"

        const titleEl = document.createElement("div")
        titleEl.className = "tab-title"
        titleEl.textContent = tab.title || "Untitled"

        const urlEl = document.createElement("div")
        urlEl.className = "tab-url"
        urlEl.textContent = tab.url || ""

        info.appendChild(titleEl)
        info.appendChild(urlEl)
        item.appendChild(img)
        item.appendChild(info)

        item.addEventListener("click", () => {
          chrome.runtime.sendMessage({ type: "TAB_SELECTED", tabId: tab.id })
          window.close()
        })

        tabList.appendChild(item)
      })

      tabPickerArea.appendChild(tabList)
    })
  })
})
