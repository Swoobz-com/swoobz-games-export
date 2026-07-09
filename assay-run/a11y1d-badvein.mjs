import { launch, wait, reachPlanning, selectTier, paintTilesMouse, commit, clickText } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const OUT = 'shots-a11y-final-0707/contrast'
fs.mkdirSync(OUT, { recursive: true })

async function findLeafRects(page, needle) {
  return page.evaluate((needle) => {
    const out = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const trimmed = (node.textContent || '').trim()
      if (!trimmed || !trimmed.includes(needle)) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const r = [...range.getClientRects()].find((rr) => rr.width > 0 && rr.height > 0)
      if (!r) continue
      const cs = getComputedStyle(node.parentElement)
      out.push({ text: trimmed.slice(0, 80), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, color: cs.color, bg: cs.backgroundColor, opacity: cs.opacity })
    }
    return out
  }, needle)
}

async function main() {
  const { browser, page } = await launch({ width: 1440, height: 900 })
  await reachPlanning(page)
  await selectTier(page, 'HADAL TRENCH')
  await paintTilesMouse(page, Array.from({ length: 40 }, (_, i) => i))
  await wait(150)
  await commit(page)

  // Poll for the exact phase-exclusive marker "Dive busted." (period-terminated,
  // per prior audit's disambiguation from the always-visible "CRACKED DUCATS"
  // tier-row label and the "CRACKED = BUST" static help strip).
  let found = false
  const t0 = Date.now()
  for (let i = 0; i < 400; i++) {
    const txt = await page.evaluate(() => document.body.innerText)
    if (txt.includes('Dive busted.')) { found = true; break }
    await wait(15)
  }
  const dt = Date.now() - t0
  console.log('Found "Dive busted." after', dt, 'ms; found=', found)
  await page.screenshot({ path: `${OUT}/full-badvein-exact.png` })

  const hits = await findLeafRects(page, 'the line broke')
  fs.writeFileSync(`${OUT}/badvein-exact-raw.json`, JSON.stringify({ found, dt, hits }, null, 2))
  console.log(JSON.stringify(hits, null, 2))

  for (const h of hits) {
    const pad = 3
    const clip = {
      x: Math.max(0, Math.floor(h.rect.x - pad)),
      y: Math.max(0, Math.floor(h.rect.y - pad)),
      width: Math.ceil(h.rect.w + pad * 2),
      height: Math.ceil(h.rect.h + pad * 2),
    }
    await page.screenshot({ path: `${OUT}/badvein-exact-label.png`, clip })
  }

  // Also grab the PLAY SAFE pill (mobile CRIT#2 pattern, page-fixed) for the
  // "state-lamp on saturated accent" risk zone reference, and the balance pill.
  const playSafe = await findLeafRects(page, 'PLAY SAFE')
  fs.writeFileSync(`${OUT}/badvein-playsafe-raw.json`, JSON.stringify(playSafe, null, 2))

  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
