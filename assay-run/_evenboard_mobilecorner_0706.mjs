// Mobile-specific far-corner check: the pan-window (overflow:auto clip over the
// larger fixed-tile canvas) starts scrolled to (0,0), so a plain screenshot only
// ever shows the TOP-LEFT ~4x4 tiles. To verify the true BR corner (the one that
// used to be dark) is now even, force-scroll the pan container to its maximum
// scrollLeft/scrollTop (bottom-right of the full 14x14 canvas) before sampling —
// per the documented gotcha (a hardcoded tile coordinate without a forced scroll
// silently samples off-canvas / wrong-window content).
import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-evenboard-visreg-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function lum(r,g,b){ return 0.2126*r+0.7152*g+0.0722*b }
async function stats(page, x, y, w, h) {
  const buf = await page.screenshot({ type: 'png', clip: { x: Math.max(0,Math.round(x)), y: Math.max(0,Math.round(y)), width: Math.max(1,Math.round(w)), height: Math.max(1,Math.round(h)) } })
  const png = PNG.sync.read(Buffer.from(buf))
  const lums = []
  for (let i=0;i<png.data.length;i+=4) lums.push(lum(png.data[i],png.data[i+1],png.data[i+2]))
  lums.sort((a,b)=>a-b)
  const n=lums.length
  const mean = lums.reduce((s,v)=>s+v,0)/n
  const podFace = lums.slice(Math.floor(n*0.8)).reduce((s,v)=>s+v,0)/(n-Math.floor(n*0.8))
  const bed = lums.slice(0,Math.floor(n*0.2)).reduce((s,v)=>s+v,0)/Math.floor(n*0.2)
  return { mean:+mean.toFixed(2), podFace:+podFace.toFixed(2), bed:+bed.toFixed(2) }
}
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find((x) => r.test((x.textContent||'').trim()) && (x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'))
  if (b) { b.click(); return true } return false
}, re.source)

const VIEWPORTS = [
  { name: 'pixel7-412', width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'iphone14pro-393', width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
]
const results = {}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
for (const vp of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch })
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(700)
  await page.evaluate(() => { try { localStorage.setItem('assay_coachmark_seen_v1', '1') } catch(e){} })
  await page.reload({ waitUntil: 'load', timeout: 60000 })
  await wait(700)
  await clickText(page, /ENTER THE DIVE/)
  await wait(400)

  // TOP-LEFT (default scroll position, scrollLeft=0/scrollTop=0)
  const geoTL = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    let el = c.parentElement
    for (let i=0;i<4 && el;i++){ const cs=getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowX)||/(auto|scroll)/.test(cs.overflow)) break; el = el.parentElement }
    if (el) { el.scrollLeft = 0; el.scrollTop = 0 }
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height, scrollable: !!el, scrollWidth: el?.scrollWidth, clientWidth: el?.clientWidth }
  })
  await wait(150)
  console.error('DEBUG geoTL', vp.name, JSON.stringify(geoTL))
  const tlPatch = await stats(page, geoTL.left + 6, geoTL.top + 6, Math.min(60, geoTL.w*0.3), Math.min(60, geoTL.h*0.3))
  await page.screenshot({ path: `${OUT}/${vp.name}-mobile-corner-TL.png`, clip: { x: Math.round(geoTL.left), y: Math.round(geoTL.top), width: Math.round(Math.min(geoTL.w, vp.width-geoTL.left)), height: Math.round(Math.min(geoTL.h, vp.height-geoTL.top)) } })

  // BOTTOM-RIGHT: force-scroll the pan container to its maximum scrollLeft/scrollTop
  const geoBR = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    let el = c.parentElement
    for (let i=0;i<4 && el;i++){ const cs=getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowX)||/(auto|scroll)/.test(cs.overflow)) break; el = el.parentElement }
    if (el) { el.scrollLeft = el.scrollWidth; el.scrollTop = el.scrollHeight }
    const r = c.getBoundingClientRect()
    const cr = el ? el.getBoundingClientRect() : null
    const containerRect = cr ? { left: cr.left, top: cr.top, width: cr.width, height: cr.height } : null // DOMRect getters aren't own-enumerable — must copy explicitly or it serializes as {}
    return { left: r.left, top: r.top, w: r.width, h: r.height, scrollLeftAfter: el?.scrollLeft, scrollTopAfter: el?.scrollTop, containerRect }
  })
  await wait(150)
  console.error('DEBUG geoBR', vp.name, JSON.stringify(geoBR))
  // sample near the bottom-right of the VISIBLE container window
  const cW = geoBR.containerRect ? geoBR.containerRect.width : vp.width
  const cH = geoBR.containerRect ? geoBR.containerRect.height : vp.height
  const cLeft = geoBR.containerRect ? geoBR.containerRect.left : 0
  const cTop = geoBR.containerRect ? geoBR.containerRect.top : 0
  const patchW = Math.min(60, cW*0.3), patchH = Math.min(60, cH*0.3)
  const brPatch = await stats(page, cLeft + cW - patchW - 6, cTop + cH - patchH - 6, patchW, patchH)
  await page.screenshot({ path: `${OUT}/${vp.name}-mobile-corner-BR.png`, clip: { x: Math.max(0,Math.round(cLeft)), y: Math.max(0,Math.round(cTop)), width: Math.round(Math.min(cW, vp.width-cLeft)), height: Math.round(Math.min(cH, vp.height-cTop)) } })

  results[vp.name] = { geoTL, tlPatch, geoBR, brPatch, ratio: { mean: +(brPatch.mean/tlPatch.mean).toFixed(3), podFace: +(brPatch.podFace/tlPatch.podFace).toFixed(3), bed: +(brPatch.bed/tlPatch.bed).toFixed(3) } }
  await page.close()
}
await browser.close()
fs.writeFileSync(`${OUT}/mobile-corner-report.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
