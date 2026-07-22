import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-a11y-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function relLum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const [R, G, B] = [r, g, b].map(f)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}
function contrast(rgb1, rgb2) {
  const l1 = relLum(rgb1), l2 = relLum(rgb2)
  const [a, b] = [Math.max(l1, l2), Math.min(l1, l2)]
  return (a + 0.05) / (b + 0.05)
}

async function clickText(page, txt) {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const clickTier = (page, label) => page.evaluate((lbl) => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find((b) => b.textContent && b.textContent.includes(lbl))
  if (b) { b.click(); return true }
  return false
}, label)

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
  })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await clickTier(page, 'Flooded Floor') // most bombs (8/100) -> easiest to force a bust with a big trail
  await wait(150)

  // Paint almost the whole board (drag across all rows) to maximize bust odds.
  const canvasBox = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  const tile = canvasBox.w / 10
  await page.mouse.move(canvasBox.x + tile * 0.5, canvasBox.y + tile * 0.5)
  await page.mouse.down()
  for (let row = 0; row < 10; row++) {
    const y = canvasBox.y + tile * (row + 0.5)
    for (let col = 0; col < 10; col++) {
      const x = canvasBox.x + tile * (col + 0.5)
      await page.mouse.move(x, y, { steps: 2 })
    }
  }
  await page.mouse.up()
  await wait(200)
  await page.screenshot({ path: `${OUT}/05-trail-painted.png` })

  const trailInfo = await page.evaluate(() => document.body.innerText.match(/Claim-line armed[^\n]*|Select \d+ more[^\n]*/)?.[0] || null)
  console.log('trailInfo:', trailInfo)

  // Plunge
  const plunged = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label*="breaker"]')
    if (b && !b.disabled) { b.click(); return true }
    return false
  })
  console.log('plunged:', plunged)

  // Capture rapid frames to check flash timing / measure brightness over time.
  const frames = []
  const t0 = Date.now()
  for (let i = 0; i < 24; i++) {
    const b64 = await page.screenshot({ encoding: 'base64', clip: { x: canvasBox.x, y: canvasBox.y, width: canvasBox.w, height: canvasBox.h } })
    frames.push({ t: Date.now() - t0, b64 })
    await wait(60)
  }

  // Compute avg brightness per frame in-browser (fast) and free the buffers.
  const brightness = []
  for (const f of frames) {
    const b = await page.evaluate((b64) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width; c.height = img.height
          const ctx = c.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const data = ctx.getImageData(0, 0, img.width, img.height).data
          let sum = 0, n = 0
          for (let i = 0; i < data.length; i += 4 * 37) { // sparse sample for speed
            sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
            n++
          }
          resolve(sum / n)
        }
        img.src = 'data:image/png;base64,' + b64
      })
    }, f.b64)
    brightness.push({ t: f.t, brightness: b })
  }
  fs.writeFileSync(`${OUT}/flash-brightness.json`, JSON.stringify(brightness, null, 2))
  console.log(JSON.stringify(brightness))

  await wait(1500)
  await page.screenshot({ path: `${OUT}/06-settled.png` })

  // ---- outcome / settled checks ----
  const outcomeInfo = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => /BAD VEIN|CLAIM PROVEN/.test(e.textContent || '') && e.children.length === 0)
    return el ? { text: el.textContent, tag: el.tagName } : null
  })
  console.log('outcomeInfo:', JSON.stringify(outcomeInfo))

  const ariaLiveSettled = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]')].map((e) => ({ tag: e.tagName, ariaLive: e.getAttribute('aria-live'), text: e.textContent?.slice(0, 80) }))
  )
  console.log('ariaLiveSettled:', JSON.stringify(ariaLiveSettled))

  // Contrast sample for BAD VEIN / BUSTED text if present
  const bustedRect = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => /BAD VEIN . BUSTED/.test(e.textContent || '') && e.children.length === 0)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  let bustedContrast = null
  if (bustedRect) {
    const b64 = await page.screenshot({ encoding: 'base64' })
    bustedContrast = await page.evaluate(({ b64, rect }) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width; c.height = img.height
          const ctx = c.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const cy = Math.round(rect.y + rect.h / 2)
          const before = ctx.getImageData(Math.max(0, Math.round(rect.x) - 6), cy, 5, 1).data
          const inside = ctx.getImageData(Math.round(rect.x), cy, Math.round(rect.w), 1).data
          const bgArr = []
          for (let i = 0; i < before.length; i += 4) bgArr.push([before[i], before[i + 1], before[i + 2]])
          const fgCandidates = []
          for (let i = 0; i < inside.length; i += 4) fgCandidates.push([inside[i], inside[i + 1], inside[i + 2]])
          resolve({ bgSamples: bgArr, fgSamples: fgCandidates })
        }
        img.src = 'data:image/png;base64,' + b64
      })
    }, { b64, rect: bustedRect })
  }
  fs.writeFileSync(`${OUT}/busted-contrast-raw.json`, JSON.stringify({ bustedRect, bustedContrast }, null, 2))

  // Reach ASSAY AGAIN / CLOSE via Tab from body
  await page.evaluate(() => document.body.focus())
  const restartTab = []
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const e = document.activeElement
      if (!e || e === document.body) return null
      return { tag: e.tagName, text: (e.textContent || '').trim().slice(0, 30) }
    })
    restartTab.push(info)
  }
  fs.writeFileSync(`${OUT}/restart-tab-sweep.json`, JSON.stringify(restartTab, null, 2))
  console.log('restartTab:', JSON.stringify(restartTab))

  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
