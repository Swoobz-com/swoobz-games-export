import { launch, wait, reachPlanning, selectTier, paintTilesMouse, paintTilesMobile, commit, pollForPhaseText, clickText } from './_a11yHelpers.mjs'
import { findWithAncestorOpacity, sampleBgPatch, parseCssColor, contrastRgb, compositeOver, avgColorOfPng } from './_a11yContrastCore.mjs'
import fs from 'node:fs'

const IS_MOBILE = process.argv[2] === 'mobile'
const VIEWPORT = IS_MOBILE ? { width: 412, height: 915 } : { width: 1440, height: 900 }
const VP_NAME = IS_MOBILE ? 'pixel7-412x915' : 'desktop-1440x900'
const paint = IS_MOBILE ? paintTilesMobile : paintTilesMouse
const OUT = `shots-a11y-final-0707/contrast2-${VP_NAME}`
fs.mkdirSync(OUT, { recursive: true })

const rows = []

async function measure(page, needle, label, opts = {}) {
  const hits = await findWithAncestorOpacity(page, needle, opts)
  const results = []
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i]
    const safe = `${label.replace(/[^a-z0-9]/gi, '_')}_${i}`
    const bgPath = `${OUT}/bgpatch-${safe}.png`
    await sampleBgPatch(page, h.rect, bgPath, { below: false })
    let bg = avgColorOfPng(bgPath)
    // If the "above" patch clipped off-canvas or hit non-background art, retry below.
    const bgPathBelow = `${OUT}/bgpatch-${safe}-below.png`
    await sampleBgPatch(page, h.rect, bgPathBelow, { below: true })
    const bgBelow = avgColorOfPng(bgPathBelow)
    const fgParsed = parseCssColor(h.ownColor) || { r: 255, g: 255, b: 255, a: 1 }
    const totalAlpha = fgParsed.a * h.ancestorOpacityProduct
    const effFg = totalAlpha < 1 ? compositeOver([fgParsed.r, fgParsed.g, fgParsed.b], totalAlpha, bg) : [fgParsed.r, fgParsed.g, fgParsed.b]
    const effFgBelow = totalAlpha < 1 ? compositeOver([fgParsed.r, fgParsed.g, fgParsed.b], totalAlpha, bgBelow) : [fgParsed.r, fgParsed.g, fgParsed.b]
    const ratio = contrastRgb(effFg, bg)
    const ratioBelow = contrastRgb(effFgBelow, bgBelow)
    const row = {
      label, viewport: VP_NAME, text: h.text, rect: h.rect,
      ownColor: h.ownColor, ownOpacityCss: h.ownOpacityCss,
      ancestorOpacityProduct: h.ancestorOpacityProduct, ancestorOpacityChain: h.ancestorOpacityChain,
      totalAlpha, bgSampleAbove: bg.map((v) => Math.round(v)), bgSampleBelow: bgBelow.map((v) => Math.round(v)),
      effFgAbove: effFg.map((v) => Math.round(v)), contrastAbove: Math.round(ratio * 100) / 100,
      contrastBelow: Math.round(ratioBelow * 100) / 100,
    }
    results.push(row)
    rows.push(row)
  }
  return results
}

