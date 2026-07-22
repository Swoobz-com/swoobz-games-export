import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-codotty-elevation-0705'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas'); if (!c) return null
  const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }
})

async function run(label, width, height) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const page = (await browser.pages())[0]
  await page.setViewport({ width, height, deviceScaleFactor: 1 })

  // Lobby
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(600)
  await page.screenshot({ path: `${OUT}/${label}-1-lobby.png` })

  // Planning
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(500)
  const box = await canvasBox(page)
  const tile = box.w / 10
  // Short 3-disc line, column 4, rows 1..3 (min-length line, lowest bust odds)
  for (let r = 1; r <= 8; r++) {
    await page.mouse.click(box.x + 4 * tile + tile / 2, box.y + r * tile + tile / 2)
    await wait(70)
  }
  await wait(300)
  await page.screenshot({ path: `${OUT}/${label}-2-planning.png` })

  // Win-settle — retry short lines until a win lands
  let won = false
  for (let attempt = 0; attempt < 40 && !won; attempt++) {
    if (attempt > 0) {
      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
      await wait(400)
      await clickText(page, 'ENTER THE ASSAY LINE')
      await wait(400)
      const b2 = await canvasBox(page)
      const t2 = b2.w / 10
      for (let r = 1; r <= 8; r++) {
        await page.mouse.click(b2.x + 4 * t2 + t2 / 2, b2.y + r * t2 + t2 / 2)
        await wait(55)
      }
      await wait(200)
    }
    // Force INSTANT reveal so settlement resolves fast.
    await clickText(page, 'PACE: DISC-BY-DISC')
    await wait(120)
    await clickText(page, 'RUN THE LINE')
    // Poll for settlement (win or bust) up to ~5s.
    let state = 'none'
    for (let p = 0; p < 25; p++) {
      await wait(200)
      state = await page.evaluate(() => {
        const t = document.body.innerText
        if (/LINE CLAIMED/.test(t)) return 'won'
        if (/BUSTED/.test(t)) return 'bust'
        return 'none'
      })
      if (state !== 'none') break
    }
    if (state === 'won') {
      // grab it ~300ms into the settle so the cartouche + board bloom are lit
      await page.screenshot({ path: `${OUT}/${label}-3-winsettle.png` })
      won = true
      console.log(label, 'WON on attempt', attempt)
    } else {
      await clickText(page, 'ASSAY AGAIN')
      await wait(150)
    }
  }
  if (!won) console.log(label, 'no win captured')
  await browser.close()
}

await run('desktop1440', 1440, 900)
await run('mobile412', 412, 892)
console.log('done')
