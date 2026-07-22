import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(350)
  await clickText(page, 'bluechips')
  await wait(150)
  await clickText(page, 'send it')
  await wait(600)
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  const grid5 = []
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) grid5.push([ (c + 0.5) / 5, (r + 0.5) / 5 ])
  for (let i = 0; i < 2; i++) {
    await page.mouse.click(box.x + box.w * grid5[i][0], box.y + box.h * grid5[i][1])
    await wait(160)
  }
  await clickText(page, 'take profit')
  await wait(200)
  const loc = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
    const el = all.find(e => e.children.length === 0 && /you took it/i.test(e.textContent || ''))
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    // parent chain info
    const chain = []
    let p = el
    for (let d = 0; d < 5 && p; d++) { chain.push({ tag: p.tagName, display: getComputedStyle(p).display, visibility: getComputedStyle(p).visibility, testid: p.getAttribute && p.getAttribute('data-testid') }); p = p.parentElement }
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, display: cs.display, visibility: cs.visibility, opacity: cs.opacity, color: cs.color, fontFamily: cs.fontFamily, chain }
  })
  console.log('YOU TOOK IT node info:', JSON.stringify(loc, null, 2))
  await page.screenshot({ path: '_revault2-10-full-with-narrative.png', fullPage: true })
  await browser.close()
}
run().catch(e => { console.error(e); process.exit(1) })
