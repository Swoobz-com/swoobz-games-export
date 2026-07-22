import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = '5281'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(t)) || null
  }, t.toLowerCase())
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function clickBoardCenter(page, dx = 0, dy = 0) {
  const box = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
  })
  if (!box) return false
  await page.mouse.click(box.cx + dx, box.cy + dy)
  return true
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const consoleErrors = []
const kenneyRequests = []
const allFailedResponses = []
let vaultAudioModuleUrl = null
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
page.on('requestfinished', (r) => {
  if (r.url().includes('kenney/audio')) kenneyRequests.push({ phase: 'unlabeled', url: r.url(), status: r.response()?.status() })
  if (r.url().endsWith('/vaultAudio.ts') || r.url().includes('vaultAudio.ts?')) vaultAudioModuleUrl = r.url().split('?')[0]
})
page.on('response', (r) => { if (r.status() >= 400) allFailedResponses.push(r.status() + ' ' + r.url()) })

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
console.log('--- navigating to vault-run root ---')
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await wait(600)
console.log('kenney requests after initial load/mount:', kenneyRequests.length)

await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200)
await clickText(page, 'ape in'); await wait(600)
console.log('reached bet-entry (ape in clicked)')

// direct function-level probe: dynamic-import vaultAudio (using the URL Vite already
// served it at during initial page mount) and call the Kenney-mapped fns directly.
console.log('resolved vaultAudio.ts module URL:', vaultAudioModuleUrl)
const directProbe = await page.evaluate(async (modUrl) => {
  try {
    if (!modUrl) return { ok: false, error: 'no vaultAudio.ts module URL captured from network log' }
    const mod = await import(/* @vite-ignore */ modUrl)
    const before = performance.now()
    mod.playMineHit()
    mod.playCashOutWin()
    return { ok: true, exports: Object.keys(mod), tookMs: performance.now() - before }
  } catch (e) {
    return { ok: false, error: String((e && e.stack) || e) }
  }
}, vaultAudioModuleUrl)
await wait(400)
console.log('DIRECT FUNCTION-CALL PROBE (playMineHit + playCashOutWin):', JSON.stringify(directProbe))
console.log('kenney requests immediately after direct-call probe:', kenneyRequests.length, JSON.stringify(kenneyRequests))

// now drive the real loop: commit wager -> LIVE -> reveal tiles -> take profit -> settle
await clickText(page, 'send it'); await wait(700)
console.log('committed wager, now LIVE')

let mineHit = false
const offsets = [[-100,-100],[100,-100],[-100,100],[100,100],[0,-100],[0,100],[-100,0],[100,0],[-50,-50],[50,50],[-50,50],[50,-50]]
for (const [dx, dy] of offsets) {
  const before = kenneyRequests.length
  await clickBoardCenter(page, dx, dy)
  await wait(350)
  const bodyText = await page.evaluate(() => document.body.innerText)
  if (/RUG|MINE|BUSTED|RUGGED/i.test(bodyText) && !/take profit/i.test(bodyText)) {
    // heuristic only; real detection follows below via phase check
  }
  const phase = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-banner"]')
    return el ? el.textContent : null
  })
  if (phase) { mineHit = true; console.log('settled banner appeared after tile click:', phase.slice(0,120)); break }
}
console.log('real-gameplay kenney requests observed so far:', kenneyRequests.length)

if (!mineHit) {
  // survived all reveals without a mine -> take profit
  await clickText(page, 'take profit'); await wait(300)
  await clickText(page, 'cash'); await wait(700)
  console.log('cashed out via TAKE PROFIT (no mine hit during reveals)')
}

const finalPhaseText = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="vault-settled-banner"]')
  return el ? el.textContent.slice(0, 200) : 'NO SETTLED BANNER FOUND'
})
console.log('FINAL PHASE / settled banner text:', finalPhaseText)

console.log('\n=== SUMMARY ===')
console.log('console errors:', consoleErrors.length, JSON.stringify(consoleErrors))
console.log('HTTP >=400 responses:', allFailedResponses.length, JSON.stringify(allFailedResponses))
console.log('total kenney/audio network requests observed during full run:', kenneyRequests.length)

await browser.close()
