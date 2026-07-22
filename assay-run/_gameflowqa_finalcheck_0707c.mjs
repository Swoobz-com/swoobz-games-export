// swoobz-game-flow-qa — ABYSS LINE (assay) consolidated end-gate CHECK ROUND.
// Own independent driver. No source edits. Live localhost:5182.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-gameflowqa-finalcheck-0707c'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, txt) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b && !b.disabled) { b.click(); return true }
    return false
  }, txt)
}
async function bodyText(page) { return page.evaluate(() => document.body.innerText) }
async function getCanvasBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
async function paintTiles(page, n) {
  const box = await getCanvasBox(page)
  const dim = 14
  const tile = box.w / dim
  const coords = []
  let count = 0
  for (let row = 0; row < dim && count < n; row++) {
    for (let col = 0; col < dim && count < n; col++) { coords.push([row, col]); count++ }
  }
  for (const [row, col] of coords) {
    await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
    await wait(15)
  }
  return count
}
async function setPace(page, target) {
  for (let i = 0; i < 3; i++) {
    const txt = await bodyText(page)
    const isInstant = txt.includes('PACE: INSTANT')
    const isStaggered = txt.includes('PACE: DUCAT-BY-DUCAT')
    if (target === 'instant' && isInstant) return true
    if (target === 'staggered' && isStaggered) return true
    if (!isInstant && !isStaggered) return false
    await clickText(page, 'PACE:')
    await wait(60)
  }
  return false
}
async function setTier(page, label) {
  await clickText(page, label)
  await wait(60)
  const txt = await bodyText(page)
  return txt.includes(label)
}
async function goToPlanning(page) {
  const txt = await bodyText(page)
  if (txt.includes('ENTER THE DIVE')) { await clickText(page, 'ENTER THE DIVE'); await wait(150) }
}
async function clearTrail(page) { await clickText(page, 'CLEAR'); await wait(40) }

async function installSampler(page) {
  await page.evaluate(() => {
    window.__frames = []
    window.__flies = []
    window.__t0 = performance.now()
    window.__badVeinAt = null
    window.__settledAt = null
    if (window.__mo) window.__mo.disconnect()
    const mo = new MutationObserver((muts) => {
      const now = performance.now() - window.__t0
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && node.tagName === 'IMG') window.__flies.push(now)
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
    window.__mo = mo
    if (window.__poll) clearInterval(window.__poll)
    window.__poll = setInterval(() => {
      const now = performance.now() - window.__t0
      const bodyTxt = document.body.innerText
      const badVein = bodyTxt.includes('Dive busted')
      const settled = bodyTxt.includes('RUGGED BY THE DEEP') || bodyTxt.includes('SECURED THE HAUL')
      if (window.__badVeinAt == null && badVein) window.__badVeinAt = now
      if (window.__settledAt == null && settled) window.__settledAt = now
      window.__frames.push({ t: Math.round(now * 100) / 100, coinImgCount: document.querySelectorAll('img').length, badVein, settled })
    }, 6)
  })
}
async function readSampler(page) {
  return page.evaluate(() => ({ frames: window.__frames || [], flies: window.__flies || [], badVeinAt: window.__badVeinAt, settledAt: window.__settledAt }))
}
async function stopSampler(page) {
  await page.evaluate(() => { if (window.__mo) window.__mo.disconnect(); if (window.__poll) clearInterval(window.__poll) })
}
async function waitForSettled(page, maxMs) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const txt = await bodyText(page)
    if ((txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL')) && txt.includes('WRECK RECKONING')) return true
    await wait(40)
  }
  return false
}
async function readHeroPop(page) {
  // HeroPopCallout — win-only cartouche with $amount + multiplier
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('div')].filter((d) => d.textContent && d.textContent.includes('SECURED THE HAUL') && d.textContent.includes('$'))
    if (!nodes.length) return { present: false }
    const el = nodes[nodes.length - 1]
    const r = el.getBoundingClientRect()
    return { present: true, text: el.textContent, rect: { x: r.x, y: r.y, w: r.width, h: r.height } }
  })
}
async function readCert(page) {
  return page.evaluate(() => {
    const headingDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && (d.textContent === 'RUGGED BY THE DEEP' || d.textContent === 'SECURED THE HAUL'))
    if (!headingDiv) return null
    const payoutLabel = [...document.querySelectorAll('div')].find((d) => d.textContent === 'PAYOUT')
    const payoutVal = payoutLabel && payoutLabel.parentElement ? payoutLabel.parentElement.children[1]?.textContent : null
    const bodyTxt = document.body.innerText
    const wreckMatch = bodyTxt.match(/WRECK RECKONING\s*[·◆]*\s*([^\n]+)/)
    const seedPresent = /seed\s+[0-9a-f]{16,}/i.test(bodyTxt) || bodyTxt.includes('seed')
    const hashPresent = bodyTxt.includes('hash')
    const roundPresent = /round\s+[0-9a-f]/i.test(bodyTxt)
    return { heading: headingDiv.textContent, payout: payoutVal, wreckLine: wreckMatch ? wreckMatch[0] : null, seedPresent, hashPresent, roundPresent }
  })
}
async function heroPopStaleCount(page) {
  return page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.textContent && d.textContent.includes('SECURED THE HAUL') && d.textContent.includes('$')).length)
}
async function readBetDisplay(page) {
  return page.evaluate(() => {
    const label = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'YOUR BET')
    if (!label || !label.parentElement) return null
    return label.parentElement.textContent
  })
}

