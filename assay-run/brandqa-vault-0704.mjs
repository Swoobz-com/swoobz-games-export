import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-brandqa-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt, tag = 'button') => {
  const h = await page.evaluateHandle(({ t, tag }) => {
    const els = [...document.querySelectorAll(tag)]
    return els.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, { t: txt, tag })
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}

const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

// pixel-adjacency scan: strict brass/gold vs strict cyan/volt, N-px dilation
async function scanBuffer(page, buf, label, dilate) {
  const result = await page.evaluate(async ({ b64, dilate }) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64 })
    const cvs = document.createElement('canvas')
    cvs.width = img.naturalWidth; cvs.height = img.naturalHeight
    const ctx = cvs.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const W = cvs.width, H = cvs.height
    const data = ctx.getImageData(0, 0, W, H).data
    const N = W * H
    const brassMask = new Uint8Array(N)
    const cyanMask = new Uint8Array(N)
    // gold/brass family per registry: gold #FFC83D (255,200,61), brass ~ #caa040
    const isBrass = (r, g, b) => r > 125 && (r - b) > 55 && (r - g) > 15 && (g - b) > 20 && g < r
    // volt #00F0FF / cyan #29E6FF family: low red, very high g+b
    const isCyan = (r, g, b) => r < 70 && g > 190 && b > 210 && (b - r) > 150
    for (let i = 0; i < N; i++) {
      const o = i * 4
      const r = data[o], g = data[o + 1], b = data[o + 2], a = data[o + 3]
      if (a < 40) continue
      if (isBrass(r, g, b)) brassMask[i] = 1
      if (isCyan(r, g, b)) cyanMask[i] = 1
    }
    let dilated = brassMask
    for (let pass = 0; pass < dilate; pass++) {
      const next = new Uint8Array(N)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const idx = y * W + x
        if (dilated[idx]) { next[idx] = 1; continue }
        let hit = 0
        for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1 && !hit; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
          if (dilated[ny * W + nx]) hit = 1
        }
        next[idx] = hit
      }
      dilated = next
    }
    let brassCount = 0, cyanCount = 0, overlapCount = 0
    const hits = []
    for (let i = 0; i < N; i++) {
      if (brassMask[i]) brassCount++
      if (cyanMask[i]) cyanCount++
      if (cyanMask[i] && dilated[i]) { overlapCount++; if (hits.length < 30) hits.push({ x: i % W, y: Math.floor(i / W) }) }
    }
    return { W, H, brassCount, cyanCount, overlapCount, hits }
  }, { b64: buf, dilate })
  console.log(`${label}: brass=${result.brassCount} cyan=${result.cyanCount} overlap(dilate=${dilate}px)=${result.overlapCount}`, result.hits.slice(0, 6))
  return result
}

async function shootAndScan(page, label, dilate = 3) {
  const buf = await page.screenshot({ encoding: 'base64' })
  fs.writeFileSync(`${OUT}/full-${label}.png`, buf, 'base64')
  return scanBuffer(page, buf, label, dilate)
}

async function armTrail(page, n = 8) {
  const box = await canvasBox(page)
  const tile = box.w / 10
  for (let i = 0; i < n; i++) {
    await page.mouse.click(box.x + i * tile + tile / 2, box.y + tile / 2)
    await wait(40)
  }
}

async function fontProbe(page) {
  return page.evaluate(() => {
    const findByText = (re) => [...document.querySelectorAll('div,span,b,p,button,strong')]
      .filter((el) => el.children.length === 0 && re.test(el.textContent || ''))
    const describe = (el) => ({
      text: (el.textContent || '').slice(0, 40),
      fontFamily: getComputedStyle(el).fontFamily,
    })
    const balance = findByText(/^\s*\d[\d.,]*\s*$/).slice(0, 5).map(describe)
    const rtp = findByText(/RTP\s*\d/).slice(0, 3).map(describe)
    const bodyProse = findByText(/Paint a claim-line|Select \d|Claim-line armed|nubs proven/).slice(0, 5).map(describe)
    return { balance, rtp, bodyProse }
  })
}

