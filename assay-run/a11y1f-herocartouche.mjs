import { launch, wait, reachPlanning, selectTier, paintTilesMouse, commit, pollForPhaseText, clickText } from './_a11yHelpers.mjs'
import { parseCssColor, contrastRgb, compositeOver, avgColorOfPng } from './_a11yContrastCore.mjs'
import fs from 'node:fs'

const OUT = 'shots-a11y-final-0707/contrast2-desktop-1440x900'
fs.mkdirSync(OUT, { recursive: true })

async function main() {
  const { browser, page } = await launch({ width: 1440, height: 900 })
  await reachPlanning(page)
  let settledWin = null
  for (let attempt = 0; attempt < 6; attempt++) {
    await selectTier(page, 'REEF SHELF')
    const base = attempt * 9
    await paintTilesMouse(page, Array.from({ length: 8 }, (_, i) => base + i))
    await wait(150)
    await commit(page)
    settledWin = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 8000)
    await wait(200) // let the hero pop finish mounting
    if (settledWin && /SECURED THE HAUL/i.test(settledWin)) break
    await clickText(page, 'DIVE AGAIN')
    await wait(300)
  }
  await page.screenshot({ path: `${OUT}/herocartouche-full.png` })

  // The HeroPopCallout wrapper is the ONLY `aria-hidden` element containing "SECURED THE HAUL".
  const texts = await page.evaluate(() => {
    const all = [...document.querySelectorAll('[aria-hidden]')]
    const wrapper = all.find((el) => el.getAttribute('aria-hidden') !== null && el.textContent.includes('SECURED THE HAUL') && el.querySelector('svg'))
    if (!wrapper) return { error: 'not found', ariaHiddenCount: all.length }
    const out = []
    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim()
      if (!t) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const r = [...range.getClientRects()].find((rr) => rr.width > 0 && rr.height > 0)
      if (!r) continue
      const cs = getComputedStyle(node.parentElement)
      out.push({ text: t, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, color: cs.color, opacity: cs.opacity })
    }
    return { out, wrapperRect: wrapper.getBoundingClientRect().toJSON ? null : { x: wrapper.getBoundingClientRect().x, y: wrapper.getBoundingClientRect().y } }
  })
  fs.writeFileSync(`${OUT}/herocartouche-raw.json`, JSON.stringify(texts, null, 2))
  console.log(JSON.stringify(texts, null, 2))

  if (texts.out) {
    const rows = []
    for (const t of texts.out) {
      const cy = t.rect.y + t.rect.h / 2
      // Sample background to the immediate right of this glyph run, same y —
      // the cartouche background is a smooth radial/linear gradient with no
      // hard internal edges near the text block center, and CARTOUCHE_BG_SOLID
      // guarantees full opacity beneath it.
      const sampleX = t.rect.x + t.rect.w + 14
      const patchPath = `${OUT}/bgpatch-hero-${t.text.replace(/[^a-z0-9]/gi, '_').slice(0, 16)}.png`
      await page.screenshot({ path: patchPath, clip: { x: Math.round(sampleX - 4), y: Math.round(cy - 4), width: 8, height: 8 } })
      const bg = avgColorOfPng(patchPath)
      const fg = parseCssColor(t.color) || { r: 255, g: 255, b: 255, a: 1 }
      const alpha = fg.a * parseFloat(t.opacity)
      const eff = alpha < 1 ? compositeOver([fg.r, fg.g, fg.b], alpha, bg) : [fg.r, fg.g, fg.b]
      const ratio = contrastRgb(eff, bg)
      rows.push({ text: t.text, color: t.color, alpha, bg: bg.map(Math.round), eff: eff.map(Math.round), contrast: Math.round(ratio * 100) / 100 })
    }
    fs.writeFileSync(`${OUT}/herocartouche-refined.json`, JSON.stringify(rows, null, 2))
    console.table(rows)
  }
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
