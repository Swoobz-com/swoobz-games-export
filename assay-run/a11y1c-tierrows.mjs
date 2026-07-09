import { launch, wait, reachPlanning } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const OUT = 'shots-a11y-final-0707/contrast'
fs.mkdirSync(OUT, { recursive: true })

async function main() {
  const { browser, page } = await launch({ width: 1440, height: 900 })
  await reachPlanning(page)
  await wait(200)

  const info = await page.evaluate((tierLabels) => {
    const buttons = [...document.querySelectorAll('button')]
    const results = []
    for (const label of tierLabels) {
      const btn = buttons.find((b) => b.textContent && b.textContent.includes(label))
      if (!btn) { results.push({ label, error: 'not found' }); continue }
      const active = btn.getAttribute('aria-current') === 'true'
      const btnCs = getComputedStyle(btn)
      const texts = []
      const walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim()
        if (!t) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        const r = [...range.getClientRects()].find((rr) => rr.width > 0 && rr.height > 0)
        if (!r) continue
        const cs = getComputedStyle(node.parentElement)
        texts.push({ text: t, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, color: cs.color, opacity: cs.opacity })
      }
      results.push({ label, active, btnBg: btnCs.backgroundColor, btnBgImage: btnCs.backgroundImage, texts })
    }
    return results
  }, ['REEF SHELF', 'MIDNIGHT ZONE', 'HADAL TRENCH'])

  fs.writeFileSync(`${OUT}/tierrows-raw.json`, JSON.stringify(info, null, 2))
  console.log(JSON.stringify(info, null, 2))

  for (const row of info) {
    if (!row.texts) continue
    for (const t of row.texts) {
      const pad = 3
      const clip = {
        x: Math.max(0, Math.floor(t.rect.x - pad)),
        y: Math.max(0, Math.floor(t.rect.y - pad)),
        width: Math.ceil(t.rect.w + pad * 2),
        height: Math.ceil(t.rect.h + pad * 2),
      }
      const safe = `${row.label.replace(/\s+/g, '_')}_${t.text.replace(/[^a-z0-9]/gi, '_').slice(0, 24)}`
      await page.screenshot({ path: `${OUT}/tierrow-${safe}.png`, clip })
    }
  }
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
