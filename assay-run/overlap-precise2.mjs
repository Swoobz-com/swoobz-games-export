import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const railVsBoard = (page) => page.evaluate(() => {
  const all = [...document.querySelectorAll('div')]
  const boardPanel = all.find((d) => (getComputedStyle(d).boxShadow || '').includes('24px 60px'))
  if (!boardPanel) return { ok: false, reason: 'board panel not found' }
  const boardRect = boardPanel.getBoundingClientRect()
  // The RailShell is the counter card's own NEXT SIBLING in the flex row
  // (wide) — or, on narrow, the rail content lives INSIDE the board panel
  // itself (bottom in-flow dock), so there's structurally nothing to
  // overlap in that case.
  const sibling = boardPanel.nextElementSibling
  const siblingRect = sibling ? sibling.getBoundingClientRect() : null
  let overlap = null
  if (siblingRect && siblingRect.width > 0 && siblingRect.height > 0) {
    const overlapX = Math.max(0, Math.min(siblingRect.right, boardRect.right) - Math.max(siblingRect.left, boardRect.left))
    const overlapY = Math.max(0, Math.min(siblingRect.bottom, boardRect.bottom) - Math.max(siblingRect.top, boardRect.top))
    overlap = { overlapX, overlapY, hasOverlap: overlapX > 2 && overlapY > 2 }
  }
  return {
    ok: true,
    boardRect: { x: boardRect.x, y: boardRect.y, w: boardRect.width, h: boardRect.height },
    siblingRect: siblingRect ? { x: siblingRect.x, y: siblingRect.y, w: siblingRect.width, h: siblingRect.height } : null,
    siblingTag: sibling ? sibling.tagName : null,
    siblingTextSnippet: sibling ? (sibling.textContent || '').slice(0, 60) : null,
    overlap,
  }
})

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 1080, height: 800, name: '1080x800-atbreakpoint' },
  { width: 1079, height: 800, name: '1079x800-justbelow' },
  { width: 1200, height: 700, name: '1200x700-shortviewport' },
]

const results = {}
for (const vp of VIEWPORTS) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: vp.width, height: vp.height, deviceScaleFactor: 1 } })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  const isWide = await page.evaluate(() => window.innerWidth >= 1080)
  const res = await railVsBoard(page)
  results[vp.name] = { isWide, ...res }
  await browser.close()
}
fs.writeFileSync('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visreg-0704/overlap-precise2-report.json', JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
