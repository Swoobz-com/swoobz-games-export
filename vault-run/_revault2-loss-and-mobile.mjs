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
async function scanEmDash(page) {
  return page.evaluate(() => {
    const EMDASH = '—'
    const hits = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement
        if (!p) return NodeFilter.FILTER_REJECT
        if (p.tagName === 'STYLE' || p.tagName === 'SCRIPT') return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    let n
    while ((n = walker.nextNode())) if (n.nodeValue && n.nodeValue.includes(EMDASH)) hits.push(n.nodeValue.trim().slice(0,120))
    for (const el of document.querySelectorAll('*')) {
      for (const attr of ['aria-label','title','placeholder','alt']) {
        const v = el.getAttribute(attr)
        if (v && v.includes(EMDASH)) hits.push('ATTR:'+attr+'='+v)
      }
    }
    return hits
  })
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })

  // ---- Settled LOSS desktop ----
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(350)
    await clickText(page, 'shitcoin') // 24 rugs / 49 tiles -- high chance of quick rug
    await wait(150)
    await clickText(page, 'send it')
    await wait(600)
    const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    let settled = false
    const grid7 = []
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) grid7.push([(c+0.5)/7,(r+0.5)/7])
    for (let i = 0; i < grid7.length && !settled; i++) {
      await page.mouse.click(box.x + box.w*grid7[i][0], box.y + box.h*grid7[i][1])
      await wait(140)
      settled = await page.evaluate(() => document.body.innerText.includes('RUGGED'))
    }
    await wait(150)
    await page.screenshot({ path: '_revault2-11-settled-loss.png', fullPage: true })
    const hits = await scanEmDash(page)
    console.log('DESKTOP SETTLED-LOSS em-dash hits:', hits.length, JSON.stringify(hits))
    const text = await page.evaluate(() => document.body.innerText)
    console.log('LOSS TEXT LINES:', JSON.stringify(text.split('\n').filter(Boolean)))
    await page.close()
  }

  // ---- Mobile Pixel 7 ----
  for (const [name, w, h] of [['Pixel7', 412, 915], ['iPhone14Pro', 393, 852]]) {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(400)
    await page.screenshot({ path: `_revault2-12-${name}-betentry.png` })
    let hits = await scanEmDash(page)
    console.log(`${name} BET-ENTRY em-dash hits:`, hits.length, JSON.stringify(hits))

    await clickText(page, 'bluechips')
    await wait(150)
    // open how-to-play if reachable
    const h2 = await page.evaluateHandle(() => {
      const el = document.querySelector('[aria-label="How to play Rug or Riches"]')
      return el || null
    })
    const el2 = h2.asElement()
    if (el2) { await el2.click(); await wait(250)
      await page.screenshot({ path: `_revault2-13-${name}-howtoplay.png` })
      hits = await scanEmDash(page)
      console.log(`${name} HOW-TO-PLAY em-dash hits:`, hits.length, JSON.stringify(hits))
      await clickText(page, 'got it')
      await wait(150)
    }
    await clickText(page, 'send it')
    await wait(600)
    await page.screenshot({ path: `_revault2-14-${name}-playing.png` })
    hits = await scanEmDash(page)
    console.log(`${name} PLAYING em-dash hits:`, hits.length, JSON.stringify(hits))
    // check locked panel absent on mobile
    const lockedPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-ctl-wager-locked"]'))
    console.log(`${name} locked-panel present (expect false, mobile isWide-gated):`, lockedPresent)
    await page.close()
  }

  await browser.close()
}
run().catch(e => { console.error(e); process.exit(1) })
