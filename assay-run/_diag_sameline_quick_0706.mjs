import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function tapText(page, re) {
  return page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
    if (!b) return null
    const rect = b.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, h: rect.height, w: rect.width }
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
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
for (const vp of [{ name: 'pixel7', width: 412, height: 915 }, { name: 'iphone14pro', width: 393, height: 852 }]) {
  const page = await browser.newPage()
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'load' })
  await wait(450)
  const dive = await tapText(page, /ENTER THE DIVE/); await page.touchscreen.tap(dive.x, dive.y); await wait(220)
  await traceLine(page, line8); await wait(150)
  const runBtn = await tapText(page, /^RUN THE LINE/); await page.touchscreen.tap(runBtn.x, runBtn.y)
  let settledText = null
  for (let i = 0; i < 45 && !settledText; i++) { await wait(120); const t = await page.evaluate(() => document.body.innerText); if (/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t)) settledText = t }
  await wait(200)
  const sameLineBtn = await tapText(page, /SAME LINE/i)
  console.log(vp.name, 'SAME LINE rect', sameLineBtn ? `${sameLineBtn.w.toFixed(1)}x${sameLineBtn.h.toFixed(1)}` : 'NOT FOUND')
  if (sameLineBtn) {
    await page.touchscreen.tap(sameLineBtn.x, sameLineBtn.y)
    await wait(350)
    const stateAfter = await page.evaluate(() => document.body.innerText)
    const rearmed = !/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(stateAfter) && /CLAIM LINE|8.*ducats|min 8/i.test(stateAfter)
    console.log(vp.name, 'SAME LINE re-armed planning phase:', rearmed || 'inspect', stateAfter.includes('DIVE DEPTH') || stateAfter.includes('DIVE-DEPTH') ? '' : '')
  }
  await page.close()
}
await browser.close()
