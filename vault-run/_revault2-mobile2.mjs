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
  for (const [name, w, h] of [['Pixel7', 412, 915], ['iPhone14Pro', 393, 852]]) {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(400)
    const opened = await clickText(page, '?')
    console.log(`${name} help-button clicked:`, opened)
    await wait(300)
    await page.screenshot({ path: `_revault2-17-${name}-howtoplay.png`, fullPage: true })
    const hits = await scanEmDash(page)
    console.log(`${name} HOW-TO-PLAY em-dash hits:`, hits.length, JSON.stringify(hits))
    await page.close()
  }
  await browser.close()
}
run().catch(e => { console.error(e); process.exit(1) })
