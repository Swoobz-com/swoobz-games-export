import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-grindqa-vault-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

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
const topbar = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
const hud = (p) => p.evaluate(() => document.querySelector('[data-testid="vault-grid-hud-inner"], [data-testid="vault-settled-banner"]')?.textContent.replace(/\s+/g,' ').trim() || 'NONE')
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1000)
}
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col+0.5)/cols), box.y + box.h * ((row+0.5)/cols)) }

// dump every element bearing testid containing 'session' / 'pulse' / 'meta' / 'rhythm' / 'gutter'
async function domCensus(p) {
  return p.evaluate(() => {
    const out = []
    document.querySelectorAll('[data-testid]').forEach((el) => {
      const tid = el.getAttribute('data-testid')
      if (/session|pulse|meta|rhythm|gutter/i.test(tid)) {
        out.push({ tid, visible: el.offsetParent !== null, text: (el.textContent||'').replace(/\s+/g,' ').trim().slice(0,120) })
      }
    })
    return out
  })
}
async function pointsCardText(p) {
  return p.evaluate(() => {
    // Leaf-only match (no element children) so we don't bubble up to a giant
    // wrapper div — the ownership-points row renders as a small <span>"pts · ...".
    const all = [...document.querySelectorAll('body *')]
    const leafHits = all.filter((e) => e.children.length === 0 && /pts\s*·/i.test(e.textContent || ''))
    const sessionMetaLabel = all.find((e) => e.children.length === 0 && /^SESSION META$/.test((e.textContent||'').trim()))
    const parentGroup = leafHits[0]?.parentElement
    return {
      leafHitCount: leafHits.length,
      leafTexts: leafHits.map((e) => e.textContent.trim()),
      groupText: parentGroup ? parentGroup.textContent.replace(/\s+/g,' ').trim().slice(0,200) : null,
      sessionMetaLabelPresent: !!sessionMetaLabel,
      bodyHasPtsSubstring: /\bpts\b/i.test(document.body.textContent || ''),
    }
  })
}
async function rhythmBadge(p) {
  return p.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
    return el ? { present: true, text: (el.textContent||'').trim(), visible: el.offsetParent !== null } : { present: false }
  })
}

const results = { desktop1440: {}, desktop1920: {}, mobilePixel7: {}, mobileIphone14: {} }

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR', m.text().slice(0,200)) })

