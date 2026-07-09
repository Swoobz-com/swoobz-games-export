import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5175/'
const OUT = 'shots-FINAL-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Banned tokens (electrical-current / mining register leftovers) — check against
// what a player actually READS (body innerText), not source.
const JARGON_RE = /(current-key|current runs|plunge the current|\bconduit\b|\bvein\b|\bore\b|refinery|\bmine\b|mining)/i
const EMDASH_RE = /—/

const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,a,[role="button"]')]
    return els.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}

const canvasBox = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

const dump = async (page, label) => {
  const text = await page.evaluate(() => document.body.innerText)
  fs.writeFileSync(`${OUT}/${label}.txt`, text)
  return {
    label,
    emdash: EMDASH_RE.test(text),
    jargonHits: (text.match(new RegExp(JARGON_RE, 'gi')) || []),
  }
}

const report = { phases: [] }
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

// ── PHASE 1: LOBBY SPLASH ──
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)
await page.screenshot({ path: `${OUT}/01-lobby-splash.png` })
report.phases.push(await dump(page, '01-lobby'))

// full-page high-res lobby capture for pixel scan
await page.screenshot({ path: `${OUT}/01b-lobby-splash-hi.png`, fullPage: false })

// ── PHASE 2: PLANNING (+ IntroCoachmark, first-time localStorage-gated) ──
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(500)
await page.screenshot({ path: `${OUT}/02-planning-with-coachmark.png` })
report.phases.push(await dump(page, '02-planning-coachmark'))

// paint MIN_TRAIL(8)+1 tiles on the 10x10 board, snake pattern
const box = await canvasBox(page)
report.canvasBoxPlanning = box
const tile = box.w / 10
let r = 8, c = 4
for (let i = 0; i < 9; i++) {
  await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
  await wait(40)
  r -= 1
  if (i % 2 === 1) c += 1
}
await wait(200)
await page.screenshot({ path: `${OUT}/03-planning-armed.png` })
report.phases.push(await dump(page, '03-planning-armed'))

// ── PHASE 3: ASSAYING (mid-cascade, live run) ──
await clickText(page, 'RUN THE LINE')
await wait(120)
await page.screenshot({ path: `${OUT}/04-assaying-midcascade-a.png` })
await wait(150)
await page.screenshot({ path: `${OUT}/04-assaying-midcascade-b.png` })
report.phases.push(await dump(page, '04-assaying'))
await wait(1500)

// ── PHASE 4: SETTLED (whatever this round produced) ──
await page.screenshot({ path: `${OUT}/05-settled-first.png` })
report.phases.push(await dump(page, '05-settled-first'))
const firstOutcome = await page.evaluate(() => {
  const t = document.body.innerText
  return { won: /CLAIM PROVEN/.test(t), bust: /BUSTED/.test(t) }
})
report.firstOutcome = firstOutcome

// ── PHASE 5: PLAY SAFE panel ──
const opened = await clickText(page, 'PLAY SAFE')
await wait(300)
report.playSafeOpened = opened
if (opened) {
  await page.screenshot({ path: `${OUT}/06-playsafe-panel.png` })
  report.phases.push(await dump(page, '06-playsafe-panel'))
  // close it again
  await clickText(page, 'CLOSE')
  await wait(200)
}

await page.close()

// ── PHASE 6/7: force a WIN and a BUST independently to guarantee both settle registers seen ──
async function playRound(wantWin, maxAttempts) {
  const p = await browser.newPage()
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  let achieved = false
  for (let attempt = 0; attempt < maxAttempts && !achieved; attempt++) {
    await p.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(300)
    await clickText(p, 'ENTER THE ASSAY LINE')
    await wait(300)
    const b = await canvasBox(p)
    const t = b.w / 10
    let rr = 8, cc = 4
    for (let i = 0; i < 8; i++) {
      await p.mouse.click(b.x + cc * t + t / 2, b.y + rr * t + t / 2)
      await wait(30)
      rr -= 1
      if (i % 2 === 1) cc += 1
    }
    await wait(120)
    await clickText(p, 'RUN THE LINE')
    await wait(2500)
    const info = await p.evaluate(() => {
      const txt = document.body.innerText
      return { won: /CLAIM PROVEN/.test(txt), bust: /BUSTED/.test(txt) }
    })
    if ((wantWin && info.won) || (!wantWin && info.bust)) achieved = true
  }
  return { page: p, achieved }
}

const winRes = await playRound(true, 16)
report.forcedWinAchieved = winRes.achieved
if (winRes.achieved) {
  await winRes.page.screenshot({ path: `${OUT}/07-settled-WIN.png` })
  report.phases.push(await dump(winRes.page, '07-settled-WIN'))
}
await winRes.page.close()

const bustRes = await playRound(false, 16)
report.forcedBustAchieved = bustRes.achieved
if (bustRes.achieved) {
  await bustRes.page.screenshot({ path: `${OUT}/08-settled-BUST.png` })
  report.phases.push(await dump(bustRes.page, '08-settled-BUST'))
}
await bustRes.page.close()

// ── Aggregate jargon / em-dash verdict ──
report.anyEmdash = report.phases.some((p) => p.emdash)
report.allJargonHits = report.phases.flatMap((p) => p.jargonHits.map((h) => `${p.label}: "${h}"`))

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
