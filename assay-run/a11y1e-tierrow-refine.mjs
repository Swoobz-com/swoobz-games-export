import { launch, wait, reachPlanning } from './_a11yHelpers.mjs'
import { parseCssColor, contrastRgb, compositeOver, avgColorOfPng } from './_a11yContrastCore.mjs'
import fs from 'node:fs'

const OUT = 'shots-a11y-final-0707/contrast2-desktop-1440x900'
fs.mkdirSync(OUT, { recursive: true })

async function main() {
  const { browser, page } = await launch({ width: 1440, height: 900 })
  await reachPlanning(page)
  await wait(200)

  const rows = []
  for (const tier of ['REEF SHELF', 'MIDNIGHT ZONE', 'HADAL TRENCH']) {
    const info = await page.evaluate((tierLabel) => {
      const buttons = [...document.querySelectorAll('button')]
      const btn = buttons.find((b) => b.textContent && b.textContent.includes(tierLabel))
      if (!btn) return null
      const btnRect = btn.getBoundingClientRect()
      // Find the "cracked ducats" text node (row 2).
      const walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT)
      let node, target = null
      while ((node = walker.nextNode())) {
        if (node.textContent.includes('cracked ducats')) { target = node; break }
      }
      if (!target) return null
      const range = document.createRange()
      range.selectNodeContents(target)
      const r = [...range.getClientRects()].find((rr) => rr.width > 0 && rr.height > 0)
      const cs = getComputedStyle(target.parentElement)
      return {
        text: target.textContent.trim(),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        btnRect: { left: btnRect.left, right: btnRect.right, top: btnRect.top, bottom: btnRect.bottom },
        color: cs.color,
        opacity: cs.opacity,
      }
    }, tier)
    if (!info) continue
    // Sample background at the SAME y-center as the text, at x = btnRect.right - 6
    // (background-only column, past all row-2 text, still inside the button — the
    // active row's fill is a pure VERTICAL gradient per source, so same-Y sampling
    // anywhere horizontally is exact, unlike an above/below sample which can cross
    // the button's own padding/border near a bottom-row text line).
    const cy = info.rect.y + info.rect.h / 2
    const sampleX = info.btnRect.right - 6
    const patchPath = `${OUT}/bgpatch-tierrow-${tier.replace(/\s+/g, '_')}-rightcol.png`
    await page.screenshot({ path: patchPath, clip: { x: Math.round(sampleX - 4), y: Math.round(cy - 4), width: 8, height: 8 } })
    const bg = avgColorOfPng(patchPath)
    const fg = parseCssColor(info.color) || { r: 255, g: 255, b: 255, a: 1 }
    const alpha = fg.a * parseFloat(info.opacity)
    const eff = alpha < 1 ? compositeOver([fg.r, fg.g, fg.b], alpha, bg) : [fg.r, fg.g, fg.b]
    const ratio = contrastRgb(eff, bg)
    rows.push({ tier, text: info.text, color: info.color, alpha, bg: bg.map(Math.round), eff: eff.map(Math.round), contrast: Math.round(ratio * 100) / 100 })
  }
  fs.writeFileSync(`${OUT}/tierrow-refined.json`, JSON.stringify(rows, null, 2))
  console.table(rows)
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
