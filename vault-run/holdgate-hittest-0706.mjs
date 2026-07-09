// holdgate-hittest-0706.mjs — real hit-test probe (elementFromPoint + actual
// mouse click) to prove the sceneBackdropLayer does NOT intercept clicks,
// unlike a programmatic el.click() which bypasses CSS pointer-events hit-testing.
import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6317'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickTextViaMouse(page, t, within) {
  const box = await page.evaluate(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    const el = els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc))
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, { t, within })
  if (!box) return { found: false }
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    return {
      tag: el ? el.tagName : null,
      text: el ? (el.textContent || '').slice(0, 30) : null,
      testid: el ? el.getAttribute('data-testid') : null,
      isBackdrop: el ? (el.getAttribute('data-testid') === 'vault-grid-backdrop') : null,
    }
  }, box)
  await page.mouse.click(box.x, box.y)
  return { found: true, box, hit }
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(e => /got it/i.test(e.textContent||''))
    if (b) b.click()
  })
  await wait(300)

  const results = {}
  results.apeIn = await clickTextViaMouse(page, 'ape in')
  await wait(500)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(e => /bluechips/i.test(e.textContent||''))
    if (b) b.click()
  })
  await wait(200)
  results.sendIt = await clickTextViaMouse(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(900)

  // also hit-test a canvas tile point and the board itself (not covered by backdrop)
  results.canvasTileHit = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    const x = r.x + r.width * 0.3
    const y = r.y + r.height * 0.3
    const el = document.elementFromPoint(x, y)
    return { tag: el ? el.tagName : null, isCanvas: el === c }
  })
  await page.mouse.click(
    (await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return r.x + r.width*0.3 })),
    (await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return r.y + r.height*0.3 })),
  )
  await wait(500)
  results.takeProfit = await clickTextViaMouse(page, 'take profit')
  await wait(900)
  results.betAgainHit = await clickTextViaMouse(page, 'bet again')

  await browser.close()
  console.log(JSON.stringify(results, null, 2))
}
run().catch(e => { console.error('FATAL', e); process.exit(1) })
