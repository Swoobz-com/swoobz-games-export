import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import { PNG } from 'pngjs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/rgc5-qa'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = (page, re) =>
  page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const b = [...document.querySelectorAll('button, div, span')].find(
      (x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'),
    )
    if (b) {
      b.click()
      return (b.textContent || '').trim()
    }
    return null
  }, re.source)

async function boardGeo(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width }
  })
}
async function traceCells(page, cells) {
  const geo = await boardGeo(page)
  const TILE = geo.w / 14
  for (const [col, row] of cells) {
    await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(15)
  }
}

// Build N distinct cells across the 14x14 grid, row by row, skipping (0,0)/(13,13) edges.
function buildTrail(n) {
  const cells = []
  outer: for (let row = 1; row < 13; row++) {
    for (let col = 1; col < 13; col++) {
      cells.push([col, row])
      if (cells.length >= n) break outer
    }
  }
  return cells
}

async function ensurePace(page, wantInstant) {
  for (let i = 0; i < 3; i++) {
    const cur = await page.evaluate(() => {
      const el = [...document.querySelectorAll('button,div,span')].find((x) => /PACE:\s*(INSTANT|DUCAT)/i.test(x.textContent || ''))
      return el ? (el.textContent || '').trim() : null
    })
    if (!cur) return 'no-pace-control'
    const isInstant = /INSTANT/i.test(cur)
    if (isInstant === wantInstant) return cur
    await clickText(page, /PACE:/)
    await wait(150)
  }
  return 'gave-up'
}

async function setWagerChip(page, dollarLabelRe) {
  return clickText(page, dollarLabelRe)
}

async function heroCropRect(page) {
  // The hero-pop cartouche is centered at 50% / (38% wide, 62% narrow) of the
  // board rect. We crop a fixed, generous box around that anchor point so
  // both scenarios use IDENTICAL page-relative crop coordinates.
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const isWide = window.innerWidth >= 1080
    const topPct = isWide ? 0.38 : 0.62
    const cx = r.left + r.width / 2
    const cy = r.top + r.height * topPct
    const halfW = 220
    const halfH = 160
    return { x: Math.round(cx - halfW), y: Math.round(cy - halfH), width: halfW * 2, height: halfH * 2 }
  })
}

async function runScenario(browser, { name, trailLen, chipRe, viewport }) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const page = await browser.newPage()
    await page.setViewport(viewport)
    await page.goto(URL, { waitUntil: 'load' })
    await wait(500)
    await page.evaluate(() => {
      try {
        localStorage.clear()
      } catch {}
    })
    await page.reload({ waitUntil: 'load' })
    await wait(500)
    await clickText(page, /ENTER THE DIVE/)
    await wait(250)
    await clickText(page, /REEF/) // lean tier = 6 bombs, easiest to survive long trails
    await wait(150)
    await setWagerChip(page, chipRe)
    await wait(150)
    await ensurePace(page, true) // INSTANT pace: single-frame settle, most deterministic timing
    await traceCells(page, buildTrail(trailLen))
    await wait(150)
    const crop = await heroCropRect(page)
    await clickText(page, /^RUN THE LINE/)
    // Poll for settle text.
    let won = null
    for (let i = 0; i < 60; i++) {
      const txt = await page.evaluate(() => document.body.innerText)
      if (/SECURED THE HAUL/.test(txt)) {
        won = true
        break
      }
      if (/RUGGED BY THE DEEP/.test(txt)) {
        won = false
        break
      }
      await wait(40)
    }
    if (won === true) {
      // SYNCED capture — instead of trusting wall-clock timing (which is
      // subject to Node<->CDP<->browser scheduling jitter), read the ACTUAL
      // browser CSS Animation clock for the assayHeroPop keyframe animation
      // and busy-poll until its own currentTime crosses each target ms, then
      // shoot. This removes ALL test-harness jitter from the comparison —
      // any residual pixel diff at these frames is attributable ONLY to the
      // game's own rendering, not to when Node happened to poll.
      // Guard: give the settled DOM subtree (hero-pop element + its CSS
      // animation) one full paint cycle to actually mount before we start
      // querying getAnimations() — querying in the SAME tick as the text
      // becomes visible can race the animation's own creation.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      const animTargets = [50, 200, 425, 900, 1400, 1650]
      const achieved = []
      for (const target of animTargets) {
        let lastCt = null
        for (let i = 0; i < 300; i++) {
          const ct = await page.evaluate(() => {
            const a = document.getAnimations().find((x) => x.animationName === 'assayHeroPop')
            return a ? a.currentTime : null
          })
          lastCt = ct
          if (ct == null) break
          if (ct >= target) break
          await wait(3)
        }
        const shot = await page.screenshot({ clip: crop })
        fs.writeFileSync(`${OUT}/${name}-anim${String(target).padStart(4, '0')}.png`, shot)
        achieved.push({ target, ct: lastCt })
      }
      console.log(`[${name}] anim-clock achieved:`, JSON.stringify(achieved))
      const payoutTxt = await page.evaluate(() => {
        const el = [...document.querySelectorAll('div,span')].find((x) => (x.textContent || '').trim() === 'SECURED THE HAUL')
        let p = el
        for (let i = 0; i < 3 && p; i++) p = p.parentElement
        return p ? p.innerText.replace(/\n+/g, ' | ') : '(not found)'
      })
      console.log(`[${name}] WON on attempt ${attempt + 1}. crop=${JSON.stringify(crop)} heroBlock="${payoutTxt}"`)
      await page.close()
      return { crop, payoutTxt }
    }
    await page.close()
  }
  console.log(`[${name}] FAILED to reach WIN in 25 tries`)
  return null
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--window-size=1500,1000'] })

