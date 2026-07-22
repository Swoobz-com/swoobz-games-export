import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-overlapaudit-0706'
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)
async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } }) }
async function trace(page, cells){ const geo = await boardGeo(page); const TILE = geo.w/14; for(const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(30) } }
const line8 = [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
let winFound = false
for (let attempt = 0; attempt < 24 && !winFound; attempt++) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'load' })
  await wait(400)
  await clickText(page, /ENTER THE DIVE/)
  await wait(200)
  await clickText(page, /REEF/i)
  await wait(150)
  await trace(page, line8)
  await wait(150)
  await clickText(page, /^RUN THE LINE/)
  let settled = false
  for (let i=0;i<40 && !settled;i++){
    await wait(80)
    const t = await page.evaluate(() => document.body.innerText)
    if (/SECURED THE HAUL/i.test(t)) settled = true
    if (/RUGGED BY THE DEEP/i.test(t)) break
  }
  if (!settled) { await page.close(); continue }
  winFound = true
  const t0 = Date.now()
  const samples = []
  for (let i=0;i<14;i++){
    const info = await page.evaluate(() => {
      const spans = [...document.querySelectorAll('span')]
      const badge = spans.find(s => (s.textContent||'').trim() === 'LINE CLAIMED')
      if (!badge) return { found: false }
      const outerPop = badge.closest('[aria-hidden]') || badge.parentElement
      const rect = badge.getBoundingClientRect()
      const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2
      const topEl = document.elementFromPoint(cx, cy)
      const canvas = document.querySelector('canvas')
      const canvasRect = canvas.getBoundingClientRect()
      // walk up from badge to find the element with the explicit z-index (HeroPopCallout wrapper)
      let z = null, pos = null
      let cur = badge
      while (cur && z === null) {
        const cs = getComputedStyle(cur)
        if (cs.zIndex !== 'auto') { z = cs.zIndex; pos = cs.position }
        cur = cur.parentElement
      }
      return {
        found: true,
        badgeRect: { left: rect.left, top: rect.top, w: rect.width, h: rect.height },
        canvasRect: { left: canvasRect.left, top: canvasRect.top, w: canvasRect.width, h: canvasRect.height },
        topElAtBadgeCenter: topEl ? { tag: topEl.tagName, text: (topEl.textContent||'').trim().slice(0,30), isBadgeOrAncestor: topEl===badge || badge.contains(topEl) || topEl.contains(badge) } : null,
        nearestZIndex: z, nearestZIndexPos: pos,
        canvasComputedZIndex: getComputedStyle(canvas).zIndex,
        canvasComputedPosition: getComputedStyle(canvas).position,
      }
    })
    samples.push({ tMs: Date.now()-t0, ...info })
    await wait(60)
  }
  await page.screenshot({ path: `${OUT}/zorder-lineclaimed-verify.png` })
  fs.writeFileSync(`${OUT}/zorder-lineclaimed-verify.json`, JSON.stringify(samples, null, 2))
  console.log(JSON.stringify(samples, null, 2))
  await page.close()
}
if (!winFound) console.log('Could not land a win in 24 attempts')
await browser.close()
