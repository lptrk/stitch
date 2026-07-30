// content.js – runs in the target app tab

;(function () {
  if (window.__stitchPickerInjected) return
  window.__stitchPickerInjected = true

  let picking = false
  let currentParamId = null
  let highlighted = null
  let overlay = null
  let tooltip = null

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "ACTIVATE_PICKER") {
      startPicking(msg.paramId, msg.fieldLabel)
      sendResponse({ ok: true })
      return
    }
    if (msg.type === "VALIDATE_SELECTOR") {
      try {
        const count = document.querySelectorAll(msg.selector).length
        const firstEl = document.querySelector(msg.selector)
        sendResponse({ count, info: firstEl ? getElementInfo(firstEl) : null })
      } catch (e) {
        sendResponse({ count: 0, error: e.message })
      }
      return
    }
    if (msg.type === "CANCEL_PICKER") {
      cancelPicking()
      sendResponse({ ok: true })
      return
    }
  })

  function startPicking(paramId, fieldLabel) {
    picking = true
    currentParamId = paramId

    overlay = document.createElement("div")
    overlay.id = "__stitch-overlay"
    overlay.innerHTML = '<div style="display:flex;align-items:center;gap:12px;">'
      + '<div style="width:8px;height:8px;background:#60a5fa;border-radius:50%;animation:stitch-pulse 1s infinite;"></div>'
      + '<span>Stitch Picker active' + (fieldLabel ? ' – picking <strong>' + fieldLabel + '</strong>' : '') + '</span>'
      + '<button id="__stitch-cancel" style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;color:white;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Cancel (Esc)</button>'
      + '</div>'
    document.body.appendChild(overlay)
    document.getElementById("__stitch-cancel").addEventListener("click", cancelPicking)

    tooltip = document.createElement("div")
    tooltip.id = "__stitch-tooltip"
    document.body.appendChild(tooltip)

    document.addEventListener("mouseover", onHover, true)
    document.addEventListener("mouseout", onMouseOut, true)
    document.addEventListener("pointerdown", onClick, true)
    document.addEventListener("keydown", onKeyDown, true)
  }

  function onHover(e) {
    if (!picking) return
    if (overlay && (e.target === overlay || overlay.contains(e.target))) return

    if (highlighted && highlighted !== e.target) {
      highlighted.style.outline = highlighted.__stitchOrig || ""
      highlighted.style.outlineOffset = highlighted.__stitchOrigOff || ""
    }

    highlighted = e.target
    highlighted.__stitchOrig = highlighted.style.outline
    highlighted.__stitchOrigOff = highlighted.style.outlineOffset
    highlighted.style.outline = "2px solid #2563eb"
    highlighted.style.outlineOffset = "2px"

    const selector = generateSelector(e.target)
    const count = safeCount(selector)
    const info = getElementInfo(e.target)

    tooltip.style.display = "block"
    const color = count === 1 ? "#4ade80" : "#fbbf24"
    const match = count === 1 ? "Unique" : (count + " matches")
    tooltip.innerHTML = '<div style="font-family:monospace;font-size:11px;color:#93c5fd;margin-bottom:4px;">' + escHtml(selector) + '</div>'
      + '<div style="font-size:11px;color:' + color + ';">' + match
      + (info.tag ? ' &middot; &lt;' + info.tag + '&gt;' : '')
      + (info.text ? ' &middot; &quot;' + escHtml(info.text.slice(0, 30)) + '&quot;' : '')
      + '</div>'

    const rect = e.target.getBoundingClientRect()
    tooltip.style.top = (rect.bottom + window.scrollY + 6) + "px"
    tooltip.style.left = Math.min(rect.left + window.scrollX, window.innerWidth - 300) + "px"
  }

  function onMouseOut(e) {
    if (!picking) return
    if (tooltip) tooltip.style.display = "none"
  }

  function onClick(e) {
    if (!picking) return
    if (overlay && (e.target === overlay || overlay.contains(e.target))) return

    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()

    document.addEventListener("click", function block(ev) {
      ev.preventDefault()
      ev.stopPropagation()
      ev.stopImmediatePropagation()
      document.removeEventListener("click", block, true)
    }, { capture: true })

    const selector = generateSelector(e.target)
    const count = safeCount(selector)
    const info = getElementInfo(e.target)
    const paramId = currentParamId

    stopPicking()

    chrome.runtime.sendMessage({
      type: "SELECTOR_PICKED",
      paramId,
      selector,
      selectorInfo: { count, ...info },
    })
  }

  function onKeyDown(e) {
    if (e.key === "Escape") cancelPicking()
  }

  function cancelPicking() {
    const paramId = currentParamId
    stopPicking()
    chrome.runtime.sendMessage({ type: "PICK_CANCELLED", paramId })
  }

  function stopPicking() {
    picking = false
    currentParamId = null

    if (highlighted) {
      highlighted.style.outline = highlighted.__stitchOrig || ""
      highlighted.style.outlineOffset = highlighted.__stitchOrigOff || ""
      highlighted = null
    }
    if (overlay) { overlay.remove(); overlay = null }
    if (tooltip) { tooltip.remove(); tooltip = null }

    document.removeEventListener("mouseover", onHover, true)
    document.removeEventListener("mouseout", onMouseOut, true)
    document.removeEventListener("pointerdown", onClick, true)
    document.removeEventListener("keydown", onKeyDown, true)
  }

  // ── Selector generation ──────────────────────────────────────────────────────

  function generateSelector(el) {
    // 1. data-testid / data-test / data-cy / data-qa
    var testAttrs = ["data-testid", "data-test", "data-cy", "data-e2e", "data-qa", "data-id"]
    for (var i = 0; i < testAttrs.length; i++) {
      var val = el.getAttribute(testAttrs[i])
      if (val) return "[" + testAttrs[i] + '="' + escAttr(val) + '"]'
    }

    // 2. Non-auto ID
    if (el.id && !isAutoId(el.id)) return "#" + CSS.escape(el.id)

    // 3. aria-label
    var ariaLabel = el.getAttribute("aria-label")
    if (ariaLabel) {
      var sel = '[aria-label="' + escAttr(ariaLabel) + '"]'
      if (safeCount(sel) === 1) return sel
      return el.tagName.toLowerCase() + sel
    }

    // 4. name on form elements
    if (el.name && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName)) {
      var tag = el.tagName.toLowerCase()
      var nameSel = tag + '[name="' + escAttr(el.name) + '"]'
      // Add type to disambiguate if needed
      if (safeCount(nameSel) > 1 && el.type) {
        nameSel = tag + '[name="' + escAttr(el.name) + '"][type="' + el.type + '"]'
      }
      return nameSel
    }

    // 5. placeholder
    if (el.placeholder) {
      var phSel = '[placeholder="' + escAttr(el.placeholder) + '"]'
      if (safeCount(phSel) === 1) return phSel
    }

    // 6. input type (unique types)
    if (el.tagName === "INPUT" && ["email", "tel", "search", "url", "date", "file", "password"].includes(el.type)) {
      var typeSel = 'input[type="' + el.type + '"]'
      if (safeCount(typeSel) === 1) return typeSel
    }

    // 7. Button/link with unique visible text
    if (["BUTTON", "A", "LABEL"].includes(el.tagName)) {
      var text = getVisibleText(el)
      if (text && text.length <= 50) {
        var ltag = el.tagName.toLowerCase()
        var matches = Array.from(document.querySelectorAll(ltag)).filter(function(e) {
          return getVisibleText(e) === text
        })
        if (matches.length === 1) return ltag + ':has-text("' + text + '")'
      }
    }

    // 8. Heading with unique text
    if (/^H[1-6]$/.test(el.tagName)) {
      var htext = getVisibleText(el)
      if (htext && htext.length <= 60) {
        var htag = el.tagName.toLowerCase()
        var hsel = htag + ':has-text("' + htext + '")'
        if (safeCount(hsel) === 1) return hsel
      }
    }

    // 9. role
    var role = el.getAttribute("role")
    if (role && role !== "presentation" && role !== "none") {
      var rsel = '[role="' + role + '"]'
      if (safeCount(rsel) === 1) return rsel
      var rtext = getVisibleText(el)
      if (rtext && rtext.length <= 40) return rsel + ':has-text("' + rtext + '")'
    }

    // 10. Stable classes (non-dynamic, non-utility)
    var stableClasses = Array.from(el.classList).filter(isDomeaningfulClass)
    if (stableClasses.length > 0) {
      var ctag = el.tagName.toLowerCase()
      for (var ci = 1; ci <= Math.min(stableClasses.length, 2); ci++) {
        var csel = ctag + "." + stableClasses.slice(0, ci).join(".")
        if (safeCount(csel) === 1) return csel
      }
    }

    // 11. Smart path with stable ancestor
    return getSmartPath(el)
  }

  function isAutoId(id) {
    return /^\d|[0-9a-f]{7,}|^(ember|react-|ng-|mat-|v-|__|\:)/i.test(id)
  }

  function isDomeaningfulClass(cls) {
    // Filter out Tailwind, CSS modules, hashes, state classes
    if (cls.length > 50) return false
    if (/^(hover|focus|active|disabled|selected|open|closed|is-|has-|js-)/.test(cls)) return false
    if (/[0-9a-f]{5,}/i.test(cls)) return false
    if (/^[a-z]{1,2}-/.test(cls)) return false // Tailwind prefixes like sm-, lg-
    if (/^\w+_\w+__\w+$/.test(cls)) return false // CSS modules pattern
    return true
  }

  function getSmartPath(el) {
    var path = []
    var current = el
    var depth = 0

    while (current && current !== document.body && depth < 4) {
      // Stable anchor found
      if (current.id && !isAutoId(current.id)) {
        path.unshift("#" + CSS.escape(current.id))
        break
      }
      var found = false
      var testAttrs2 = ["data-testid", "data-test", "data-cy"]
      for (var j = 0; j < testAttrs2.length; j++) {
        var v = current.getAttribute(testAttrs2[j])
        if (v) { path.unshift('[' + testAttrs2[j] + '="' + escAttr(v) + '"]'); found = true; break }
      }
      if (found) break

      // Build selector for this node
      var seg = current.tagName.toLowerCase()
      var sc = Array.from(current.classList).filter(isDomeaningfulClass).slice(0, 1)
      if (sc.length) seg += "." + sc[0]

      var siblings = current.parentNode
        ? Array.from(current.parentNode.children).filter(function(s) { return s.tagName === current.tagName })
        : []
      if (siblings.length > 1) {
        seg += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")"
      }

      path.unshift(seg)
      current = current.parentElement
      depth++
    }

    return path.join(" > ")
  }

  function getVisibleText(el) {
    return (el.textContent || el.innerText || "").trim().replace(/\s+/g, " ")
  }

  function getElementInfo(el) {
    return {
      tag: el.tagName ? el.tagName.toLowerCase() : null,
      text: getVisibleText(el).slice(0, 60),
      type: el.type || null,
      name: el.name || null,
      placeholder: el.placeholder || null,
      ariaLabel: el.getAttribute("aria-label"),
      testId: el.getAttribute("data-testid") || null,
    }
  }

  function safeCount(selector) {
    try { return document.querySelectorAll(selector).length } catch (e) { return 0 }
  }

  function escAttr(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  }

  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }
})()
