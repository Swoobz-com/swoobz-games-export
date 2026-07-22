import { launch, wait, reachPlanning, selectTier, paintTilesMobile, commit } from './_a11yHelpers.mjs'
import { parseCssColor, contrastRgb, compositeOver, avgColorOfPng } from './_a11yContrastCore.mjs'
import fs from 'node:fs'

const OUT = 'shots-a11y-final-0707/contrast2-pixel7-412x915'
fs.mkdirSync(OUT, { recursive: true })

async function measureNode(page, needle, label, exact = false) {
  const hit = await page.evaluate((needle, exact) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const t = (node.textContent || '').trim()
      if (!t) continue
      const match = exact ? t === needle : t.includes(needle)
      if (!match) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const r = [...range.getClientRects()].find((rr) => rr.width > 0 && rr.height > 0)
      if (!r) continue
      const cs = getComputedStyle(node.parentElement)
      let anc = node.parentElement, product = 1
      while (anc && anc !== document.documentElement) {
        const op = parseFloat(getComputedStyle(anc).opacity)
        if (!Number.isNaN(op)) product *= op
        anc = anc.parentElement
      }
      return { text: t, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, color: cs.color, opacity: cs.opacity, ancestorOpacityProduct: product }
    }
    return null
  }, needle, exact)
  if (!hit) return null
  const cy = hit.rect.y + hit.rect.h / 2
  const sampleX = hit.rect.x + hit.rect.w + 10
  const patchPath = `${OUT}/bgpatch-${label}.png`
  await page.screenshot({ path: patchPath, clip: { x: Math.max(0, Math.round(sampleX - 4)), y: Math.max(0, Math.round(cy - 4)), width: 8, height: 8 } })
  const bg = avgColorOfPng(patchPath)
  const fg = parseCssColor(hit.color) || { r: 255, g: 255, b: 255, a: 1 }
  const alpha = fg.a * hit.ancestorOpacityProduct
  const eff = alpha < 1 ? compositeOver([fg.r, fg.g, fg.b], alpha, bg) : [fg.r, fg.g, fg.b]
  const ratio = contrastRgb(eff, bg)
  return { label, text: hit.text, color: hit.color, alpha, bg: bg.map(Math.round), eff: eff.map(Math.round), contrast: Math.round(ratio * 100) / 100 }
}

async function main() {
  const { browser, page } = await launch({ width: 412, height: 915 })
  await reachPlanning(page)
  await selectTier(page, 'REEF SHELF')
  await wait(200)
  await page.screenshot({ path: `${OUT}/mobile-planning-full.png` })

  const rows = []
  // TO WIN hero plaque bomb-count copy (mobile-only lowercase variant).
  rows.push(await measureNode(page, 'cracked ducats', 'mobile-towinhero-bombcount'))

  // Start the line, sample the mobile bottom-dock HAUL readout mid-cascade.
  await paintTilesMobile(page, [0, 1, 2, 3, 4, 5, 6, 7])
  await wait(150)
  await commit(page)
  await wait(120)
  await page.screenshot({ path: `${OUT}/mobile-assaying-full.png` })
  rows.push(await measureNode(page, 'HAUL', 'mobile-haul-label', true))
  // The live value is a bare number+ x-multiplier near the HAUL label; grab generically.
  const haulTexts = await page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')]
    const label = divs.find((d) => d.children.length === 0 && d.textContent.trim() === 'HAUL')
    if (!label) return []
    const container = label.closest('div')?.parentElement
    if (!container) return []
    const out = []
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim()
      if (t && t !== 'HAUL') out.push(t)
    }
    return out
  })
  console.log('haulTexts near mobile HAUL label:', haulTexts)
  for (const t of haulTexts.slice(0, 6)) {
    rows.push(await measureNode(page, t, `mobile-haul-${t.replace(/[^a-z0-9]/gi, '_').slice(0, 12)}`, true))
  }

  fs.writeFileSync(`${OUT}/mobile-supplement.json`, JSON.stringify(rows, null, 2))
  console.table(rows.filter(Boolean))
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
