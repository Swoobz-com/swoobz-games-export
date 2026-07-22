import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = '5180'
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

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const consoleErrors = []
const kenneyRequests = []
const allFailedResponses = []
let pulseAudioModuleUrl = null
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
page.on('requestfinished', (r) => {
  if (r.url().includes('kenney/audio')) kenneyRequests.push({ url: r.url(), status: r.response()?.status() })
  if (r.url().includes('/pulseAudio.ts')) pulseAudioModuleUrl = r.url().split('?')[0]
})
page.on('response', (r) => { if (r.status() >= 400) allFailedResponses.push(r.status() + ' ' + r.url()) })

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
console.log('--- navigating to pulse-run full-pulse.html (FRAMEWORK build) ---')
await page.goto(`http://localhost:${PORT}/full-pulse.html`, { waitUntil: 'networkidle0' })
await wait(600)
console.log('kenney requests after initial load/mount:', kenneyRequests.length)
console.log('resolved pulseAudio.ts module URL:', pulseAudioModuleUrl)

await clickText(page, 'got it'); await clickText(page, 'skip'); await clickText(page, 'start playing'); await wait(300)

// direct function-level probe
const directProbe = await page.evaluate(async (modUrl) => {
  try {
    if (!modUrl) return { ok: false, error: 'no pulseAudio.ts module URL captured from network log' }
    const mod = await import(/* @vite-ignore */ modUrl)
    const before = performance.now()
    mod.playBetCommit()
    mod.playCrash()
    mod.playCashOutWin()
    mod.playPerfectHit()
    return { ok: true, exports: Object.keys(mod), tookMs: performance.now() - before }
  } catch (e) {
    return { ok: false, error: String((e && e.stack) || e) }
  }
}, pulseAudioModuleUrl)
await wait(400)
console.log('DIRECT FUNCTION-CALL PROBE (playBetCommit + playCrash + playCashOutWin + playPerfectHit):', JSON.stringify(directProbe))
console.log('kenney requests immediately after direct-call probe:', kenneyRequests.length, JSON.stringify(kenneyRequests))

// real gameplay: place a wager -> commit -> let it climb -> cash out (or let it crash)
await clickText(page, 'place a wager'); await wait(400)
await clickText(page, 'commit'); await wait(500)
console.log('committed wager, round should be climbing now')
await wait(1500)
const cashedOut = await clickText(page, 'cash out')
console.log('attempted CASH OUT click, success=', cashedOut)
await wait(1000)

const bodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300))
console.log('BODY TEXT SNAPSHOT after settle attempt:', bodyText)

console.log('\n=== SUMMARY ===')
console.log('console errors:', consoleErrors.length, JSON.stringify(consoleErrors))
console.log('HTTP >=400 responses:', allFailedResponses.length, JSON.stringify(allFailedResponses))
console.log('total kenney/audio network requests observed during full run:', kenneyRequests.length)

await browser.close()