async function copyProbe(page) {
  return page.evaluate(() => {
    const text = document.body.innerText
    return {
      hasCurrentKeyWord: /current-key/i.test(text),
      hasCurrentRunning: /current (runs|running|snapped)/i.test(text),
      hasEmDash: text.includes('—'),
      hasCasinoVocab: /(JACKPOT|LUCKY|\bHOT\b|MEGA WIN|BIG WIN|WIN!|LEGENDARY)/.test(text),
      fullText: text,
    }
  })
}

const results = {}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

// ───────────────────────── DESKTOP 1920x1080 ─────────────────────────
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  results.desktop_lobby = await shootAndScan(page, 'desktop-lobby')
  results.desktop_lobby_copy = await copyProbe(page)
  results.desktop_lobby_font = await fontProbe(page)

  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  results.desktop_planning = await shootAndScan(page, 'desktop-planning')
  results.desktop_planning_copy = await copyProbe(page)

  // select Flooded Floor tier (max cyan/gold density state)
  await clickText(page, 'Flooded Floor', 'div')
  await wait(300)
  results.desktop_flooded_selected = await shootAndScan(page, 'desktop-flooded-selected')

  await armTrail(page, 8)
  await wait(200)
  results.desktop_painted = await shootAndScan(page, 'desktop-painted')
  results.desktop_painted_copy = await copyProbe(page)
  results.desktop_painted_font = await fontProbe(page)

  await clickText(page, 'THROW BREAKER')
  await wait(600)
  results.desktop_midcascade = await shootAndScan(page, 'desktop-midcascade')
  await wait(2600)
  results.desktop_settled = await shootAndScan(page, 'desktop-settled')
  results.desktop_settled_copy = await copyProbe(page)
  results.desktop_settled_font = await fontProbe(page)

  await page.close()
}

// Try repeated rounds on a fresh page to capture BOTH a win and a bust settle on desktop
async function playUntil(page, wantWin, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(300)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(250)
    await armTrail(page, 8)
    await wait(150)
    await clickText(page, 'THROW BREAKER')
    await wait(3200)
    const info = await page.evaluate(() => {
      const t = document.body.innerText
      return { won: /CLAIM PROVEN/.test(t), bust: /BAD VEIN/.test(t) }
    })
    if ((wantWin && info.won) || (!wantWin && info.bust)) return true
  }
  return false
}

{
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  const gotWin = await playUntil(page, true, 20)
  if (gotWin) {
    results.desktop_settled_win = await shootAndScan(page, 'desktop-settled-win')
    results.desktop_settled_win_copy = await copyProbe(page)
  } else {
    results.desktop_settled_win = { error: 'could not force a win in 20 attempts' }
  }
  await page.close()
}
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  const gotBust = await playUntil(page, false, 20)
  if (gotBust) {
    results.desktop_settled_bust = await shootAndScan(page, 'desktop-settled-bust')
    results.desktop_settled_bust_copy = await copyProbe(page)
  } else {
    results.desktop_settled_bust = { error: 'could not force a bust in 20 attempts' }
  }
  await page.close()
}

// ───────────────────────── MOBILE Pixel 7 (412x915) ─────────────────────────
{
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  results.mobile_lobby = await shootAndScan(page, 'mobile-lobby')
  results.mobile_lobby_copy = await copyProbe(page)

  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  results.mobile_planning = await shootAndScan(page, 'mobile-planning')

  await armTrail(page, 8)
  await wait(200)
  results.mobile_painted = await shootAndScan(page, 'mobile-painted')
  results.mobile_painted_copy = await copyProbe(page)

  await clickText(page, 'THROW BREAKER')
  await wait(600)
  results.mobile_midcascade = await shootAndScan(page, 'mobile-midcascade')
  await wait(2600)
  results.mobile_settled = await shootAndScan(page, 'mobile-settled')
  results.mobile_settled_copy = await copyProbe(page)

  await page.close()
}

fs.writeFileSync(`${OUT}/vault-brandqa-results.json`, JSON.stringify(results, null, 2))
await browser.close()
console.log('DONE')
