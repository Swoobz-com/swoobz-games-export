import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-artotty-uxgate-0706'
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, re.source)
async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left:r.left, top:r.top, w:r.width, h:r.height } }) }
async function trace(page, cells){ const g=await boardGeo(page); const T=g.w/14; for(const [c,r] of cells){ await page.mouse.click(g.left+c*T+T/2, g.top+r*T+T/2); await wait(30) } }
const line8=[[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]

const browser = await puppeteer.launch({ executablePath:EXE, headless:'new', defaultViewport:null })
const page = await browser.newPage()
await page.setViewport({ width:1440, height:900, deviceScaleFactor:2 })
await page.goto(URL, { waitUntil:'load' }); await wait(700)
await clickText(page, /ENTER THE DIVE/); await wait(400)
// dismiss coachmark: click the × close button (aria-label or the small × div/button)
await page.evaluate(()=>{ const x=[...document.querySelectorAll('button,div,span')].find(e=>(e.textContent||'').trim()==='×' || /close|dismiss|got it/i.test(e.getAttribute?.('aria-label')||'')); if(x) x.click() })
await wait(200)
await trace(page, line8); await wait(250)
// try dismiss again in case it reappeared
await page.evaluate(()=>{ const x=[...document.querySelectorAll('button,div,span')].find(e=>(e.textContent||'').trim()==='×'); if(x) x.click() })
await wait(200)
await page.screenshot({ path:`${OUT}/d3-armed-nocoach.png` })
const g = await boardGeo(page)
// hero strip band above board top, full board width
const top = Math.max(0, g.top-130)
await page.screenshot({ path:`${OUT}/d3-hero-crop.png`, clip:{x:Math.round(g.left), y:Math.round(top), width:Math.round(g.w), height:Math.round(g.top-top+10)} })
await page.close()
await browser.close()
console.log('done', JSON.stringify(g))
