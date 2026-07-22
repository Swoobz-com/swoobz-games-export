import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-indep-receipt-reverify-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function tapText(page, re) {
  return page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
    if (!b) return null
    const rect = b.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, re.source)
}
const line8 = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]
async function traceLine(page, cells) {
  for (const [col, row] of cells) {
    const clickAt = await page.evaluate(([col, row]) => {
      const c = document.querySelector('.assayBoardScroll canvas') || document.querySelector('canvas')
      const scrollEl = c.closest('.assayBoardScroll')
      const rawRect = c.getBoundingClientRect()
      const TILE = rawRect.width / 14
      if (scrollEl) {
        const targetLocalX = col * TILE + TILE / 2
        const targetLocalY = row * TILE + TILE / 2
        const viewW = scrollEl.clientWidth, viewH = scrollEl.clientHeight
        scrollEl.scrollLeft = Math.min(Math.max(targetLocalX - viewW / 2, 0), scrollEl.scrollWidth - viewW)
        scrollEl.scrollTop = Math.min(Math.max(targetLocalY - viewH / 2, 0), scrollEl.scrollHeight - viewH)
        const er = scrollEl.getBoundingClientRect()
        return { x: er.left + er.width / 2, y: er.top + er.height / 2 }
      }
      return { x: rawRect.left + col * TILE + TILE / 2, y: rawRect.top + row * TILE + TILE / 2 }
    }, [col, row])
    await page.touchscreen.tap(clickAt.x, clickAt.y)
    await wait(35)
  }
}

async function run(vp) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const page = await browser.newPage()
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'load' })
  await wait(450)
  const dive = await tapText(page, /ENTER THE DIVE/); await page.touchscreen.tap(dive.x, dive.y); await wait(220)
  await traceLine(page, line8); await wait(150)
  const run = await tapText(page, /^RUN THE LINE/); await page.touchscreen.tap(run.x, run.y)
  let found = false
  let rects = null
  for (let i = 0; i < 150 && !found; i++) {
    await wait(15)
    rects = await page.evaluate(() => {
      const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(1), top: +r.top.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }
      const all = [...document.querySelectorAll('div')]
      const chip = all.find((d) => d.childNodes.length >= 1 && /→ haul$/.test(d.textContent.trim()) && d.textContent.trim().startsWith('+'))
      const zoneLabel = all.find((d) => d.childNodes.length === 1 && /^(REEF SHELF|MIDNIGHT ZONE|HADAL TRENCH)$/.test(d.textContent.trim()))
      return { chip: R(chip), zone: R(zoneLabel), chipText: chip ? chip.textContent.trim() : null }
    })
    if (rects.chip) found = true
  }
  if (found) {
    await page.screenshot({ path: `${SHOTS}/active-with-chip-${vp.name}.png` })
  }
  console.log(vp.name, 'found chip:', found, JSON.stringify(rects))
  await browser.close()
}

await run({ name: 'iphone14pro-393x852', width: 393, height: 852 })