const results = { viewports: {}, consoleErrors: [], pageErrors: [] }
const wpush = (r) => console.log(JSON.stringify(r))

async function runCombo({ page, tierLabel, pace, trailSize, cellName, restartMethod, wantWin }) {
  await goToPlanning(page)
  await clearTrail(page)
  const tierOk = await setTier(page, tierLabel)
  const paceOk = await setPace(page, pace)
  const painted = await paintTiles(page, trailSize)
  await wait(80)

  await installSampler(page)
  const clicked = await clickText(page, 'RUN THE LINE')
  const settled = await waitForSettled(page, 9000)
  await wait(160)
  const sample = await readSampler(page)
  await stopSampler(page)

  const cert = await readCert(page)
  const won = cert && cert.heading === 'SECURED THE HAUL'
  const heroPop = won ? await readHeroPop(page) : { present: false }

  const badVeinAt = sample.badVeinAt
  const flyCountAtOrAfterBomb = badVeinAt != null ? sample.flies.filter((t) => t >= badVeinAt - 0.01).length : null
  const flyCountBeforeBomb = badVeinAt != null ? sample.flies.filter((t) => t < badVeinAt - 0.01).length : sample.flies.length

  await page.screenshot({ path: `${OUT}/${cellName}-settled.png` })

  const cellResult = {
    cellName, tierLabel, pace, trailSize, painted, tierOk, paceOk, runClicked: clicked, settledReached: settled, won,
    badVeinAtMs: badVeinAt != null ? Math.round(badVeinAt) : null,
    settledAtMs: sample.settledAt != null ? Math.round(sample.settledAt) : null,
    totalFlies: sample.flies.length, flyCountAtOrAfterBomb, flyCountBeforeBomb,
    heroPop, cert,
  }

  // restart probe
  const preOverlayHeroCount = await heroPopStaleCount(page)
  const t0 = Date.now()
  if (restartMethod === 'dive-again') await clickText(page, 'DIVE AGAIN')
  else await clickText(page, 'SAME LINE')
  await wait(220)
  const restartLatencyMs = Date.now() - t0
  const afterTxt = await bodyText(page)
  const restartOk = /RUN THE LINE/i.test(afterTxt) || /Select .* more ducat/i.test(afterTxt) || /Claim line marked/i.test(afterTxt)
  const staleHeroPopAfterRestart = await heroPopStaleCount(page)
  await page.screenshot({ path: `${OUT}/${cellName}-after-restart.png` })

  cellResult.restart = { restartMethod, restartOk, restartLatencyMs, preOverlayHeroCount, staleHeroPopAfterRestart }
  wpush(cellResult)
  return cellResult
}

async function coachmarkAndLobbyProbe(page, vpName) {
  const httpResp = await page.goto(URL, { waitUntil: 'networkidle0' })
  const httpStatus = httpResp.status()
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} })
  const t0 = Date.now()
  await page.reload({ waitUntil: 'load' })
  await wait(300)
  const txtEarly = await bodyText(page)
  const coachmarkSurfaced = /RUN THE LINE to commit once|ALL-OR-NOTHING|tap any tiles/i.test(txtEarly) || (await page.evaluate(() => !!document.body.innerText.match(/PAINT a line/i)))
  const coachmarkSurfacedWithinMs = Date.now() - t0
  await page.screenshot({ path: `${OUT}/${vpName}-01-lobby-fresh.png` })
  // dismiss if any dismiss/got-it/close-ish control exists near a coachmark banner
  const dismissed = await page.evaluate(() => {
    const cands = [...document.querySelectorAll('button')].filter((b) => /got it|dismiss|close|ok/i.test(b.textContent || ''))
    if (cands.length) { cands[0].click(); return true }
    return false
  })
  await wait(150)
  const lobbyTxt = await bodyText(page)
  const lobbyReachable = lobbyTxt.includes('ENTER THE DIVE')
  return { httpStatus, coachmarkSurfaced, coachmarkSurfacedWithinMs, dismissed, lobbyReachable }
}

