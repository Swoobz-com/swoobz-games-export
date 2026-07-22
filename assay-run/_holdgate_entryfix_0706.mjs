import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-holdgate-entryfix-0706'
import { mkdirSync } from 'node:fs'
mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

// DESKTOP 1440x900 — entry two-column + fold + header
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(1000)
  await page.screenshot({ path: `${OUT}/desktop-entry.png` }) // above-fold only (no fullPage)

  const m = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const cr = canvas ? canvas.getBoundingClientRect() : null
    const enter = [...document.querySelectorAll('button, div, span')].find(x => /ENTER THE DIVE/i.test((x.textContent || '').trim()) && x.getBoundingClientRect().height < 120)
    const er = enter ? enter.getBoundingClientRect() : null
    const dive = [...document.querySelectorAll('div')].find(x => /^THE DIVE$/i.test((x.textContent || '').trim()))
    const dr = dive ? dive.getBoundingClientRect() : null
    const depth = [...document.querySelectorAll('div')].find(x => /^DIVE DEPTH$/i.test((x.textContent || '').trim()))
    const dpr = depth ? depth.getBoundingClientRect() : null
    // wordmark: find the ABYSS LINE header element (collapsed, small)
    const wm = [...document.querySelectorAll('svg, div, span')].find(x => /ABYSS/i.test(x.getAttribute?.('aria-label') || '') )
    return {
      canvas: cr && { left: Math.round(cr.left), right: Math.round(cr.right), top: Math.round(cr.top), bottom: Math.round(cr.bottom) },
      enter: er && { left: Math.round(er.left), right: Math.round(er.right), top: Math.round(er.top), bottom: Math.round(er.bottom) },
      theDive: dr && { left: Math.round(dr.left), top: Math.round(dr.top) },
      diveDepth: dpr && { left: Math.round(dpr.left), top: Math.round(dpr.top) },
    }
  })
  console.log('DESKTOP metrics:', JSON.stringify(m, null, 1))
  const twoCol = m.enter && m.canvas && m.enter.left >= m.canvas.right - 4
  const enterAboveFold = m.enter && m.enter.bottom <= 900
  const depthAboveFold = m.diveDepth && m.diveDepth.top <= 900
  console.log('  two-column (ENTER right of board):', twoCol, m.enter && m.canvas ? `enter.left=${m.enter.left} canvas.right=${m.canvas.right}` : '')
  console.log('  ENTER THE DIVE above 900 fold:', enterAboveFold, m.enter ? `bottom=${m.enter.bottom}` : '')
  console.log('  DIVE DEPTH above 900 fold:', depthAboveFold, m.diveDepth ? `top=${m.diveDepth.top}` : '')

  // header crop — top-left corner where the wordmark meets the bracket
  const card = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    // walk up to the card (border-radius 16 element)
    let el = canvas
    while (el && getComputedStyle(el).borderRadius !== '16px') el = el.parentElement
    const r = el ? el.getBoundingClientRect() : null
    return r && { x: Math.round(r.left), y: Math.round(r.top) }
  })
  if (card) {
    await page.screenshot({ path: `${OUT}/desktop-header-crop.png`, clip: { x: card.x, y: card.y, width: 320, height: 70 } })
    console.log('  header crop written at card corner', card)
  }
  await page.close()
}

// MOBILE 393x852 — collapsed header crop (leading A clearance)
{
  const page = await browser.newPage()
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(1000)
  await page.screenshot({ path: `${OUT}/mobile-entry.png` })
  const card = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    let el = canvas
    while (el && getComputedStyle(el).borderRadius !== '16px') el = el.parentElement
    const r = el ? el.getBoundingClientRect() : null
    return r && { x: Math.round(r.left), y: Math.round(r.top) }
  })
  if (card) {
    await page.screenshot({ path: `${OUT}/mobile-header-crop.png`, clip: { x: card.x, y: card.y, width: 300, height: 64 } })
    console.log('MOBILE header crop written at card corner', card)
  }
  await page.close()
}

await browser.close()
console.log('done ->', OUT)
