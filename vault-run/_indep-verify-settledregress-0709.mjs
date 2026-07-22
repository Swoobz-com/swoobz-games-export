// Isolated follow-up: the main verifier's settled-regression probe queried
// BET AGAIN immediately on settledpanel mount and got null (element not yet
// mounted — likely a staggered settle-transition). This repro adds a real
// settle-transition wait before reading, self-contained (own dev server).
import { spawn } from 'node:child_process'
import http from 'node:http'
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
const URL = `http://localhost:${PORT}/`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = {
  Pixel7: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  iPhone14Pro: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
}

function computeGridLayout(W, H, gridSize, minimalBands) {
  const wide = W / H > 1.2
  const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15)
  const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18)
  const sideFrac = minimalBands ? 0.04 : 0.08
  const safeW = W * (1 - sideFrac * 2)
  const safeH = (H - topReserved - bottomReserved) * 0.96
  const available = Math.min(safeW, safeH)
  const FIXED_TILE = 96
  const FIXED_GAP = 16
  const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1)
  if (minimalBands && fixedFull <= available + 0.5) {
    const x = (W - fixedFull) / 2
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
    const y = bandCenterY - fixedFull / 2
    return { x, y, tile: FIXED_TILE, gap: FIXED_GAP, full: fixedFull }
  }
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY - full / 2
  return { x, y, tile, gap, full }
}
async function boardBox(p) {
  return p.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
async function tapCell(p, box, col, row, cols, minimalBands) {
  const grid = computeGridLayout(box.w, box.h, cols, minimalBands)
  const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
  const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
  await p.touchscreen.tap(cx, cy)
}
async function isSettled(p) {
  return p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'))
}
async function tapScrolledIntoView(p, tag, re) {
  const found = await p.evaluate(
    (tag, src) => {
      const re = new RegExp(src[0], src[1])
      const els = [...document.querySelectorAll(tag)]
      const el = els.find((e) => re.test((e.textContent || '').trim()))
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      return true
    },
    tag,
    [re.source, re.flags],
  )
  if (!found) return null
  await wait(150)
  return p.evaluate(
    (tag, src) => {
      const re = new RegExp(src[0], src[1])
      const els = [...document.querySelectorAll(tag)]
      const el = els.find((e) => re.test((e.textContent || '').trim()))
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    },
    tag,
    [re.source, re.flags],
  )
}

async function main() {
  const out = {}
  const child = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: __dirname, shell: true })
  let browser
  try {
    const up = await (async () => {
      const start = Date.now()
      while (Date.now() - start < 30000) {
        const ok = await new Promise((resolve) => {
          const req = http.get(URL, (res) => {
            resolve(res.statusCode === 200)
            res.resume()
          })
          req.on('error', () => resolve(false))
          req.setTimeout(1000, () => {
            req.destroy()
            resolve(false)
          })
        })
        if (ok) return true
        await wait(300)
      }
      return false
    })()
    if (!up) throw new Error('dev server did not come up')
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })

    for (const [device, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage()
      await page.setCacheEnabled(false)
      await page.setViewport(vp)
      await page.goto(URL, { waitUntil: 'domcontentloaded' })
      await wait(400)
      const sendIt = await tapScrolledIntoView(page, 'button', /send it/i)
      await page.touchscreen.tap(sendIt.x, sendIt.y)
      await wait(800)
      // Force a fast LOSS deterministically: tap the same fixed cell
      // repeatedly (cycling all 25) until settled — same approach as the
      // main driver, but this time we give the settle TRANSITION real time
      // to finish (poll up to 3000ms after settledpanel first mounts).
      let settledNow = await isSettled(page)
      let guard = 0
      while (!settledNow && guard < 24) {
        guard++
        const box = await boardBox(page)
        if (!box) break
        const col = guard % 5
        const row = Math.floor(guard / 5) % 5
        await tapCell(page, box, col, row, 5, true)
        await wait(750)
        settledNow = await isSettled(page)
      }
      if (!settledNow) {
        out[device] = { error: 'never settled' }
        await page.close()
        continue
      }
      // Poll for BET AGAIN to actually mount (settle-transition stagger).
      let betAgainRect = null
      const pollStart = Date.now()
      while (!betAgainRect && Date.now() - pollStart < 3000) {
        betAgainRect = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="vault-settled-betagain"]')
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { bottom: r.bottom, top: r.top, innerHeight: window.innerHeight }
        })
        if (!betAgainRect) await wait(200)
      }
      const msToMount = Date.now() - pollStart
      const captionGap = await page.evaluate(() => {
        const cap = document.querySelector('[data-testid="vault-settled-board-caption"]')
        const panel = document.querySelector('[data-testid="vault-settledpanel"]')
        if (!cap || !panel) return null
        const cr = cap.getBoundingClientRect()
        const pr = panel.getBoundingClientRect()
        return { gap: pr.top - cr.bottom }
      })
      out[device] = { betAgainRect, msToMount, captionGap }
      await page.screenshot({ path: path.join(__dirname, `_verify-indep-0709/${device}-05b-settled-betagain-polled.png`) })
      await page.close()
    }
  } finally {
    if (browser) await browser.close().catch(() => {})
    const { execSync } = await import('node:child_process')
    if (child && child.pid) {
      try {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
      } catch (e) {}
    }
    try {
      const outp = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`, { encoding: 'utf8' })
      const pids = [...new Set(outp.split('\n').map((l) => l.trim().split(/\s+/).pop()).filter(Boolean))]
      for (const pid of pids) {
        try {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
        } catch (e) {}
      }
    } catch (e) {}
  }
  console.log(JSON.stringify(out, null, 2))
}
main().catch((e) => {
  console.error('FATAL', e)
  process.exitCode = 1
})
