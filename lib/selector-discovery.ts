/**
 * Server-side port of extension/content.js's `generateSelector` for the `inspect_page` MCP tool.
 * Deliberately a separate copy, not a shared module: the extension is a raw content script loaded
 * outside the Next.js/TS build and can't import from here, and this runs inside page.evaluate()
 * (browser context, not Node) so it can't import from there either. Kept in the same priority
 * order — data-testid family → stable id → aria-label → name/type/placeholder → button/link text
 * → role → filtered class → nth-of-type fallback — so a human picking elements in the extension
 * and an agent inspecting via MCP land on the same selector for the same element.
 */
import type { Page } from "playwright"

export interface DiscoveredElement {
  selector: string
  kind: "button" | "link" | "input" | "other"
  text: string
}

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="tab"]'

const MAX_ELEMENTS = 50

export async function discoverSelectors(page: Page): Promise<DiscoveredElement[]> {
  return page.evaluate(
    ({ interactiveSelector, max }) => {
      function isAutoId(id: string) {
        return /^\d|[0-9a-f]{7,}|^(ember|react-|ng-|mat-|v-|__|:)/i.test(id)
      }

      function isMeaningfulClass(cls: string) {
        if (cls.length > 50) return false
        if (/^(hover|focus|active|disabled|selected|open|closed|is-|has-|js-)/.test(cls)) return false
        if (/[0-9a-f]{5,}/i.test(cls)) return false
        if (/^[a-z]{1,2}-/.test(cls)) return false
        if (/^\w+_\w+__\w+$/.test(cls)) return false
        return true
      }

      function getVisibleText(el: Element) {
        return ((el as HTMLElement).innerText || el.textContent || "").trim().replace(/\s+/g, " ")
      }

      // Full innerText often includes decorative content bolted onto a button's label — a
      // keyboard-shortcut hint ("Add block ⌘K") or a live count badge ("Library 97") — that
      // isn't part of the stable label and can also change over time (block count grows),
      // breaking any selector that embeds it. Walk the element's own text nodes and skip <kbd>
      // subtrees and numeric-only leaf nodes (badges) so the selector text is just the label.
      function getPrimaryText(el: Element): string {
        const parts: string[] = []
        function walk(node: Node) {
          if (node.nodeType === Node.TEXT_NODE) {
            parts.push(node.textContent || "")
            return
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return
          const element = node as Element
          if (element.tagName === "KBD") return
          const ownText = (element.textContent || "").trim()
          if (element.children.length === 0 && /^\d+$/.test(ownText)) return
          for (const child of Array.from(element.childNodes)) walk(child)
        }
        for (const child of Array.from(el.childNodes)) walk(child)
        return parts.join(" ").trim().replace(/\s+/g, " ")
      }

      function safeCount(selector: string) {
        try {
          return document.querySelectorAll(selector).length
        } catch {
          return 0
        }
      }

      function escAttr(s: string) {
        return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      }

      function getSmartPath(el: Element): string {
        const path: string[] = []
        let current: Element | null = el
        let depth = 0

        while (current && current !== document.body && depth < 4) {
          const currentId = (current as HTMLElement).id
          if (currentId && !isAutoId(currentId)) {
            path.unshift(`#${CSS.escape(currentId)}`)
            break
          }

          let found = false
          for (const attr of ["data-testid", "data-test", "data-cy"]) {
            const v = current.getAttribute(attr)
            if (v) {
              path.unshift(`[${attr}="${escAttr(v)}"]`)
              found = true
              break
            }
          }
          if (found) break

          let seg = current.tagName.toLowerCase()
          const sc = Array.from(current.classList).filter(isMeaningfulClass).slice(0, 1)
          if (sc.length) seg += `.${sc[0]}`

          const parent = current.parentNode
          const siblings = parent ? Array.from(parent.children).filter((s) => s.tagName === current!.tagName) : []
          if (siblings.length > 1) {
            seg += `:nth-of-type(${siblings.indexOf(current) + 1})`
          }

          path.unshift(seg)
          current = current.parentElement
          depth++
        }

        return path.join(" > ")
      }

      function generateSelector(el: Element): string {
        const testAttrs = ["data-testid", "data-test", "data-cy", "data-e2e", "data-qa", "data-id"]
        for (const attr of testAttrs) {
          const val = el.getAttribute(attr)
          if (val) return `[${attr}="${escAttr(val)}"]`
        }

        const id = (el as HTMLElement).id
        if (id && !isAutoId(id)) return `#${CSS.escape(id)}`

        const ariaLabel = el.getAttribute("aria-label")
        if (ariaLabel) {
          const sel = `[aria-label="${escAttr(ariaLabel)}"]`
          if (safeCount(sel) === 1) return sel
          return el.tagName.toLowerCase() + sel
        }

        // Icon-only buttons (undo/redo, collapse, settings gear) rarely have aria-label but
        // often already carry a tooltip `title` — much more stable than falling through to a
        // deep nth-of-type structural path.
        const titleAttr = el.getAttribute("title")
        if (titleAttr) {
          const sel = `[title="${escAttr(titleAttr)}"]`
          if (safeCount(sel) === 1) return sel
          return el.tagName.toLowerCase() + sel
        }

        const name = (el as HTMLInputElement).name
        if (name && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName)) {
          const tag = el.tagName.toLowerCase()
          let nameSel = `${tag}[name="${escAttr(name)}"]`
          const type = (el as HTMLInputElement).type
          if (safeCount(nameSel) > 1 && type) {
            nameSel = `${tag}[name="${escAttr(name)}"][type="${type}"]`
          }
          return nameSel
        }

        const placeholder = (el as HTMLInputElement).placeholder
        if (placeholder) {
          const phSel = `[placeholder="${escAttr(placeholder)}"]`
          if (safeCount(phSel) === 1) return phSel
        }

        if (el.tagName === "INPUT") {
          const type = (el as HTMLInputElement).type
          if (["email", "tel", "search", "url", "date", "file", "password"].includes(type)) {
            const typeSel = `input[type="${type}"]`
            if (safeCount(typeSel) === 1) return typeSel
          }
        }

        if (["BUTTON", "A", "LABEL"].includes(el.tagName)) {
          const text = getPrimaryText(el)
          if (text && text.length <= 50) {
            const ltag = el.tagName.toLowerCase()
            const matches = Array.from(document.querySelectorAll(ltag)).filter((e) => getPrimaryText(e) === text)
            if (matches.length === 1) return `${ltag}:has-text("${text}")`
          }
        }

        if (/^H[1-6]$/.test(el.tagName)) {
          const htext = getVisibleText(el)
          if (htext && htext.length <= 60) {
            const htag = el.tagName.toLowerCase()
            const hsel = `${htag}:has-text("${htext}")`
            if (safeCount(hsel) === 1) return hsel
          }
        }

        const role = el.getAttribute("role")
        if (role && role !== "presentation" && role !== "none") {
          const rsel = `[role="${role}"]`
          if (safeCount(rsel) === 1) return rsel
          const rtext = getPrimaryText(el)
          if (rtext && rtext.length <= 40) return `${rsel}:has-text("${rtext}")`
        }

        const stableClasses = Array.from(el.classList).filter(isMeaningfulClass)
        if (stableClasses.length > 0) {
          const ctag = el.tagName.toLowerCase()
          for (let ci = 1; ci <= Math.min(stableClasses.length, 2); ci++) {
            const csel = `${ctag}.${stableClasses.slice(0, ci).join(".")}`
            if (safeCount(csel) === 1) return csel
          }
        }

        return getSmartPath(el)
      }

      function classify(el: Element): "button" | "link" | "input" | "other" {
        const role = el.getAttribute("role")
        if (el.tagName === "BUTTON" || role === "button") return "button"
        if (el.tagName === "A" || role === "link") return "link"
        if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return "input"
        return "other"
      }

      return Array.from(document.querySelectorAll(interactiveSelector))
        .filter((el) => {
          const rect = el.getBoundingClientRect()
          const style = window.getComputedStyle(el)
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"
        })
        .slice(0, max)
        .map((el) => ({
          selector: generateSelector(el),
          kind: classify(el),
          text: getVisibleText(el).slice(0, 60),
        }))
    },
    { interactiveSelector: INTERACTIVE_SELECTOR, max: MAX_ELEMENTS },
  )
}
