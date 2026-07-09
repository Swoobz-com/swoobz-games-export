import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-brandqa-0704'

async function sample(page, file, points) {
  const b64 = fs.readFileSync(`${OUT}/${file}`).toString('base64')
  const result = await page.evaluate(async ({ b64, points }) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64 })
    const cvs = document.createElement('canvas')
    cvs.width = img.naturalWidth; cvs.height = img.naturalHeight
    const ctx = cvs.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const out = []
    for (const [x, y] of points) {
      const grid = []
      for (let dy = -2; dy <= 2; dy++) {
        const row = []
        for (let dx = -2; dx <= 2; dx++) {
          const d = ctx.getImageData(x + dx, y + dy, 1, 1).data
          row.push([d[0], d[1], d[2], d[3]])
        }
        grid.push(row)
      }
      out.push({ x, y, grid })
    }
    return out
  }, { b64, points })
  return result
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]

const jobs = {
  'full-desktop-lobby.png': [[1275,69],[1308,69],[1302,75],[1308,75],[621,970],[685,970],[688,970],[838,970]],
  'full-desktop-midcascade.png': [[809,169],[810,171],[812,172],[811,173],[812,173],[811,174],[809,175]],
  'full-badvein-transient.png': [[485,148],[488,148],[492,148]],
  'full-mobile-lobby.png': [[743,140],[743,141],[743,142],[700,143],[743,143],[750,143],[743,145],[721,147]],
}
for (const [file, pts] of Object.entries(jobs)) {
  console.log('===', file, '===')
  const res = await sample(page, file, pts)
  for (const r of res) {
    console.log(`(${r.x},${r.y}) center=rgba(${r.grid[2][2].join(',')})`)
  }
}
await browser.close()