async function main() {
  const { browser, page } = await launch(VIEWPORT)

  // ── Planning phase: tier-selector bomb-count copy (all 3 rows) ──
  await reachPlanning(page)
  await wait(200)
  for (const tier of ['REEF SHELF', 'MIDNIGHT ZONE', 'HADAL TRENCH']) {
    const btnHandle = await page.evaluateHandle((t) => {
      const btns = [...document.querySelectorAll('button')]
      return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
    }, tier)
    const el = btnHandle.asElement()
    if (!el) continue
    // Scope search to this specific button to avoid cross-row collisions.
    await page.evaluate((b) => { b.setAttribute('data-a11y-scope', 'tmp') }, el)
    const r = await measure(page, 'cracked ducats', `tier-bombcount-${tier}`, { scopeSelector: '[data-a11y-scope="tmp"]' })
    await page.evaluate((b) => { b.removeAttribute('data-a11y-scope') }, el)
  }
  await page.screenshot({ path: `${OUT}/full-planning.png` })

  // ── WIN outcome (retry with a fresh tile offset on a probabilistic bust) ──
  let settledWin = null
  for (let attempt = 0; attempt < 6; attempt++) {
    await selectTier(page, 'REEF SHELF')
    const base = attempt * 9
    const indices = Array.from({ length: 8 }, (_, i) => base + i)
    await paint(page, indices)
    await wait(150)
    await commit(page)
    settledWin = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 8000)
    await wait(150)
    if (settledWin && /SECURED THE HAUL/i.test(settledWin)) break
    console.log(`attempt ${attempt} busted, retrying...`)
    await clickText(page, 'DIVE AGAIN')
    await wait(300)
  }
  await page.screenshot({ path: `${OUT}/full-settled-win.png` })

  if (settledWin && /SECURED THE HAUL/i.test(settledWin)) {
    // HAUL gauge readout: value + parenthetical multiplier.
    const railRow = await page.evaluateHandle(() => {
      const divs = [...document.querySelectorAll('div')]
      const titleDiv = divs.find((d) => d.children.length === 0 && d.textContent.trim() === 'HAUL')
      return titleDiv ? titleDiv.parentElement : null
    })
    const railEl = railRow.asElement()
    if (railEl) {
      await page.evaluate((el) => el.setAttribute('data-a11y-scope', 'haul'), railEl)
      await measure(page, 'HAUL', 'haul-gauge-label', { exact: true, scopeSelector: '[data-a11y-scope="haul"]' })
      await measure(page, '.', 'haul-gauge-value', { scopeSelector: '[data-a11y-scope="haul"]' }).then(async () => {
        // Precise: value text like "1.24" and multiplier "1.24x" — grab via digit regex substring search instead.
      })
      // Direct numeric value + multiplier via a dedicated evaluate (avoids '.'-matches-everything above corrupting `rows`).
      rows.splice(rows.findIndex(r => r.label === 'haul-gauge-value'), 1)
    }
    // Redo value/multiplier cleanly:
    if (railEl) {
      const texts = await page.evaluate((el) => {
        const out = []
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        let node
        while ((node = walker.nextNode())) {
          const t = node.textContent.trim()
          if (!t || t === 'HAUL') continue
          const range = document.createRange()
          range.selectNodeContents(node)
          const r = [...range.getClientRects()].find((rr) => rr.width > 0 && rr.height > 0)
          if (!r) continue
          out.push({ text: t })
        }
        return out
      }, railEl)
      for (const t of texts) {
        await measure(page, t.text, `haul-gauge-${t.text}`, { exact: true, scopeSelector: '[data-a11y-scope="haul"]' })
      }
      await page.evaluate((el) => el.removeAttribute('data-a11y-scope'), railEl)
    }

    // Win-hero: $ marker, big amount, multiplier — scope to the cartouche (find via "SECURED THE HAUL" text ancestor).
    const heroHandle = await page.evaluateHandle(() => {
      const divs = [...document.querySelectorAll('div,span')]
      const label = divs.find((d) => d.children.length === 0 && d.textContent.trim() === 'SECURED THE HAUL')
      if (!label) return null
      // climb to the cartouche container (a few levels up)
      let el = label
      for (let i = 0; i < 3 && el.parentElement; i++) el = el.parentElement
      return el
    })
    const heroEl = heroHandle.asElement()
    if (heroEl) {
      await page.evaluate((el) => el.setAttribute('data-a11y-scope', 'hero'), heroEl)
      await measure(page, 'SECURED THE HAUL', 'hero-label', { exact: true, scopeSelector: '[data-a11y-scope="hero"]' })
      await measure(page, '$', 'hero-dollar-marker', { exact: true, scopeSelector: '[data-a11y-scope="hero"]' })
      const heroTexts = await page.evaluate((el) => {
        const out = []
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        let node
        while ((node = walker.nextNode())) {
          const t = node.textContent.trim()
          if (!t || t === 'SECURED THE HAUL' || t === '$') continue
          out.push(t)
        }
        return out
      }, heroEl)
      for (const t of heroTexts) {
        await measure(page, t, `hero-${t}`, { exact: true, scopeSelector: '[data-a11y-scope="hero"]' })
      }
      await page.evaluate((el) => el.removeAttribute('data-a11y-scope'), heroEl)
    }

    // Glass Box cert fields.
    await measure(page, 'seed', 'cert-seed')
    await measure(page, 'hash', 'cert-hash')
    await measure(page, 'round', 'cert-round')
    await measure(page, 'WRECK RECKONING', 'cert-headline')
  }

  // ── BUST outcome: bad-vein state-lamp label ──
  await clickText(page, 'DIVE AGAIN')
  await wait(300)
  await selectTier(page, 'HADAL TRENCH')
  await paint(page, Array.from({ length: 40 }, (_, i) => i))
  await wait(150)
  await commit(page)
  let sawExact = false
  for (let i = 0; i < 400; i++) {
    const txt = await page.evaluate(() => document.body.innerText)
    if (txt.includes('Dive busted.')) { sawExact = true; break }
    await wait(15)
  }
  await page.screenshot({ path: `${OUT}/full-badvein.png` })
  if (sawExact) {
    await measure(page, 'the line broke', 'badvein-label')
  }
  const settledBust = await pollForPhaseText(page, /RUGGED BY THE DEEP|SECURED THE HAUL/i, 8000)
  await page.screenshot({ path: `${OUT}/full-settled-bust.png` })

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(rows, null, 2))
  console.log(`Captured ${rows.length} contrast measurements for ${VP_NAME}. sawExact(badvein)=${sawExact}`)
  console.table(rows.map((r) => ({ label: r.label, text: r.text.slice(0, 30), alpha: r.totalAlpha.toFixed(2), above: r.contrastAbove, below: r.contrastBelow })))

  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
