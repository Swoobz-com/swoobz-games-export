import { launch, wait, reachPlanning, selectTier, paintTilesMouse, commit, pollForPhaseText, clickText } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const OUT = 'shots-a11y-final-0707/contrast'
fs.mkdirSync(OUT, { recursive: true })

/** Find leaf elements (no element children) whose trimmed textContent
 *  exactly equals or contains `needle`, return their tight bounding rect
 *  (via Range on the text node, not the container box) + computed color/bg. */
async function findLeafRects(page, needle, { exact = false } = {}) {
  return page.evaluate((needle, exact) => {
    const out = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const txt = node.textContent || ''
      const trimmed = txt.trim()
      if (!trimmed) continue
      const match = exact ? trimmed === needle : trimmed.includes(needle)
      if (!match) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const rects = [...range.getClientRects()]
      if (!rects.length) continue
      // Use the first non-zero-size rect.
      const r = rects.find((rr) => rr.width > 0 && rr.height > 0)
      if (!r) continue
      const el = node.parentElement
      const cs = el ? getComputedStyle(el) : null
      out.push({
        text: trimmed.slice(0, 60),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        color: cs ? cs.color : null,
        bg: cs ? cs.backgroundColor : null,
        opacity: cs ? cs.opacity : null,
      })
    }
    return out
  }, needle, exact)
}

async function cropRect(page, rect, name, pad = 3) {
  const clip = {
    x: Math.max(0, Math.floor(rect.x - pad)),
    y: Math.max(0, Math.floor(rect.y - pad)),
    width: Math.ceil(rect.w + pad * 2),
    height: Math.ceil(rect.h + pad * 2),
  }
  await page.screenshot({ path: `${OUT}/${name}.png`, clip })
  return clip
}

async function main() {
  const results = { viewport: '1440x900', zones: [] }
  const { browser, page } = await launch({ width: 1440, height: 900 })

  // ---- WIN outcome (Reef Shelf, 8 tiles) ----
  await reachPlanning(page)
  await selectTier(page, 'REEF SHELF')

  // Sample tier-selector bomb-count copy BEFORE committing (all 3 rows visible).
  for (const label of ['6 CRACKED DUCATS', '8 cracked ducats', '16 cracked ducats']) {
    const hits = await findLeafRects(page, label)
    for (const h of hits) {
      const tag = `tier-bombcount-${label.replace(/\s+/g, '_')}`
      await cropRect(page, h.rect, tag)
      results.zones.push({ zone: 'tier-selector-bombcount', ...h, crop: `${tag}.png` })
    }
  }
  await page.screenshot({ path: `${OUT}/full-planning.png` })

  await paintTilesMouse(page, [0, 1, 2, 3, 4, 5, 6, 7])
  await wait(150)
  await commit(page)
  const settledWin = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 6000)
  await wait(150)
  await page.screenshot({ path: `${OUT}/full-settled-win.png` })

  if (settledWin && /SECURED THE HAUL/i.test(settledWin)) {
    // HAUL gauge readout (dollar + multiplier)
    const haulHits = await findLeafRects(page, '(1.24x)')
    for (const h of haulHits) {
      await cropRect(page, h.rect, 'haul-gauge-multiplier')
      results.zones.push({ zone: 'haul-gauge-readout-multiplier', ...h, crop: 'haul-gauge-multiplier.png' })
    }
    const haulDollar = await findLeafRects(page, '1.24', {})
    for (const h of haulDollar.slice(0, 4)) {
      const tag = `haul-dollar-${results.zones.length}`
      await cropRect(page, h.rect, tag)
      results.zones.push({ zone: 'haul-or-hero-dollar-candidate', ...h, crop: `${tag}.png` })
    }
    // Win-hero $ amount + multiplier (hero pop)
    const heroDollar = await findLeafRects(page, '$1.24')
    for (const h of heroDollar) {
      await cropRect(page, h.rect, 'hero-dollar-amount')
      results.zones.push({ zone: 'win-hero-dollar-amount', ...h, crop: 'hero-dollar-amount.png' })
    }
    // Glass Box cert: seed / hash / round fields
    for (const label of ['seed', 'hash', 'round']) {
      const hits = await findLeafRects(page, label)
      for (const h of hits) {
        if (h.text.length < 300) {
          const tag = `certfield-${label}-${results.zones.length}`
          await cropRect(page, h.rect, tag, 2)
          results.zones.push({ zone: `glassbox-cert-${label}`, ...h, crop: `${tag}.png` })
        }
      }
    }
    // Cert headline (tier + bomb-count in the receipt)
    const headline = await findLeafRects(page, 'WRECK RECKONING')
    for (const h of headline) {
      await cropRect(page, h.rect, 'certfield-headline', 2)
      results.zones.push({ zone: 'glassbox-cert-headline-tier-bombcount', ...h, crop: 'certfield-headline.png' })
    }
  }

  fs.writeFileSync(`${OUT}/results-win.json`, JSON.stringify(results, null, 2))
  console.log('WIN zones captured:', results.zones.length)

  // ---- BUST outcome (Hadal Trench, 40 tiles) for the bad-vein state-lamp label ----
  await clickText(page, 'DIVE AGAIN')
  await wait(300)
  await selectTier(page, 'HADAL TRENCH')
  await paintTilesMouse(page, Array.from({ length: 40 }, (_, i) => i))
  await wait(150)
  await commit(page)
  // Poll specifically for the bad-vein phase text first (transient), capture it, then let it settle.
  let sawBadVein = false
  for (let i = 0; i < 60; i++) {
    const txt = await page.evaluate(() => document.body.innerText)
    if (/Dive busted|CRACKED DUCAT/i.test(txt)) { sawBadVein = true; break }
    await wait(50)
  }
  await page.screenshot({ path: `${OUT}/full-bad-vein.png` })
  const badVeinHits = await findLeafRects(page, 'CRACKED DUCAT')
  const results2 = { viewport: '1440x900', sawBadVein, zones: [] }
  for (const h of badVeinHits) {
    await cropRect(page, h.rect, 'badvein-cracked-ducat-label', 3)
    results2.zones.push({ zone: 'state-lamp-badvein-label', ...h, crop: 'badvein-cracked-ducat-label.png' })
  }
  const settledBust = await pollForPhaseText(page, /RUGGED BY THE DEEP|SECURED THE HAUL/i, 8000)
  await wait(150)
  await page.screenshot({ path: `${OUT}/full-settled-bust.png` })
  results2.settledText = settledBust ? settledBust.slice(0, 200) : null
  fs.writeFileSync(`${OUT}/results-bust.json`, JSON.stringify(results2, null, 2))
  console.log('BUST zones captured:', results2.zones.length, 'sawBadVein:', sawBadVein)

  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
