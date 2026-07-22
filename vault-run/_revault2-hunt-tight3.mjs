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
  const grid5 = []
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) grid5.push([ (c + 0.5) / 5, (r + 0.5) / 5 ])
  const worlds = ['bluechips', 'altseason']
  for (const world of worlds) {
    for (let taps = 1; taps <= 8; taps++) {
      await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
      await page.reload({ waitUntil: 'networkidle0' })
      await wait(350)
      await clickText(page, world)
      await wait(150)
      await clickText(page, 'send it')
      await wait(600)
      const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
      let settled = false
      for (let i = 0; i < taps && i < grid5.length; i++) {
        const [fx, fy] = grid5[i]
        await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
        await wait(160)
        settled = await page.evaluate(() => document.body.innerText.includes('RUGGED'))
        if (settled) break
      }
      if (settled) { console.log(`${world} taps=${taps} RUGGED (skip)`); continue }
      const cashed = await clickText(page, 'take profit')
      await wait(120)
      const text = await page.evaluate(() => document.body.innerText)
      const lines = text.split('\n')
      const multLine = lines.find(l => /^\d+\.\d+x$/i.test(l.trim()))
      const narrLines = lines.filter(l => /scraped|small bag|took it|paper-handed|secured|so back|generational|aped/i.test(l))
      console.log(`${world} taps=${taps} cashed=${cashed} mult=${multLine} narr=${JSON.stringify(narrLines)}`)
      if (narrLines.some(l => /took it/i.test(l))) {
        console.log('*** FOUND "you took it" ***', world, taps)
        await page.screenshot({ path: `_revault2-9-youtookit-${world}-${taps}.png` })
      }
    }
  }
  await browser.close()
}
run().catch(e => { console.error(e); process.exit(1) })
