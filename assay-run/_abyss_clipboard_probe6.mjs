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
  if (attempt > 0) { await page.evaluate(() => { try { window.localStorage.clear() } catch {} }); await page.reload({ waitUntil: 'load' }); await page.bringToFront(); await wait(400) }
  await clickText(page, /ENTER THE DIVE/); await wait(300)
  await clickText(page, /REEF/i); await wait(150)
  await trace(page, line8); await wait(150)
  await clickText(page, /^RUN THE LINE/)
  for (let i = 0; i < 40 && !settledText; i++) {
    await wait(120)
    const t = await page.evaluate(() => document.body.innerText)
    if (/SECURED THE HAUL/i.test(t)) settledText = t
    else if (/RUGGED BY THE DEEP/i.test(t)) break
  }
}
console.log('settled:', !!settledText)

// mimic the heavier measureReceipt() traffic: many small evaluate round trips + a screenshot + wait
for (let i = 0; i < 15; i++) { await page.evaluate(() => document.body.innerText.length) }
await page.screenshot({ path: 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/abyss-receipt-reverify/probe6-shot.png' })
await wait(300)

console.log('hasFocus before click:', await page.evaluate(() => document.hasFocus()))
console.log('perm state before click:', await page.evaluate(async () => (await navigator.permissions.query({name:'clipboard-write'})).state))

// EXACT replica of the real script's clickCopyButtonsAndVerify() loop
const btnHandles = await page.$$('button[aria-label^="Copy "]')
console.log('btnHandles.length:', btnHandles.length)
await page.bringToFront()
await wait(200)
for (let i = 0; i < btnHandles.length; i++) {
  const beforeText = await page.evaluate(el => el.textContent.trim(), btnHandles[i])
  const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), btnHandles[i])
  const expected = ariaLabel.replace(/^Copy /, '')
  await page.bringToFront()
  await btnHandles[i].click()
  await wait(150)
  const afterText = await page.evaluate(el => el.textContent.trim(), btnHandles[i])
  let clipboardText = null
  try { clipboardText = await page.evaluate(() => navigator.clipboard.readText()) } catch (e) { clipboardText = `ERR:${e.message}` }
  console.log(`btn#${i+1} before="${beforeText}" after="${afterText}" clip="${(clipboardText||'').slice(0,16)}" matches=${clipboardText===expected}`)
  await wait(1300)
}
console.log('pageerrors:', errs)
await browser.close()
