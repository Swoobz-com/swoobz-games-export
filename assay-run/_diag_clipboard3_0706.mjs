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

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null })
const ctx = browser.defaultBrowserContext()
await ctx.overridePermissions(URL, ['clipboard-read', 'clipboard-write'])
const page = await browser.newPage()
page.on('console', (m) => console.log('[console]', m.text()))
await page.evaluateOnNewDocument(() => {
  window.addEventListener('unhandledrejection', (e) => {
    console.log('UNHANDLED REJECTION:', e.reason && e.reason.message ? e.reason.message : String(e.reason))
  })
})
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'load' })
await wait(450)
await page.bringToFront()

const dive = await tapText(page, /ENTER THE DIVE/)
await page.touchscreen.tap(dive.x, dive.y)
await wait(220)
const reef = await tapText(page, /REEF/i)
await page.touchscreen.tap(reef.x, reef.y)
await wait(150)
await traceLine(page, line8)
await wait(180)
const run = await tapText(page, /^RUN THE LINE/)
await page.touchscreen.tap(run.x, run.y)
let settled = false
for (let i = 0; i < 45 && !settled; i++) {
  await wait(120)
  const t = await page.evaluate(() => document.body.innerText)
  if (/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t)) settled = true
}
console.log('settled reached:', settled)
if (settled && !/SECURED THE HAUL/i.test(await page.evaluate(() => document.body.innerText))) {
  console.log('BUST not WIN, retry needed - aborting diag')
  await browser.close()
  process.exit(0)
}
await wait(300)

// clear clipboard first via execCommand fallback (best-effort) then read baseline
const before = await page.evaluate(async () => {
  try { return await navigator.clipboard.readText() } catch (e) { return 'read-fail:' + e.message }
})
console.log('clipboard BEFORE tap:', JSON.stringify(before))

const btnInfo = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].filter((x) => (x.getAttribute('aria-label') || '').startsWith('Copy '))[0]
  const r = b.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, expect: (b.getAttribute('aria-label') || '').slice('Copy '.length), label: b.textContent.trim() }
})
console.log('btn before tap, label=', btnInfo.label, 'expect=', btnInfo.expect.slice(0, 12) + '...')

await page.touchscreen.tap(btnInfo.x, btnInfo.y)
await wait(250)

const labelAfter = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].filter((x) => (x.getAttribute('aria-label') || '').startsWith('Copy '))[0]
  return b.textContent.trim()
})
console.log('label after tap:', labelAfter)

const after = await page.evaluate(async () => {
  try { return await navigator.clipboard.readText() } catch (e) { return 'read-fail:' + e.message }
})
console.log('clipboard AFTER tap:', JSON.stringify(after))
console.log('MATCHES expected:', after === btnInfo.expect)

await browser.close()
