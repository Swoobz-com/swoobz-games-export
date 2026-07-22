import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6047'
const OUT = process.argv[3] || `shots-autisk-${Date.now()}`
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
async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height } })
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9, fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}
async function phaseText(page) { return page.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || '') }
async function rect(page, sel) { return page.evaluate((sel) => { const el = document.querySelector(sel); if(!el) return null; const r = el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right)} }, sel) }
async function controlPanels(page) {
  return page.evaluate(() => {
    const col = document.querySelector('[data-testid="DesktopControlColumn"]'); if (!col) return null
    return [...col.children].map((k) => {
      const r = k.getBoundingClientRect()
      let tid = k.getAttribute('data-testid')
      if (!tid) { const t = k.querySelector('[data-testid]'); tid = t ? t.getAttribute('data-testid') : null }
      return { testid: tid, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) }
    })
  })
}
async function opacity(page, sel) { return page.evaluate((sel) => { const el = document.querySelector(sel); if(!el) return null; return getComputedStyle(el).opacity }, sel) }
async function wagerCensus(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="vault-grid-mainGrid"]') || document
    const labels = [...grid.querySelectorAll('button[aria-label]')].map(b=>b.getAttribute('aria-label')).filter(l=>/wager|bet/i.test(l))
    const spans = [...grid.querySelectorAll('*')].filter(e=>e.children.length===0 && /^(YOUR BET|BET . LOCKED|INZET)$/.test((e.textContent||'').trim())).map(e=>e.textContent.trim())
    return { wagerButtons: labels, wagerLabelSpans: spans }
  })
}
async function clipScan(page, sel) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel); if(!root) return null
    const bad = []
    for (const el of root.querySelectorAll('*')) { if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) { bad.push({ txt:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,40), sw:el.scrollWidth, cw:el.clientWidth }) } }
    return bad
  }, sel)
}
async function findText(page, sel, reSrc) { return page.evaluate(({sel,reSrc}) => { const root = sel ? document.querySelector(sel) : document; if(!root) return false; return new RegExp(reSrc,'i').test(root.textContent||'') }, {sel, reSrc}) }
async function scrollInfo(page) { return page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })) }
const results = { port: PORT, out: OUT, title: null, viewports: {}, crossover: {} }
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--no-sandbox','--force-device-scale-factor=1','--autoplay-policy=no-user-gesture-required','--window-size=1980,1200'] })
  const page = await browser.newPage()
  const viewports = [ { name:'1440x900', width:1440, height:900 }, { name:'1920x1080', width:1920, height:1080 } ]
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    if (!results.title) results.title = await page.title()
    await wait(900); await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(400)
    const vr = {}
    vr.lobby = { phaseText: await phaseText(page), control: await rect(page,'[data-testid="DesktopControlColumn"]'), board: await rect(page,'[data-testid="vault-canvas-shell"]'), panels: await controlPanels(page), scroll: await scrollInfo(page) }
    await page.screenshot({ path: `${OUT}/${vp.name}-1lobby.png` })
    await clickText(page, 'ape in'); await wait(700)
    vr.betEntry = { phaseText: await phaseText(page), control: await rect(page,'[data-testid="DesktopControlColumn"]'), board: await rect(page,'[data-testid="vault-canvas-shell"]'), hudRow: await rect(page,'[data-testid="DesktopHudRow"]'), hudInner: await rect(page,'[data-testid="vault-grid-hud-inner"]'), panels: await controlPanels(page), worldpicker: await rect(page,'[data-testid="vault-board-worldpicker"]'), wager: await rect(page,'[data-testid="vault-ctl-wager"]'), cta: await rect(page,'[data-testid="vault-ctl-cta"]'), census: await wagerCensus(page), clipWorldpicker: await clipScan(page,'[data-testid="vault-board-worldpicker"]'), clipControl: await clipScan(page,'[data-testid="DesktopControlColumn"]'), badgeNormal: await findText(page,'[data-testid="vault-board-worldpicker"]','NORMAL'), badgeHard: await findText(page,'[data-testid="vault-board-worldpicker"]','HARD'), badgeCrazy: await findText(page,'[data-testid="vault-board-worldpicker"]','CRAZY'), shitcoinCopy: await findText(page,'[data-testid="vault-grid-mainGrid"]','24'), scroll: await scrollInfo(page) }
    await page.screenshot({ path: `${OUT}/${vp.name}-2betentry.png` })
    if (vr.betEntry.worldpicker) { const w=vr.betEntry.worldpicker; try{ await page.screenshot({ path:`${OUT}/${vp.name}-2wp.png`, clip:{ x:Math.max(0,w.left-4), y:Math.max(0,w.top-4), width:Math.min(vp.width-w.left+4,w.w+8), height:w.h+8 } }) }catch(e){} }
    await clickText(page, 'bluechips'); await wait(200); await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(1100)
    vr.playing = { phaseText: await phaseText(page), control: await rect(page,'[data-testid="DesktopControlColumn"]'), board: await rect(page,'[data-testid="vault-canvas-shell"]'), panels: await controlPanels(page), lockedWager: await rect(page,'[data-testid="vault-ctl-wager-locked"]'), lockedOpacity: await opacity(page,'[data-testid="vault-ctl-wager-locked"]'), worldpicker: await rect(page,'[data-testid="vault-board-worldpicker"]'), cta: await rect(page,'[data-testid="vault-ctl-cta"]'), census: await wagerCensus(page), lockedDisabled: await page.evaluate(()=>{ const el=document.querySelector('[data-testid="vault-ctl-wager-locked"]'); if(!el) return null; const b=[...el.querySelectorAll('button')]; return {count:b.length, allDisabled:b.every(x=>x.disabled)} }), scroll: await scrollInfo(page) }
    await page.screenshot({ path: `${OUT}/${vp.name}-3playing.png` })
    await clickCell(page,1,1,5,5); await wait(600); await clickText(page,'take profit'); await wait(1200)
    vr.settled = { phaseText: await phaseText(page), control: await rect(page,'[data-testid="DesktopControlColumn"]'), board: await rect(page,'[data-testid="vault-canvas-shell"]'), panels: await controlPanels(page), cta: await rect(page,'[data-testid="vault-ctl-cta"]'), worldpicker: await rect(page,'[data-testid="vault-board-worldpicker"]'), banner: await rect(page,'[data-testid="vault-settled-banner"]'), hasNewSetup: await findText(page,'[data-testid="vault-ctl-cta"]','new setup'), hasShare: await findText(page,'[data-testid="vault-ctl-cta"]','share'), hasSameTrail: await findText(page,'[data-testid="vault-ctl-cta"]','same'), hasReceipt: !!(await rect(page,'[data-testid="vault-ctl-receipt"]')), clipCta: await clipScan(page,'[data-testid="vault-ctl-cta"]'), scroll: await scrollInfo(page) }
    await page.screenshot({ path: `${OUT}/${vp.name}-4settled.png` })
    results.viewports[vp.name] = vr
  }
  for (const w of [960, 1000, 1024]) {
    await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700); await clickText(page,'got it'); await clickText(page,'skip'); await wait(300); await clickText(page, 'ape in'); await wait(600)
    results.crossover[w] = { hasDesktopGrid: await page.evaluate(()=>!!document.querySelector('[data-testid="vault-grid-mainGrid"]')), control: await rect(page,'[data-testid="DesktopControlColumn"]'), scroll: await scrollInfo(page) }
    await page.screenshot({ path: `${OUT}/cross-${w}-betentry.png` })
  }
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
run().catch((e)=>{ console.error('FATAL', e); process.exit(1) })
