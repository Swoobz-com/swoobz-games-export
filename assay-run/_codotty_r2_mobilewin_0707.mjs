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

// Trace N tiles by dispatching mouse events DIRECTLY to the canvas element. On
// the mobile viewport the board sits in a horizontal-scroll container with a
// decorative overlay DIV above it, so page.mouse.click lands on the overlay, not
// the board — dispatching straight to the canvas (with true tile client coords)
// selects tiles reliably regardless of scroll. Pure test-harness input.
async function traceVisibleN(page, n) {
  return page.evaluate((count) => {
    const c = document.querySelector('canvas'); const r = c.getBoundingClientRect()
    const DIM = 14, TILE = r.width/DIM
    let fired = 0
    for (let i = 0; i < count; i++) {
      const x = r.left + (i + 0.5) * TILE, y = r.top + 0.5 * TILE
      for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) {
        c.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }))
      }
      fired++
    }
    return fired
  }, n)
}

async function measureHeroGeometry(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
    const cartoucheInner = all.find((el) => (getComputedStyle(el).animationName || '').includes('assayHeroPop'))
    const cartouche = cartoucheInner ? cartoucheInner.getBoundingClientRect() : null
    const labelEl = all.find((el) => el.children.length === 0 && (el.textContent || '').trim() === 'LINE CLAIMED')
    let plaqueEl = labelEl
    for (let i = 0; i < 6 && plaqueEl; i++) { const cs = getComputedStyle(plaqueEl); if (cs.justifyContent === 'space-between' && cs.display.includes('flex')) break; plaqueEl = plaqueEl.parentElement }
    const plaque = plaqueEl ? plaqueEl.getBoundingClientRect() : null
    const payoutLabel = all.find((el) => el.children.length === 0 && (el.textContent || '').trim() === 'PAYOUT')
    const receipt = payoutLabel ? payoutLabel.getBoundingClientRect() : null
    const canvas = document.querySelector('canvas').getBoundingClientRect()
    const rect = (r) => r ? { left:+r.left.toFixed(1), top:+r.top.toFixed(1), right:+r.right.toFixed(1), bottom:+r.bottom.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) } : null
    return { cartouche: rect(cartouche), headerPlaque: rect(plaque), receiptPayoutLabel: rect(receipt), board: rect(canvas), vw: window.innerWidth, vh: window.innerHeight }
  })
}
async function measureLabelAndMarker(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
    const ci = all.find((el) => (getComputedStyle(el).animationName || '').includes('assayHeroPop'))
    if (!ci) return null
    const labelSpan = [...ci.querySelectorAll('span')].find((s) => (s.textContent || '').trim() === 'SECURED THE HAUL')
    let labelLines=null, labelH=null, lineH=null
    if (labelSpan){ const r=labelSpan.getBoundingClientRect(); const cs=getComputedStyle(labelSpan); lineH=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.2; labelH=r.height; labelLines=Math.round(r.height/lineH) }
    const amountSpan = [...ci.querySelectorAll('span')].find((s) => /\d/.test(s.textContent||'') && (s.textContent||'').includes('$'))
    const markerText = amountSpan ? (amountSpan.textContent||'').trim() : null
    return { labelText: labelSpan?labelSpan.textContent.trim():null, labelLines, labelH:+(labelH||0).toFixed(1), lineH:+(lineH||0).toFixed(1), amountText: markerText, hasMoneyMarker: markerText?markerText.includes('$'):false }
  })
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE-ERR:', m.text()) })
const VW = 412, VH = 915
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2 })

let out = null
for (let attempt = 0; attempt < 20; attempt++) {
  await page.goto(URL, { waitUntil: 'load' }); await wait(450)
  await page.keyboard.press('Escape').catch(()=>{})
  await clickText(page, /ENTER THE DIVE/); await wait(350)
  await clickText(page, /REEF/); await wait(200)
  const traced = await traceVisibleN(page, 8)
  await wait(150)
  const runClicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /RUN THE LINE/i.test(x.textContent || '') && !x.disabled)
    if (b) { b.click(); return true }
    return false
  })
  let won = null
  for (let i=0;i<100;i++){ const t = await page.evaluate(()=>document.body.innerText); if (t.includes('SECURED THE HAUL')){won=true;break} if (t.includes('RUGGED BY THE DEEP')){won=false;break} await wait(40) }
  if (won) {
    await wait(220)
    await page.screenshot({ path: `${OUT}/win-hero-412.png` })
    const geo = await measureHeroGeometry(page)
    const lbl = await measureLabelAndMarker(page)
    // clearance assertions
    const c = geo.cartouche, hp = geo.headerPlaque, rc = geo.receiptPayoutLabel, b = geo.board
    const clearsHeader = hp ? c.top >= hp.bottom : null
    const clearsReceipt = rc ? c.bottom <= rc.top : null
    const insideBoardV = b ? (c.top >= b.top && c.bottom <= b.bottom) : null
    const insideViewportH = c.left >= 0 && c.right <= geo.vw
    console.log(`[win-412] traced=${traced} attempt=${attempt}`)
    console.log(`[win-412] geometry=${JSON.stringify(geo)}`)
    console.log(`[win-412] label=${JSON.stringify(lbl)}`)
    console.log(`[win-412] clearsHeader=${clearsHeader} clearsReceipt=${clearsReceipt} insideBoardV=${insideBoardV} insideViewportH=${insideViewportH}`)
    out = { geo, lbl, clearsHeader, clearsReceipt, insideBoardV, insideViewportH }
    break
  }
  console.log(`[win-412] attempt=${attempt} traced=${traced} runClicked=${runClicked} won=${won} — retry`)
}
if (out) fs.writeFileSync(`${OUT}/mobilewin.json`, JSON.stringify(out, null, 2))
await browser.close()
