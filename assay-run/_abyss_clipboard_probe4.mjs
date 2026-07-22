import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))

const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)

async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); if(!c) return null; const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } }) }
async function trace(page, cells){ const geo = await boardGeo(page); const TILE = geo.w/14; for(const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(30) } }
const line8 = [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const ctx = browser.defaultBrowserContext()
await ctx.overridePermissions(URL, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write'])

const page = await browser.newPage()
const errs = []
page.on('pageerror', e => errs.push(e.message))
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'load' })
await page.bringToFront()
await wait(500)

let settledText = null
for (let attempt = 0; attempt < 20 && !settledText; attempt++) {
  if (attempt > 0) {
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'load' })
    await wait(400)
  }
  await clickText(page, /ENTER THE DIVE/); await wait(300)
  await clickText(page, /REEF/i); await wait(150)
  await trace(page, line8); await wait(150)
  await clickText(page, /^RUN THE LINE/)
  for (let i = 0; i < 40 && !settledText; i++) {
    await wait(120)
    const t = await page.evaluate(() => document.body.innerText)
    if (/SECURED THE HAUL/i.test(t) || /RUGGED BY THE DEEP/i.test(t)) settledText = t
  }
  if (settledText && !/SECURED THE HAUL/i.test(settledText)) settledText = null // want a WIN specifically for a determinstic repro, retry
}
console.log('settled:', !!settledText)

const permState = await page.evaluate(async () => { try { const p = await navigator.permissions.query({ name: 'clipboard-write' }); return p.state } catch (e) { return 'ERR:' + e.message } })
console.log('permission state at settle:', permState)
console.log('document.hasFocus() at settle:', await page.evaluate(() => document.hasFocus()))

const btn = await page.$('button[aria-label^="Copy "]')
if (btn) {
  await page.bringToFront()
  await btn.click()
  await wait(200)
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(e => 'ERR:' + e.message))
  console.log('clipboard after real CopyGlyph click:', JSON.stringify(clip))
} else {
  console.log('no copy button found')
}
console.log('pageerrors:', errs)
await browser.close()