async function betEntryProbe(page) {
  await goToPlanning(page)
  const before = await readBetDisplay(page)
  await clickText(page, '5')
  await wait(100)
  const after5 = await readBetDisplay(page)
  await clickText(page, '25')
  await wait(100)
  const after25 = await readBetDisplay(page)
  return { before, after5, after25, changed: before !== after25 }
}

async function runViewport(browser, vp, vpName, mobile) {
  const page = await browser.newPage()
  const localErrors = []
  page.on('console', (m) => { if (m.type() === 'error') { results.consoleErrors.push(`[${vpName}] ${m.text()}`); localErrors.push(m.text()) } })
  page.on('pageerror', (e) => { results.pageErrors.push(`[${vpName}] ${e.message}`); localErrors.push(e.message) })
  await page.setViewport(vp)

  const lobby = await coachmarkAndLobbyProbe(page, vpName)
  console.log(`[${vpName}] lobby probe:`, JSON.stringify(lobby))

  const betEntry = await betEntryProbe(page)
  console.log(`[${vpName}] bet-entry probe:`, JSON.stringify(betEntry))
  await page.screenshot({ path: `${OUT}/${vpName}-02-planning-betentry.png` })

  const cells = {}
  // staggered-bust -> DIVE AGAIN restart
  let a = null, attempt = 0
  while (attempt < 12 && (!a || a.won)) { a = await runCombo({ page, tierLabel: 'HADAL TRENCH', pace: 'staggered', trailSize: 40, cellName: `${vpName}-staggered-bust-${attempt}`, restartMethod: 'dive-again' }); attempt++ }
  cells.staggeredBust = a

  // instant-bust -> SAME LINE restart
  let b = null; attempt = 0
  while (attempt < 12 && (!b || b.won)) { b = await runCombo({ page, tierLabel: 'HADAL TRENCH', pace: 'instant', trailSize: 40, cellName: `${vpName}-instant-bust-${attempt}`, restartMethod: 'same-line' }); attempt++ }
  cells.instantBust = b

  // staggered-win -> DIVE AGAIN restart
  let c = null; attempt = 0
  while (attempt < 20 && (!c || !c.won)) { c = await runCombo({ page, tierLabel: 'REEF SHELF', pace: 'staggered', trailSize: 8, cellName: `${vpName}-staggered-win-${attempt}`, restartMethod: 'dive-again' }); attempt++ }
  cells.staggeredWin = c

  // instant-win -> SAME LINE restart
  let d = null; attempt = 0
  while (attempt < 20 && (!d || !d.won)) { d = await runCombo({ page, tierLabel: 'REEF SHELF', pace: 'instant', trailSize: 8, cellName: `${vpName}-instant-win-${attempt}`, restartMethod: 'same-line' }); attempt++ }
  cells.instantWin = d

  await page.close()
  results.viewports[vpName] = { lobby, betEntry, cells, consoleErrorsCount: localErrors.length }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })

await runViewport(browser, { width: 1440, height: 900, deviceScaleFactor: 1 }, 'desktop', false)
await runViewport(browser, { width: 412, height: 915, deviceScaleFactor: 2 }, 'pixel7', true)

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log('\n\n=== FINAL SUMMARY ===')
for (const [vp, r] of Object.entries(results.viewports)) {
  console.log(`\n--- ${vp} ---`)
  console.log('lobby:', JSON.stringify(r.lobby))
  console.log('betEntry:', JSON.stringify(r.betEntry))
  for (const [k, c] of Object.entries(r.cells)) {
    if (!c) { console.log(k, '=> NEVER REACHED (null)'); continue }
    console.log(k, '=> won:', c.won, 'settled:', c.settledReached, 'flyAtOrAfterBomb:', c.flyCountAtOrAfterBomb, 'heroPop:', JSON.stringify(c.heroPop), 'cert:', JSON.stringify(c.cert), 'restart:', JSON.stringify(c.restart))
  }
}
console.log('\nCONSOLE ERRORS TOTAL:', results.consoleErrors.length)
results.consoleErrors.forEach((e) => console.log(' -', e))
console.log('PAGE ERRORS TOTAL:', results.pageErrors.length)
results.pageErrors.forEach((e) => console.log(' -', e))

await browser.close()
console.log('\nDONE.', OUT)
