import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, { t, within })
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function scanEmdash(page, label) {
  const hits = await page.evaluate(() => {
    const results = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const p = node.parentElement
        if (p && (p.closest('style') || p.closest('script'))) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    let n
    while ((n = walker.nextNode())) {
      if (n.nodeValue && n.nodeValue.includes('—')) results.push(n.nodeValue.trim())
    }
    // also scan aria-label / title attributes
    document.querySelectorAll('[aria-label],[title]').forEach((el) => {
      const al = el.getAttribute('aria-label'); const ti = el.getAttribute('title')
      if (al && al.includes('—')) results.push('aria-label: ' + al)
      if (ti && ti.includes('—')) results.push('title: ' + ti)
    })
    return results
  })
  console.log(label, 'em-dash hits:', JSON.stringify(hits))
  return hits
}
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await p.reload({ waitUntil: 'networkidle0' })
await wait(600)
let all = []
all = all.concat(await scanEmdash(p, 'bet-entry'))
await p.click('[data-testid="vault-corner-help"]')
await wait(500)
all = all.concat(await scanEmdash(p, 'how-to-play modal'))
await p.keyboard.press('Escape')
await wait(300)
await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
await wait(700)
all = all.concat(await scanEmdash(p, 'playing'))
await p.close()
console.log('TOTAL EMDASH HITS:', all.length)
await b.close()