async function runDesktopPass(width, height, key) {
  console.log(`\n===== DESKTOP ${width}x${height} =====`)
  await p.setViewport({ width, height, deviceScaleFactor: 1 })
  await clearAndGo(p)
  await p.screenshot({ path: `${OUT}/${key}-00-betentry.png` })

  // Set wager to 5 USDC via preset chip labelled "5" (exact match)
  const setWager = await clickText(p, '5', '[data-testid="vault-ctl-wager"]') || await clickText(p, '5')
  await wait(300)
  console.log('wager preset "5" clicked:', setWager)
  await p.screenshot({ path: `${OUT}/${key}-01-wager5.png` })

  // ---- ROUND 1: force a WIN with a couple of quick taps then take profit ----
  let round1Won = false
  for (let attempt = 0; attempt < 20 && !round1Won; attempt++) {
    await clearAndGo(p)
    await clickText(p, '5', '[data-testid="vault-ctl-wager"]')
    await wait(200)
    await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)
    const box = await boardBox(p)
    if (!box) { console.log('no board box, retry'); continue }
    let rugged = false
    const tapTimestamps = []
    for (let i = 0; i < 3 && !rugged; i++) {
      const before = await topbar(p)
      await tapCell(p, box, (i * 2) % 5, Math.floor(i / 2), 5)
      tapTimestamps.push(Date.now())
      await wait(350) // quick taps, well under RHYTHM_WINDOW_MS=1400
      const tb = await topbar(p)
      if (/RUGGED/i.test(tb)) { rugged = true; break }
      if (i === 2) {
        // capture rhythm badge state right after the 3rd quick safe tap
        const rb = await rhythmBadge(p)
        console.log(`attempt ${attempt} tap${i+1} rhythm badge:`, JSON.stringify(rb), '| hud:', await hud(p))
        if (rb.present) await p.screenshot({ path: `${OUT}/${key}-02-rhythmbadge-attempt${attempt}.png` })
      }
    }
    if (rugged) { console.log(`attempt ${attempt} rugged, retry`); continue }
    // cash out for the WIN
    const cashed = await clickText(p, 'take profit') || await clickText(p, 'cash out')
    await wait(1200)
    const tb = await topbar(p)
    console.log('after cash topbar:', tb, 'cashClicked:', cashed)
    if (/SETTLED\s*·\s*WIN/i.test(tb)) round1Won = true
  }
  console.log('ROUND 1 WIN achieved:', round1Won)
  await p.screenshot({ path: `${OUT}/${key}-03-round1-win-settled-full.png` })
  const win1Points = await pointsCardText(p)
  const win1Census = await domCensus(p)
  console.log('ROUND1 (WIN) points card text:', win1Points)
  console.log('ROUND1 (WIN) DOM census:', JSON.stringify(win1Census))
  results[key].round1WinPointsText = win1Points
  results[key].round1WinCensus = win1Census

  // crop the control-column / settled region for visual evidence
  await p.screenshot({ path: `${OUT}/${key}-03b-round1-win-settled-controlcol.png`, clip: { x: Math.max(0, width - 340), y: 0, width: Math.min(340, width), height } }).catch(()=>{})

  // ---- ROUND 2: BET AGAIN then force a LOSS (tap until mine hit) ----
  const betAgain = await clickText(p, 'bet again') || await clickText(p, 'send it')
  console.log('bet-again clicked:', betAgain)
  await wait(900)
  const box2 = await boardBox(p)
  let lossSettled = false
  if (box2) {
    for (let i = 0; i < 25 && !lossSettled; i++) {
      const tb = await topbar(p)
      if (/SETTLED/i.test(tb)) break
      await tapCell(p, box2, i % 5, Math.floor(i / 5) % 5, 5)
      await wait(400)
      const tb2 = await topbar(p)
      if (/SETTLED\s*·\s*LOSS/i.test(tb2) || /SETTLING/i.test(tb2)) {
        await wait(900)
        lossSettled = true
      }
    }
  }
  const finalTb = await topbar(p)
  console.log('ROUND 2 final topbar:', finalTb, 'lossSettled flag:', lossSettled)
  await p.screenshot({ path: `${OUT}/${key}-04-round2-loss-settled-full.png` })
  const loss2Points = await pointsCardText(p)
  const loss2Census = await domCensus(p)
  console.log('ROUND2 (LOSS) points card text:', loss2Points)
  console.log('ROUND2 (LOSS) DOM census:', JSON.stringify(loss2Census))
  results[key].round2LossPointsText = loss2Points
  results[key].round2LossCensus = loss2Census
  results[key].round2FinalTopbar = finalTb

  // ---- ROUND 3: bet again -> Playing phase census (session pulse single-instance check) ----
  await clickText(p, 'bet again')
  await wait(900)
  const playingCensus = await domCensus(p)
  console.log('PLAYING PHASE census:', JSON.stringify(playingCensus))
  results[key].playingCensus = playingCensus
  await p.screenshot({ path: `${OUT}/${key}-05-playing.png` })
}

await runDesktopPass(1440, 900, 'desktop1440')
await runDesktopPass(1920, 1080, 'desktop1920')

// ---- MOBILE PASSES ----
async function runMobilePass(width, height, key) {
  console.log(`\n===== MOBILE ${width}x${height} =====`)
  await p.setViewport({ width, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await clearAndGo(p)
  await p.screenshot({ path: `${OUT}/${key}-00-betentry.png` })
  const census0 = await domCensus(p)
  console.log('MOBILE bet-entry census:', JSON.stringify(census0))
  results[key].betEntryCensus = census0

  await clickText(p, 'send it')
  await wait(900)
  const censusPlaying = await domCensus(p)
  console.log('MOBILE playing census:', JSON.stringify(censusPlaying))
  results[key].playingCensus = censusPlaying
  await p.screenshot({ path: `${OUT}/${key}-01-playing.png` })

  const box = await boardBox(p)
  if (box) {
    await tapCell(p, box, 2, 2, 5); await wait(500)
    const tb = await topbar(p)
    if (!/RUGGED/i.test(tb)) {
      const cashed = await clickText(p, 'take profit') || await clickText(p, 'cash out')
      await wait(1200)
      console.log('mobile cash clicked:', cashed, 'topbar:', await topbar(p))
    }
  }
  await p.screenshot({ path: `${OUT}/${key}-02-settled.png` })
  const settledCensus = await domCensus(p)
  const settledPoints = await pointsCardText(p)
  console.log('MOBILE settled census:', JSON.stringify(settledCensus))
  console.log('MOBILE settled points text:', settledPoints)
  results[key].settledCensus = settledCensus
  results[key].settledPointsText = settledPoints
}

await runMobilePass(412, 915, 'mobilePixel7')
await runMobilePass(393, 852, 'mobileIphone14')

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
await b.close()
console.log('\nDONE grindqa-vault-0707')
