import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5779/'
const OUTDIR = 'shots-revert-0705'
fs.mkdirSync(OUTDIR, { recursive: true })

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function clickText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const all = Array.from(document.querySelectorAll('button'))
    return all.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null
  }, text)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

// Mirrors VaultGridCanvas.tsx's computeGridLayout exactly.
function computeGridLayout(W, H, gridSize, minimalBands) {
  const wide = W / H > 1.2
  const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15)
  const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18)
  const sideFrac = minimalBands ? 0.04 : 0.08
  const safeW = W * (1 - sideFrac * 2)
  const safeH = (H - topReserved - bottomReserved) * 0.96
  const available = Math.min(safeW, safeH)
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  return { x, full }
}

async function checkWidth(browser, w, h) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h })
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await sleep(300)
  await clickText(page, 'ape in')
  await sleep(300)
  const data = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const canvas = shell ? shell.querySelector('canvas') : null
    const right = document.querySelector('[data-testid="vault-betentry-right"]')
    if (!canvas || !right) return null
    const cRect = canvas.getBoundingClientRect()
    const rRect = right.getBoundingClientRect()
    return {
      canvasLeft: cRect.left, canvasWidth: cRect.width, canvasHeight: cRect.height,
      rightStackLeft: rRect.left, rightStackWidth: rRect.width,
      viewportW: window.innerWidth,
    }
  })
  await page.close()
  if (!data) return { w, h, error: 'missing elements' }
  const grid = computeGridLayout(data.canvasWidth, data.canvasHeight, 5, false)
  const expectedBoardRightPageX = data.canvasLeft + grid.x + grid.full
  const gap = data.rightStackLeft - expectedBoardRightPageX
  const overlap = data.rightStackLeft < expectedBoardRightPageX
  const offscreen = data.rightStackLeft + data.rightStackWidth > data.viewportW
  return { w, h, gap: Number(gap.toFixed(2)), overlap, offscreen, ...data }
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const widths = [960, 1024, 1150, 1440, 1920, 2560]
  const out = {}
  for (const width of widths) {
    out[width] = await checkWidth(browser, width, 900)
  }
  await browser.close()
  fs.writeFileSync(`${OUTDIR}/anchor-check.json`, JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
