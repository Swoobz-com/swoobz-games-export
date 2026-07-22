import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-evenboard-visreg-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find((x) => r.test((x.textContent||'').trim()) && (x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'))
  if (b) { b.click(); return true } return false
}, re.source)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(700)
await page.evaluate(() => { try { localStorage.setItem('assay_coachmark_seen_v1', '1') } catch(e){} })
await page.reload({ waitUntil: 'load', timeout: 60000 })
await wait(700)
await clickText(page, /ENTER THE DIVE/)
await wait(400)
const g = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } })
const tile = g.w / 14
const col = 11, row = 11 // fresh, never-touched tile
const clip = { x: Math.round(g.left + col*tile - tile*2), y: Math.round(g.top + row*tile - tile*2), width: Math.round(tile*6), height: Math.round(tile*6) }
await page.screenshot({ path: `${OUT}/desktop-flare-A-before.png`, clip })
await page.mouse.click(g.left + col*tile + tile/2, g.top + row*tile + tile/2)
await wait(140) // ~ REVEAL_POP_PEAK_T(0.6)*REVEAL_POP_MS(260) = 156ms
await page.screenshot({ path: `${OUT}/desktop-flare-B-peak.png`, clip })
await wait(600)
await page.screenshot({ path: `${OUT}/desktop-flare-C-settled.png`, clip })
await browser.close()
console.log('done', JSON.stringify(clip))
