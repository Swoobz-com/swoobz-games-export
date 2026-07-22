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
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(350)
  await clickText(page, 'shitcoin')
  await wait(150)
  await clickText(page, 'send it')
  await wait(700)
  await page.screenshot({ path: '_revault2-15-shitcoin-fresh-board.png' })
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  console.log('canvas box', JSON.stringify(box))
  // tap many many times across a tighter subgrid within the box to raise odds AND wait long enough between to observe transitions
  const grid7 = []
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) grid7.push([(c+0.5)/7,(r+0.5)/7])
  let settledFinal = false
  for (let i = 0; i < grid7.length && !settledFinal; i++) {
    await page.mouse.click(box.x + box.w*grid7[i][0], box.y + box.h*grid7[i][1])
    await wait(300)
    const phaseText = await page.evaluate(() => document.body.innerText.slice(0,120))
    settledFinal = await page.evaluate(() => document.body.innerText.includes('SETTLED · LOSS'))
    if (settledFinal) { console.log('settled at tap', i, 'header:', phaseText.split('\n')[0]) }
  }
  await wait(600) // let full settle animation complete beyond mine-hit/settling transitional phase
  await page.screenshot({ path: '_revault2-16-settled-loss-full.png', fullPage: true })
  const hits = await scanEmDash(page)
  console.log('SETTLED-LOSS (full) em-dash hits:', hits.length, JSON.stringify(hits))
  const text = await page.evaluate(() => document.body.innerText)
  console.log('SETTLED-LOSS FULL TEXT:', JSON.stringify(text.split('\n').filter(Boolean)))
  await browser.close()
}
run().catch(e => { console.error(e); process.exit(1) })
