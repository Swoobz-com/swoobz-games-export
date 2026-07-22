import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-codotty-r2-holdgate-0707'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true }
  return false
}, re.source)

async function traceCanvasN(page, n) {
  return page.evaluate((count) => {
    const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); const DIM = 14, TILE = r.width/DIM
    for (let i = 0; i < count; i++) {
      const x = r.left + (i + 0.5) * TILE, y = r.top + 0.5 * TILE
      for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) c.dispatchEvent(new MouseEvent(type, { bubbles:true, cancelable:true, clientX:x, clientY:y, view:window }))
    }
    return count
  }, n)
}

function readHaulAndHero(page) {
  return page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')]
    const hl = divs.find((d) => d.children.length === 0 && d.textContent.trim() === 'HAUL')
    const haul = hl && hl.parentElement ? hl.parentElement.innerText.replace(/\s+/g, ' ').trim().replace(/^HAUL\s*/i, '') : null
    const all = [...document.querySelectorAll('*')]
    const heroBroke = !!all.find((el) => el.children.length === 0 && (el.textContent || '').trim() === 'LINE BROKE')
    const coinImgs = [...document.querySelectorAll('img')].filter((i) => (i.getAttribute('src')||'').startsWith('data:image')).length
    const badVein = document.body.innerText.includes('the line broke. Dive busted')
    return { haul, heroBroke, coinImgs, badVein }
  })
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

for (let attempt = 0; attempt < 18; attempt++) {
  await page.goto(URL, { waitUntil: 'load' }); await wait(450)
  await page.keyboard.press('Escape').catch(()=>{})
  await clickText(page, /ENTER THE DIVE/); await wait(300)
  await clickText(page, /HADAL/); await wait(150)
  // ensure staggered
  const label = await page.evaluate(() => { const el = [...document.querySelectorAll('button,div,span')].find((x) => /^PACE:/.test((x.textContent||'').trim())); return el?el.textContent.trim():null })
  if (label && /INSTANT/.test(label)) { await clickText(page, /^PACE:/); await wait(120) }
  await traceCanvasN(page, 60); await wait(120)
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /RUN THE LINE/i.test(x.textContent||'') && !x.disabled); if (b) b.click() })
  // dense poll: capture frames + DOM read straddling the bad-vein transition
  const frames = []
  let capIdx = 0, sawBad = false, settled = false, won = null
  for (let i = 0; i < 200; i++) {
    const st = await readHaulAndHero(page)
    const body = await page.evaluate(() => document.body.innerText)
    if (st.badVein) sawBad = true
    if (body.includes('RUGGED BY THE DEEP')) { settled = true; won = false }
    if (body.includes('SECURED THE HAUL')) { settled = true; won = true }
    frames.push({ i, ...st })
    // dense-capture the bad-vein HOLD window
    if (sawBad && !settled && capIdx < 8) {
      await page.screenshot({ path: `${OUT}/staggered-bust-hold-${capIdx}.png` })
      capIdx++
    }
    if (settled) break
    await wait(12)
  }
  if (sawBad && !won) {
    const holdFrames = frames.filter((f) => f.badVein)
    const contradictions = holdFrames.filter((f) => f.heroBroke && f.haul && /[1-9]/.test(f.haul))
    const maxCoinImgsInHold = holdFrames.reduce((m, f) => Math.max(m, f.coinImgs), 0)
    console.log(`STAGGERED BUST captured (attempt ${attempt}).`)
    console.log(`hold frames=${holdFrames.length}  HAUL-nonzero-while-BROKE=${contradictions.length}  maxCoinImgsInHold=${maxCoinImgsInHold}`)
    console.log('sample hold-frame HAUL/hero reads:', JSON.stringify(holdFrames.slice(0, 6).map((f) => ({ haul: f.haul, broke: f.heroBroke, coins: f.coinImgs }))))
    break
  }
  console.log(`attempt ${attempt}: sawBad=${sawBad} won=${won} — retry`)
}
await browser.close()
