import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-fairnessqa-0707'
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
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

const topbarText = (p) => p.evaluate(() => {
  const el = document.querySelector('[data-testid="vault-grid-topbar"]') || document.body
  return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200)
})

async function boardBox(p) {
  return p.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}

async function domSnapshot(p) {
  return p.evaluate(() => {
    const q = (sel) => document.querySelector(sel)
    const txt = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null)
    const receipt = q('[data-testid="vault-ctl-receipt"]') || q('[data-testid="vault-gutter-right"]')
    const receiptCard = q('[data-testid="vault-settled-receipt-card"]')
    const toggle = document.querySelector('.vault-receipt-toggle')
    const meta = q('[data-testid="vault-settled-meta"]') || q('[data-testid="vault-ctl-session"]')
    const bannerEl = q('[data-testid="vault-settled-banner"]')
    const hero = q('[data-testid="vault-hud-pump-hero"]')
    const bodyText = document.body.textContent || ''
    return {
      receiptWrapperExists: !!receipt,
      receiptCardExists: !!receiptCard,
      receiptCardText: txt(receiptCard),
      toggleExists: !!toggle,
      toggleText: txt(toggle),
      toggleAriaExpanded: toggle ? toggle.getAttribute('aria-expanded') : null,
      sessionMetaExists: !!q('[data-testid="vault-settled-meta"]'),
      sessionMetaText: txt(q('[data-testid="vault-settled-meta"]')),
      bannerExists: !!bannerEl,
      bannerText: txt(bannerEl),
      heroText: txt(hero),
      hasSessionMetaAnywhere: bodyText.includes('SESSION META'),
      has15xAnywhere: /1\.5x|1\.5×/.test(bodyText),
      hasPtsAnywhere: /pts ·/.test(bodyText),
      modalOpen: !!document.querySelector('[role="dialog"]'),
      bodyTextSlice: bodyText.replace(/\s+/g, ' ').trim().slice(0, 400),
    }
  })
}

async function expandedReceiptDom(p) {
  return p.evaluate(() => {
    const dl = document.querySelector('#vault-gutter-settled-receipt dl, #vault-settled-receipt dl')
    if (!dl) return null
    const rows = [...dl.querySelectorAll('dt,dd')].map((e) => ({
      tag: e.tagName, text: (e.title || e.textContent || '').trim(),
    }))
    return rows
  })
}

async function clearAndReload(p, port) {
  try {
    await p.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' })
    await p.evaluate(() => { try { localStorage.clear() } catch {} ; try { sessionStorage.clear() } catch {} })
  } catch {}
  await p.reload({ waitUntil: 'networkidle0' })
  await wait(600)
}

async function dismissOnboarding(p) {
  await clickText(p, 'got it')
  await clickText(p, 'skip')
  await clickText(p, 'ape in')
  await wait(300)
}

async function readWorldPickerRtp(p) {
  return p.evaluate(() => {
    const wp = document.querySelector('[data-testid="vault-board-worldpicker"]')
    if (!wp) return null
    return (wp.textContent || '').replace(/\s+/g, ' ').trim()
  })
}

async function driveToSettled(p, { mode, forceLoss }) {
  // land on bet-entry (splash removed -> bet-entry is default)
  await dismissOnboarding(p)
  await wait(300)
  await clickText(p, mode)
  await wait(250)
  const sendOk = await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]') || await clickText(p, 'send it')
  await wait(900)
  let box = await boardBox(p)
  if (!box) return { ok: false, reason: 'no board box' }

  if (forceLoss) {
    // click many tiles across the grid until settled (mine-hit) — high mine
    // density mode (shitcoin, 24/49) makes this fast and near-certain.
    let settledOk = false
    for (let i = 0; i < 40; i++) {
      const t = await topbarText(p)
      if (/RUGGED|SETTLED|\bBUST\b/.test(t)) { settledOk = true; break }
      const cols = 7
      const fx = 0.06 + (i % cols) * 0.13
      const fy = 0.06 + Math.floor(i / cols) * 0.13
      box = await boardBox(p)
      if (box) {
        try {
          await p.mouse.move(box.x + box.w * fx, box.y + box.h * fy)
          await wait(40)
          await p.mouse.down()
          await wait(60)
          await p.mouse.up()
        } catch {}
      }
      await wait(400)
    }
    await wait(700)
    if (!settledOk) {
      const t2 = await topbarText(p)
      if (/RUGGED|SETTLED|\bBUST\b/.test(t2)) settledOk = true
    }
    if (!settledOk) return { ok: false, reason: 'loss loop never settled after 40 clicks' }
  } else {
    // one safe reveal then cash out -> WIN
    box = await boardBox(p)
    await p.mouse.click(box.x + box.w * 0.5, box.y + box.h * 0.5)
    await wait(700)
    const cashed = await clickText(p, 'take profit') || await clickText(p, 'cash out')
    await wait(900)
    if (!cashed) return { ok: false, reason: 'no cash-out button found' }
  }
  return { ok: true }
}

async function run() {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
  const results = []
  const viewports = [
    { name: 'desktop-1440x900', width: 1440, height: 900, mobile: false },
    { name: 'desktop-1920x1080', width: 1920, height: 1080, mobile: false },
    { name: 'pixel7-412x915', width: 412, height: 915, mobile: true, dsf: 2 },
    { name: 'iphone14pro-393x852', width: 393, height: 852, mobile: true, dsf: 2 },
  ]
  for (const vp of viewports) {
    for (const outcome of ['win', 'loss']) {
      const p = await b.newPage()
      p.on('pageerror', (e) => console.log(`[${vp.name}/${outcome}] PAGEERROR`, e.message))
      await p.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf || 1 })
      await clearAndReload(p, PORT)
      // capture RTP disclosure at bet-entry BEFORE driving to settle (first combo per viewport reads it fresh)
      await dismissOnboarding(p)
      await wait(300)
      const rtpBetEntry = await readWorldPickerRtp(p)
      await p.screenshot({ path: `${OUT}/${vp.name}-betentry.png` })

      const mode = outcome === 'loss' ? 'shitcoin' : 'bluechips'
      const drive = await driveToSettled(p, { mode, forceLoss: outcome === 'loss' })
      const finalTopbar = await topbarText(p)
      await p.screenshot({ path: `${OUT}/${vp.name}-${outcome}-settled.png` })
      const snap = await domSnapshot(p)

      // try to open receipt if a toggle exists and isn't already expanded
      let expanded = null
      if (snap.toggleExists && snap.toggleAriaExpanded === 'false') {
        try {
          await p.evaluate(() => document.querySelector('.vault-receipt-toggle')?.click())
          await wait(400)
        } catch {}
      }
      await p.screenshot({ path: `${OUT}/${vp.name}-${outcome}-settled-receiptopen.png` })
      const snap2 = await domSnapshot(p)
      expanded = await expandedReceiptDom(p)

      results.push({
        viewport: vp.name, outcome, driveOk: drive.ok, driveReason: drive.reason || null,
        finalTopbar, rtpBetEntry, snapBeforeToggle: snap, snapAfterToggle: snap2, expandedReceiptRows: expanded,
      })
      await p.close()
    }
  }
  await b.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => { console.error('FATAL', e); process.exit(1) })
