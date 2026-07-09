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

async function measure(page, leftTestId, rightTestId) {
  return page.evaluate((leftId, rightId) => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const canvas = shell ? shell.querySelector('canvas') : null
    const left = leftId ? document.querySelector(`[data-testid="${leftId}"]`) : null
    const right = rightId ? document.querySelector(`[data-testid="${rightId}"]`) : null
    if (!canvas) return null
    const cRect = canvas.getBoundingClientRect()
    return {
      canvasLeft: cRect.left, canvasRight: cRect.right, canvasWidth: cRect.width, canvasHeight: cRect.height,
      leftRect: left ? left.getBoundingClientRect().toJSON() : null,
      rightRect: right ? right.getBoundingClientRect().toJSON() : null,
      viewportW: window.innerWidth,
    }
  }, leftTestId, rightTestId)
}

function analyze(data) {
  if (!data) return null
  const grid = computeGridLayout(data.canvasWidth, data.canvasHeight, 5, false)
  const boardLeftPageX = data.canvasLeft + grid.x
  const boardRightPageX = data.canvasLeft + grid.x + grid.full
  const out = {}
  if (data.leftRect) {
    out.leftGap = Number((boardLeftPageX - data.leftRect.right).toFixed(2))
    out.leftOverlap = data.leftRect.right > boardLeftPageX
  }
  if (data.rightRect) {
    out.rightGap = Number((data.rightRect.left - boardRightPageX).toFixed(2))
    out.rightOverlap = data.rightRect.left < boardRightPageX
    out.rightOffscreen = data.rightRect.left + data.rightRect.width > data.viewportW
  }
  return out
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const viewports = [[1440, 900], [1920, 1080], [1440, 1920]]
  const results = {}
  for (const [w, h] of viewports) {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h })
    await page.goto(BASE, { waitUntil: 'networkidle0' })
    await sleep(300)
    const key = `${w}x${h}`
    results[key] = {}
    // Lobby
    results[key].lobby = analyze(await measure(page, 'vault-lobby-left', 'vault-lobby-right'))
    // -> BetEntry -> Playing
    await clickText(page, 'ape in')
    await sleep(250)
    const sendIt = await page.$('[data-testid="vault-betentry-confirm"] button')
    if (sendIt) await sendIt.click()
    await sleep(350)
    results[key].playing = analyze(await measure(page, 'vault-playing-left', 'vault-playing-right'))
    // sweep to settle
    await clickText(page, 'MANUAL')
    const canvas = await page.$('[data-testid="vault-canvas-shell"] canvas')
    const box = canvas ? await canvas.boundingBox() : null
    if (box) {
      outer: for (let gx = 1; gx <= 9; gx++) {
        for (let gy = 1; gy <= 9; gy++) {
          const settled = await page.$('[data-testid="vault-settled-betagain"]')
          if (settled) break outer
          await page.mouse.click(box.x + (box.width * gx) / 10, box.y + (box.height * gy) / 10)
          await sleep(100)
        }
      }
    }
    await sleep(400)
    results[key].settled72 = analyze(await measure(page, 'vault-settled-left', 'vault-settled-right'))
    results[key].settled400 = analyze(await measure(page, null, 'vault-gutter-right'))
    await page.close()
  }
  await browser.close()
  fs.writeFileSync(`${OUTDIR}/anchor-check-allphases.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
