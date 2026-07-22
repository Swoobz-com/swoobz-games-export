import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5195/'
const OUT = 'shots-brandcohesion-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
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

const report = {}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

// ─── PART 1: general flow captures + em-dash / mono / wordmark checks (1440x900) ───
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)

  await page.screenshot({ path: `${OUT}/1-lobby.png` })
  const lobbyText = await page.evaluate(() => document.body.innerText)
  report.emdash_lobby = /—/.test(lobbyText)
  report.wordmark_alt_present = await page.evaluate(() => !!document.querySelector('img[alt="THE ASSAY LINE"]'))
  report.swoobz_text_present = /SWOOBZ/.test(lobbyText)

  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(300)
  await page.screenshot({ path: `${OUT}/2-planning.png` })
  const planningText = await page.evaluate(() => document.body.innerText)
  report.emdash_planning = /—/.test(planningText)

  const box = await canvasBox(page)
  const tile = box.w / 20
  let r = 14, c = 10
  for (let i = 0; i < 9; i++) {
    await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
    await wait(35)
    r -= 1
    if (i % 2 === 1) c += 1
  }
  await wait(150)
  await page.screenshot({ path: `${OUT}/3-armed.png` })

  const monoCheckFn = () => {
    const results = []
    document.querySelectorAll('*').forEach((el) => {
      const txt = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 ? el.textContent : ''
      if (/^[\d.,$%×x·+\-]+$/.test(txt.trim()) && txt.trim().length > 0 && /\d/.test(txt)) {
        const cs = getComputedStyle(el)
        results.push({ txt: txt.trim(), font: cs.fontFamily })
      }
    })
    return results
  }
  report.numeral_fonts_planning = await page.evaluate(monoCheckFn)

  await clickText(page, 'THROW BREAKER')

  for (let i = 0; i < 25; i++) {
    await wait(90)
    await page.screenshot({ path: `${OUT}/4-cascade-${String(i).padStart(2, '0')}.png` })
  }
  await wait(600)
  const info = await page.evaluate(() => {
    const t = document.body.innerText
    return { won: /CLAIM PROVEN/.test(t), bust: /BUSTED/.test(t) }
  })
  await page.screenshot({ path: `${OUT}/5-settled-${info.won ? 'WIN' : 'BUST'}.png` })
  report.round1_outcome = info

  const settledText = await page.evaluate(() => document.body.innerText)
  report.emdash_settled = /—/.test(settledText)
  report.numeral_fonts_settled = await page.evaluate(monoCheckFn)

  await page.close()
}

// ─── PART 2: force a WIN + a BUST by retrying ───
async function playRound(page, wantWin, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(300)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(300)
    const box = await canvasBox(page)
    const tile = box.w / 20
    let r = 14, c = 10
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
      await wait(30)
      r -= 1
      if (i % 2 === 1) c += 1
    }
    await wait(120)
    await clickText(page, 'THROW BREAKER')
    await wait(2500)
    const info = await page.evaluate(() => {
      const t = document.body.innerText
      return { won: /CLAIM PROVEN/.test(t), bust: /BUSTED/.test(t) }
    })
    if ((wantWin && info.won) || (!wantWin && info.bust)) return true
  }
  return false
}

{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  const gotWin = await playRound(page, true, 14)
  report.forced_win_achieved = gotWin
  if (gotWin) {
    await page.screenshot({ path: `${OUT}/6-win-settled-full.png` })
    const box = await canvasBox(page)
    await page.screenshot({
      path: `${OUT}/7-win-heropop-zoom.png`,
      clip: { x: box.x, y: box.y, width: box.w, height: Math.min(box.h, 500) },
    })
  }
  await page.close()
}

{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  const gotBust = await playRound(page, false, 14)
  report.forced_bust_achieved = gotBust
  if (gotBust) {
    await page.screenshot({ path: `${OUT}/8-bust-settled-full.png` })
  }
  await page.close()
}

