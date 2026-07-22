import fs from 'node:fs'
import { PNG } from 'pngjs'

export function avgColorOfPng(path) {
  const buf = fs.readFileSync(path)
  const png = PNG.sync.read(buf)
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < png.data.length; i += 4) {
    r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n++
  }
  return [r / n, g / n, b / n]
}

/** For a text node matching `needle` (substring by default), returns rect +
 *  own color/opacity + the FULL ancestor opacity chain product (the exact
 *  compounding check the task calls out — a parent `opacity` can silently
 *  multiply onto an already-alpha'd child color). */
export async function findWithAncestorOpacity(page, needle, { exact = false, scopeSelector = null } = {}) {
  return page.evaluate((needle, exact, scopeSelector) => {
    const root = scopeSelector ? document.querySelector(scopeSelector) : document.body
    if (!root) return []
    const out = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const trimmed = (node.textContent || '').trim()
      if (!trimmed) continue
      const match = exact ? trimmed === needle : trimmed.includes(needle)
      if (!match) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const r = [...range.getClientRects()].find((rr) => rr.width > 0 && rr.height > 0)
      if (!r) continue
      const el = node.parentElement
      const cs = getComputedStyle(el)
      // Walk every ancestor up to (excluding) document, multiplying `opacity`.
      let anc = el
      let product = 1
      const chain = []
      while (anc && anc !== document.documentElement) {
        const op = parseFloat(getComputedStyle(anc).opacity)
        if (!Number.isNaN(op)) {
          product *= op
          if (op < 1) chain.push({ tag: anc.tagName, cls: anc.className?.toString().slice(0, 40), opacity: op })
        }
        anc = anc.parentElement
      }
      out.push({
        text: trimmed.slice(0, 80),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        ownColor: cs.color,
        ownOpacityCss: cs.opacity,
        ancestorOpacityProduct: product,
        ancestorOpacityChain: chain,
      })
    }
    return out
  }, needle, exact, scopeSelector)
}

/** Screenshot a small guaranteed-background-only patch immediately ABOVE (or
 *  BELOW if `below`) the text rect, same horizontal center, so it samples the
 *  real composited background pixels the text sits on without any glyph
 *  contamination. */
export async function sampleBgPatch(page, rect, outPath, { below = false, gap = 2, size = 10 } = {}) {
  const cx = rect.x + rect.w / 2
  const y = below ? rect.y + rect.h + gap : rect.y - gap - size
  const clip = { x: Math.max(0, Math.round(cx - size / 2)), y: Math.max(0, Math.round(y)), width: size, height: size }
  await page.screenshot({ path: outPath, clip })
  return clip
}

export function parseCssColor(str) {
  // "rgb(r, g, b)" or "rgba(r, g, b, a)"
  const m = str.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()))
  const [r, g, b, a] = parts
  return { r, g, b, a: a === undefined ? 1 : a }
}

function relLum([r, g, b]) {
  const f = (c) => {
    const cs = c / 255
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export function contrastRgb(c1, c2) {
  const L1 = relLum(c1)
  const L2 = relLum(c2)
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (hi + 0.05) / (lo + 0.05)
}

/** Composite fg (rgb + total alpha) OVER bg (opaque rgb). */
export function compositeOver(fgRgb, alpha, bgRgb) {
  return [0, 1, 2].map((i) => fgRgb[i] * alpha + bgRgb[i] * (1 - alpha))
}