const viewport = { width: 1440, height: 900, deviceScaleFactor: 1 }

const small = await runScenario(browser, { name: 'SMALL', trailLen: 8, chipRe: /^1$/, viewport })
const large = await runScenario(browser, { name: 'LARGE', trailLen: 40, chipRe: /^50$/, viewport })

console.log('\nSMALL result:', small)
console.log('LARGE result:', large)

// Pixel-diff each corresponding frame pair.
if (small && large) {
  const offsets = [50, 200, 425, 900, 1400, 1650].map((off) => ({ off, prefix: 'anim' }))
  const results = []
  for (const { off, prefix } of offsets) {
    const suffix = `${prefix}${String(off).padStart(4, '0')}.png`
    const aPath = `${OUT}/SMALL-${suffix}`
    const bPath = `${OUT}/LARGE-${suffix}`
    if (!fs.existsSync(aPath) || !fs.existsSync(bPath)) continue
    const a = PNG.sync.read(fs.readFileSync(aPath))
    const b = PNG.sync.read(fs.readFileSync(bPath))
    if (a.width !== b.width || a.height !== b.height) {
      results.push({ off, error: `size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}` })
      continue
    }
    let diffPixels = 0
    let maxChannelDiff = 0
    // Build a diff image for visual inspection: red where pixels differ.
    const diffPng = new PNG({ width: a.width, height: a.height })
    for (let i = 0; i < a.data.length; i += 4) {
      const dr = Math.abs(a.data[i] - b.data[i])
      const dg = Math.abs(a.data[i + 1] - b.data[i + 1])
      const db = Math.abs(a.data[i + 2] - b.data[i + 2])
      const d = Math.max(dr, dg, db)
      if (d > 24) {
        diffPixels++
        maxChannelDiff = Math.max(maxChannelDiff, d)
        diffPng.data[i] = 255
        diffPng.data[i + 1] = 0
        diffPng.data[i + 2] = 0
        diffPng.data[i + 3] = 255
      } else {
        diffPng.data[i] = a.data[i]
        diffPng.data[i + 1] = a.data[i + 1]
        diffPng.data[i + 2] = a.data[i + 2]
        diffPng.data[i + 3] = 60
      }
    }
    fs.writeFileSync(`${OUT}/DIFF-${suffix}`, PNG.sync.write(diffPng))
    const totalPixels = a.width * a.height
    results.push({ frame: `${prefix}${off}`, diffPixels, totalPixels, pct: ((diffPixels / totalPixels) * 100).toFixed(2), maxChannelDiff })
  }
  console.log('\n===== PIXEL-DIFF RESULTS (hero-pop crop, SMALL vs LARGE win, same elapsed-ms offsets) =====')
  console.log(JSON.stringify(results, null, 2))
  fs.writeFileSync(`${OUT}/diff-summary.json`, JSON.stringify({ small, large, results }, null, 2))
}

await browser.close()