// ─── PART 3: specimen-bezel pixel-row check at deviceScaleFactor:8 ───
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 8 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(300)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(500)

  const rects = await page.evaluate(() => {
    const out = {}
    document.querySelectorAll('div').forEach((el) => {
      const cs = getComputedStyle(el)
      const bc = cs.borderTopColor
      let key = null
      if (bc === 'rgb(202, 160, 64)') key = 'warm'
      if (bc === 'rgb(143, 125, 92)') key = 'cool'
      if (key) {
        out[key + 'Bezel'] = JSON.parse(JSON.stringify(el.getBoundingClientRect()))
        out[key + 'Outer'] = JSON.parse(JSON.stringify(el.parentElement.getBoundingClientRect()))
      }
    })
    return out
  })
  report.rects = rects

  if (rects.warmBezel && rects.warmOuter) {
    const br = rects.warmBezel, or_ = rects.warmOuter
    await page.screenshot({
      path: `${OUT}/9-warm-bezel-row.png`,
      clip: { x: or_.x - 4, y: br.y + br.height / 2 - 3, width: or_.width + 8, height: 6 },
    })
    await page.screenshot({
      path: `${OUT}/10-warm-bezel-corner.png`,
      clip: { x: or_.x - 6, y: or_.y - 6, width: 60, height: 60 },
    })
  }
  if (rects.coolBezel && rects.coolOuter) {
    const br = rects.coolBezel, or_ = rects.coolOuter
    await page.screenshot({
      path: `${OUT}/11-cool-bezel-row.png`,
      clip: { x: or_.x - 4, y: br.y + br.height / 2 - 3, width: or_.width + 8, height: 6 },
    })
    await page.screenshot({
      path: `${OUT}/12-cool-bezel-corner.png`,
      clip: { x: or_.x + or_.width - 54, y: or_.y - 6, width: 60, height: 60 },
    })
  }
  await page.close()
}

// ─── PART 4: header brass corner-bracket vs wordmark/hero + backdrop relight zone ───
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 4 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  const headerRect = await page.evaluate(() => {
    const el = document.querySelector('img[alt="THE ASSAY LINE"]')
    if (!el) return null
    const node = el.closest('div[style*="space-between"]') || el.parentElement.parentElement
    return JSON.parse(JSON.stringify(node.getBoundingClientRect()))
  })
  report.headerRect = headerRect
  if (headerRect) {
    await page.screenshot({
      path: `${OUT}/13-header-full.png`,
      clip: { x: Math.max(0, headerRect.x - 40), y: Math.max(0, headerRect.y - 20), width: headerRect.width + 300, height: headerRect.height + 60 },
    })
  }
  await page.screenshot({ path: `${OUT}/14-leftmargin-relight.png`, clip: { x: 0, y: 100, width: 200, height: 400 } })
  await page.close()
}

// ─── PART 5: coin-dormant-v2.png sprite pixel scan (in-browser canvas decode) ───
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(300)
  const coinPixelScan = await page.evaluate(async () => {
    const imgs = [...document.images].map((i) => i.src)
    let src = imgs.find((s) => /coin-dormant-v2/.test(s))
    if (!src) {
      const all = [...document.querySelectorAll('*')]
      for (const el of all) {
        const bg = getComputedStyle(el).backgroundImage
        const m = bg.match(/url\("?([^")]*coin-dormant-v2[^")]*)"?\)/)
        if (m) { src = m[1]; break }
      }
    }
    if (!src) return { error: 'coin-dormant-v2 not referenced on this page yet', imgs }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src })
    const cvs = document.createElement('canvas')
    cvs.width = img.naturalWidth; cvs.height = img.naturalHeight
    const ctx = cvs.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data
    let cyanish = 0, goldish = 0, total = 0
    for (let i = 0; i < data.length; i += 4) {
      const rr = data[i], gg = data[i + 1], bb = data[i + 2], aa = data[i + 3]
      if (aa < 20) continue
      total++
      if (bb > 150 && gg > 150 && rr < 120 && bb >= gg - 20) cyanish++
      if (rr > 150 && gg > 110 && bb < 110 && rr > bb + 60 && gg > bb + 30) goldish++
    }
    return { src, width: cvs.width, height: cvs.height, total, cyanish, goldish, cyanPct: total ? (100 * cyanish / total).toFixed(2) : 'n/a', goldPct: total ? (100 * goldish / total).toFixed(2) : 'n/a' }
  })
  report.coinDormantV2PixelScan = coinPixelScan
  await page.close()
}

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
