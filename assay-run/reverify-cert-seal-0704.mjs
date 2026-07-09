import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5190/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function runViewport(name, viewport, isMobile) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = (await browser.pages())[0]
  if (isMobile) {
    await page.emulate({ viewport: { ...viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
  } else {
    await page.setViewport({ ...viewport, deviceScaleFactor: 1 })
  }
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(300)
  await tapText(page, 'Heavy')
  await wait(150)

  let settledText = ''
  for (let attempt = 0; attempt < 10; attempt++) {
    const geo = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      const cr = c.getBoundingClientRect()
      return { left: cr.left, top: cr.top, w: cr.width }
    })
    const dim = 10
    const tileCss = geo.w / dim
    for (let i = 0; i < 45; i++) {
      const col = i % dim
      const row = Math.floor(i / dim)
      if (isMobile) {
        await page.touchscreen.tap(geo.left + col * tileCss + tileCss / 2, geo.top + row * tileCss + tileCss / 2)
      } else {
        await page.mouse.click(geo.left + col * tileCss + tileCss / 2, geo.top + row * tileCss + tileCss / 2)
      }
    }
    await tapText(page, 'RUN THE LINE')
    for (let i = 0; i < 60; i++) {
      const t = await page.evaluate(() => document.body.innerText)
      if (t.includes('GLASS BOX CERTIFICATE')) {
        settledText = t
        break
      }
      await wait(100)
    }
    if (settledText) break
    await tapText(page, 'ASSAY AGAIN')
    await wait(200)
    await tapText(page, 'Heavy')
    await wait(150)
  }

  // Measure the certificate headline vs HallmarkSeal bounding boxes
  const measurement = await page.evaluate(() => {
    const all = [...document.querySelectorAll('div,span')]
    // deepest / leaf-most element containing the headline text (most specific match, not an aggregating wrapper)
    const matches = all.filter((d) => d.textContent && d.textContent.includes('GLASS BOX CERTIFICATE'))
    matches.sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)
    const certDiv = matches[0]
    if (!certDiv) return { found: false }
    const certRect = certDiv.getBoundingClientRect()
    // find seal: nearby absolute-positioned small square element (~30x30), search up a few ancestor levels
    let seal = null
    let ancestor = certDiv.parentElement
    for (let depth = 0; depth < 6 && ancestor && !seal; depth++) {
      const candidates = [...ancestor.querySelectorAll('*')]
      for (const el of candidates) {
        if (el === certDiv || el.contains(certDiv)) continue
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        if (cs.position === 'absolute' && r.width > 5 && r.width < 60 && r.height > 5 && r.height < 60) {
          seal = el
          break
        }
      }
      ancestor = ancestor.parentElement
    }
    const sealRect = seal ? seal.getBoundingClientRect() : null
    const lineHeightStr = getComputedStyle(certDiv).lineHeight
    const fontSize = parseFloat(getComputedStyle(certDiv).fontSize)
    const lineHeight = lineHeightStr.endsWith('px') ? parseFloat(lineHeightStr) : fontSize * 1.2
    const numLines = Math.round(certDiv.getBoundingClientRect().height / lineHeight)
    // Get ACTUAL glyph line rects via Range, not the div's bounding box (which includes
    // the reserved paddingRight gutter that is intentionally blank under the seal).
    const range = document.createRange()
    range.selectNodeContents(certDiv)
    const glyphRects = [...range.getClientRects()].map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }))
    let maxGlyphOverlapPct = 0
    let overlappingLine = null
    if (sealRect) {
      for (const gr of glyphRects) {
        const ix = Math.max(0, Math.min(gr.right, sealRect.right) - Math.max(gr.x, sealRect.left))
        const iy = Math.max(0, Math.min(gr.bottom, sealRect.bottom) - Math.max(gr.y, sealRect.top))
        const interArea = ix * iy
        const sealArea = sealRect.width * sealRect.height
        const pct = sealArea > 0 ? (interArea / sealArea) * 100 : 0
        if (pct > maxGlyphOverlapPct) {
          maxGlyphOverlapPct = pct
          overlappingLine = gr
        }
      }
    }
    // box-level overlap (div bounding box incl. reserved padding gutter) for reference
    let boxOverlapPct = 0
    if (sealRect) {
      const ix = Math.max(0, Math.min(certRect.right, sealRect.right) - Math.max(certRect.left, sealRect.left))
      const iy = Math.max(0, Math.min(certRect.bottom, sealRect.bottom) - Math.max(certRect.top, sealRect.top))
      const interArea = ix * iy
      const sealArea = sealRect.width * sealRect.height
      boxOverlapPct = sealArea > 0 ? (interArea / sealArea) * 100 : 0
    }
    return {
      found: true,
      certText: certDiv.textContent,
      certRect: { x: certRect.x, y: certRect.y, w: certRect.width, h: certRect.height, right: certRect.right, bottom: certRect.bottom },
      sealRect: sealRect ? { x: sealRect.x, y: sealRect.y, w: sealRect.width, h: sealRect.height } : null,
      numLines,
      glyphRects,
      maxGlyphOverlapPct,
      overlappingLine,
      boxOverlapPct,
      paddingRight: getComputedStyle(certDiv).paddingRight,
    }
  })

  await page.screenshot({ path: `${OUT}/cert-${name}-full.png` })
  // crop around the cert area if found
  if (measurement.found) {
    const pad = 20
    const clip = {
      x: Math.max(0, measurement.certRect.x - pad),
      y: Math.max(0, measurement.certRect.y - pad),
      width: Math.min(viewport.width - Math.max(0, measurement.certRect.x - pad), measurement.certRect.w + pad * 2 + 40),
      height: measurement.certRect.h + pad * 2 + 40,
    }
    await page.screenshot({ path: `${OUT}/cert-${name}-crop.png`, clip })
  }

  await browser.close()
  return { name, settledFound: !!settledText, measurement, settledSnippet: settledText.slice(settledText.indexOf('GLASS BOX') - 20, settledText.indexOf('GLASS BOX') + 300) }
}

const results = []
results.push(await runViewport('pixel7', { width: 412, height: 915 }, true))
results.push(await runViewport('iphone14pro', { width: 393, height: 852 }, true))
results.push(await runViewport('desktop', { width: 1440, height: 900 }, false))

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
