import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
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
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function clickAriaLabel(page, label) {
  const h = await page.evaluateHandle((label) => {
    const els = [...document.querySelectorAll(`[aria-label]`)]
    return els.find((e) => e.getAttribute('aria-label') === label && e.offsetParent !== null) || null
  }, label)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

// Live TreeWalker scan for em-dash (U+2014) across text nodes, excluding <style>/<script>.
// Also scans aria-label / title attributes on every element.
async function scanEmDash(page, label) {
  const result = await page.evaluate(() => {
    const EMDASH = '—'
    const hits = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement
        if (!p) return NodeFilter.FILTER_REJECT
        const tag = p.tagName
        if (tag === 'STYLE' || tag === 'SCRIPT') return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    let n
    while ((n = walker.nextNode())) {
      if (n.nodeValue && n.nodeValue.includes(EMDASH)) {
        hits.push({ type: 'text', value: n.nodeValue.trim().slice(0, 140), tag: n.parentElement.tagName, cls: n.parentElement.className?.toString().slice(0,60) })
      }
    }
    // attribute scan
    const all = document.querySelectorAll('*')
    for (const el of all) {
      for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
        const v = el.getAttribute(attr)
        if (v && v.includes(EMDASH)) {
          hits.push({ type: 'attr:' + attr, value: v, tag: el.tagName })
        }
      }
    }
    return hits
  })
  console.log(`--- EM-DASH SCAN [${label}]: ${result.length} hit(s) ---`)
  if (result.length) console.log(JSON.stringify(result, null, 2))
  return result
}

async function getText(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? el.textContent : null
  }, selector)
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  const allHits = {}

  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)

  // PHASE: bet-entry
  await page.screenshot({ path: '_revault2-1-betentry.png' })
  allHits['bet-entry'] = await scanEmDash(page, 'bet-entry')

  // Select bluechips world (min rugs 1, band)
  await clickText(page, 'bluechips')
  await wait(200)

  // Reduce rugs to 1 via "Fewer rugs" button repeatedly
  for (let i = 0; i < 6; i++) {
    await clickAriaLabel(page, 'Fewer rugs')
    await wait(60)
  }
  await wait(150)
  const rugsTunerText = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')]
    const el = els.find((e) => e.textContent && /^\d+\s*$/.test('') && false)
    return null
  })
  // grab the rug stepper value text directly
  const rugStepText = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')]
    const target = spans.find((s) => /rug/i.test(s.textContent || '') && /^\d+\s*rugs?$/i.test((s.textContent||'').trim()))
    return target ? target.textContent : null
  })
  console.log('RUG STEPPER TEXT (expect "1 rug" singular):', rugStepText)
  await page.screenshot({ path: '_revault2-2-rugtuner-n1.png' })
  allHits['bet-entry-rug-n1'] = await scanEmDash(page, 'bet-entry-rug-n1')

  // World card rug plural text scan (bluechips=3 rugs, altseason=5 rugs, shitcoin=24 rugs) — grab all "N rug(s)" chips
  const worldCardTexts = await page.evaluate(() => {
    return [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /\d+\s*rugs?\b/i.test(e.textContent||'')).map(e => e.textContent.trim())
  })
  console.log('WORLD-CARD rug{s} texts:', JSON.stringify(worldCardTexts))

  // Open HOW TO PLAY modal
  const opened = await clickAriaLabel(page, 'How to play Rug or Riches') || await (async () => {
    // fallback: find an element with text "how to play" or a button toggling it
    return clickText(page, 'how to play')
  })()
  await wait(300)
  await page.screenshot({ path: '_revault2-3-howtoplay.png' })
  allHits['how-to-play-modal'] = await scanEmDash(page, 'how-to-play-modal')
  // Close modal
  await clickAriaLabel(page, 'Close')
  await wait(200)

  // Set the wager / send it -> Playing phase
  const sentIt = await clickText(page, 'send it')
  console.log('sendIt clicked:', sentIt)
  await wait(700)
  await page.screenshot({ path: '_revault2-4-playing.png' })
  allHits['playing'] = await scanEmDash(page, 'playing')

  // Check BET · LOCKED panel (desktop wide gated)
  const lockedPanel = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-ctl-wager-locked"]')
    if (!el) return null
    const labelSpan = el.querySelector('span')
    const ariaLabels = [...el.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label'))
    return { label: labelSpan ? labelSpan.textContent : null, ariaLabels, fullText: el.textContent }
  })
  console.log('LOCKED PANEL (expect "BET · LOCKED", no Dutch):', JSON.stringify(lockedPanel))

  // Tap tiles: reduce safe count, watch SAFE(S) LEFT text at each step (header tape + gutter card leftText)
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  console.log('canvas box:', JSON.stringify(box))

  async function readSafeLeftTexts() {
    return page.evaluate(() => {
      const spans = [...document.querySelectorAll('span, div')]
      const hits = spans.filter(s => s.children.length === 0 && /SAFE.{0,2}LEFT/i.test(s.textContent || '')).map(s => s.textContent.trim())
      return [...new Set(hits)]
    })
  }
  console.log('SAFE LEFT before any tap:', JSON.stringify(await readSafeLeftTexts()))

  // Tap a grid cell -- use fractional coords inside the drawn board region.
  // Take screenshot-first approach: click near center-left, avoiding backdrop margin.
  await page.mouse.click(box.x + box.w * 0.35, box.y + box.h * 0.35)
  await wait(500)
  await page.screenshot({ path: '_revault2-5-after-tap1.png' })
  console.log('SAFE LEFT after tap 1:', JSON.stringify(await readSafeLeftTexts()))
  allHits['playing-after-tap'] = await scanEmDash(page, 'playing-after-tap')

  // Try to cash out (take profit) and capture settled WIN quickly
  const cashoutClicked = await clickText(page, 'take profit')
  console.log('cashout clicked:', cashoutClicked)
  await wait(120) // capture within ~150ms of cash-out per HERO_VISIBLE_MS=2000
  await page.screenshot({ path: '_revault2-6-settled-win-hero-120ms.png' })
  const heroTextEarly = await page.evaluate(() => document.body.innerText)
  fs.writeFileSync('_revault2-settled-win-innertext-early.txt', heroTextEarly)
  allHits['settled-win-early'] = await scanEmDash(page, 'settled-win-early')

  await wait(400)
  await page.screenshot({ path: '_revault2-7-settled-win-520ms.png' })
  const heroTextLate = await page.evaluate(() => document.body.innerText)
  fs.writeFileSync('_revault2-settled-win-innertext-late.txt', heroTextLate)
  allHits['settled-win-late'] = await scanEmDash(page, 'settled-win-late')

  // Search settled body for narrative words (took / take, secured, took profit)
  const narrativeGrep = await page.evaluate(() => {
    const text = document.body.innerText
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    return lines.filter(l => /took|take|secured|bag|profit|rug/i.test(l))
  })
  console.log('NARRATIVE LINES (settled):', JSON.stringify(narrativeGrep, null, 2))

  await browser.close()
  fs.writeFileSync('_revault2-emdash-summary.json', JSON.stringify(allHits, null, 2))
  console.log('=== SUMMARY ===')
  for (const [k, v] of Object.entries(allHits)) {
    console.log(k, ':', v.length, 'hits')
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
