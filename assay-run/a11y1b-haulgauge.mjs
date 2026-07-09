import { launch, wait, reachPlanning, selectTier, paintTilesMouse, commit, pollForPhaseText } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const OUT = 'shots-a11y-final-0707/contrast'
fs.mkdirSync(OUT, { recursive: true })

async function main() {
  const { browser, page } = await launch({ width: 1440, height: 900 })
  await reachPlanning(page)
  await selectTier(page, 'REEF SHELF')
  await paintTilesMouse(page, [0, 1, 2, 3, 4, 5, 6, 7])
  await wait(150)
  await commit(page)
  await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 6000)
  await wait(150)

  const info = await page.evaluate(() => {
    // Find the RailRow title div whose OWN text is exactly "HAUL".
    const divs = [...document.querySelectorAll('div')]
    const titleDiv = divs.find((d) => d.children.length === 0 && d.textContent.trim() === 'HAUL')
    if (!titleDiv) return { error: 'no HAUL title found' }
    const container = titleDiv.parentElement
    // Within container, find all leaf text nodes with non-empty trimmed text.
    const out = []
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
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
    return { containerRect: container.getBoundingClientRect().toJSON ? JSON.parse(JSON.stringify(container.getBoundingClientRect())) : null, texts: out }
  })
  fs.writeFileSync(`${OUT}/haulgauge-raw.json`, JSON.stringify(info, null, 2))
  console.log(JSON.stringify(info, null, 2))

  if (info.texts) {
    for (const t of info.texts) {
      const pad = 3
      const clip = {
        x: Math.max(0, Math.floor(t.rect.x - pad)),
        y: Math.max(0, Math.floor(t.rect.y - pad)),
        width: Math.ceil(t.rect.w + pad * 2),
        height: Math.ceil(t.rect.h + pad * 2),
      }
      const safe = t.text.replace(/[^a-z0-9]/gi, '_').slice(0, 20)
      await page.screenshot({ path: `${OUT}/haulgauge-${safe}.png`, clip })
    }
  }
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
