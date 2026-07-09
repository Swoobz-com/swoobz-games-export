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
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col + 0.5) / cols), box.y + box.h * ((row + 0.5) / cols)) }
async function isSettled(p) { return p.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]')) }
async function scan(page) {
  return page.evaluate(() => {
    const results = { emdash: [], dutch: [] }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const p = node.parentElement
        if (p && (p.closest('style') || p.closest('script'))) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    let n
    while ((n = walker.nextNode())) {
      const v = n.nodeValue
      if (!v) continue
      if (v.includes('—')) results.emdash.push(v.trim())
      if (/VERGRENDELD|INZET/i.test(v)) results.dutch.push(v.trim())
    }
    document.querySelectorAll('[aria-label],[title]').forEach((el) => {
      const al = el.getAttribute('aria-label'); const ti = el.getAttribute('title')
      if (al && al.includes('—')) results.emdash.push('aria-label: ' + al)
      if (ti && ti.includes('—')) results.emdash.push('title: ' + ti)
    })
    return results
  })
}
async function run() {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const p = await b.newPage()
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await p.reload({ waitUntil: 'networkidle0' })
  await wait(600)
  // Force a settled LOSS on shitcoin (also renders the locked-bet stepper
  // during 'playing' with "BET · LOCKED" — captured separately below).
  await clickText(p, 'shitcoin')
  await wait(300)
  await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(700)
  const lockedScan = await scan(p)
  console.log('PLAYING (locked-bet visible) scan:', JSON.stringify(lockedScan))
  const box = await boardBox(p)
  let settled = false
  for (let row = 0; row < 7 && !settled; row++) {
    for (let col = 0; col < 7 && !settled; col++) {
      await tapCell(p, box, col, row, 7)
      await wait(450)
      settled = await isSettled(p)
    }
  }
  await wait(500)
  const settledScan = await scan(p)
  console.log('SETTLED scan:', JSON.stringify(settledScan))
  await p.close()
  await b.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
