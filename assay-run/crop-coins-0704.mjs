import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-rescore-0704'
const jobs = [
  { file: 'd1440-05-WIN-settle-02.png', clip: { x: 560, y: 430, w: 360, h: 260 }, zoom: 3, out: 'crop-d1440-coins.png' },
  { file: 'd2560-04-assay-08.png', clip: { x: 980, y: 260, w: 560, h: 380 }, zoom: 2, out: 'crop-d2560-coins.png' },
]
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
for (const j of jobs) {
  const path = `${process.cwd()}/${OUT}/${j.file}`.replace(/\\/g, '/')
  if (!fs.existsSync(`${OUT}/${j.file}`)) { console.log('missing', j.file); continue }
  const b64 = fs.readFileSync(`${OUT}/${j.file}`).toString('base64')
  await page.setViewport({ width: Math.ceil(j.clip.w * j.zoom) + 4, height: Math.ceil(j.clip.h * j.zoom) + 4, deviceScaleFactor: 1 })
  await page.setContent(`<body style="margin:0;background:#000"><div style="width:${j.clip.w * j.zoom}px;height:${j.clip.h * j.zoom}px;overflow:hidden"><img src="data:image/png;base64,${b64}" style="image-rendering:auto;transform-origin:top left;transform:scale(${j.zoom}) translate(${-j.clip.x}px,${-j.clip.y}px)"></div></body>`)
  await new Promise(r => setTimeout(r, 300))
  await page.screenshot({ path: `${OUT}/${j.out}` })
  console.log('wrote', j.out)
}
await browser.close()
