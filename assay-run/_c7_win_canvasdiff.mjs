import puppeteer from 'puppeteer-core'
import { EXE, URL, wait, reachPlanning, selectTier, paintTilesMouse, commit, pollForPhaseText, clickText } from './_a11yHelpers.mjs'

async function getCanvasFrame(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    const ctx = c.getContext('2d')
    const w = Math.round(c.width), h = Math.round(c.height)
    const data = ctx.getImageData(0, 0, w, h).data
    const N = 64
    const cellW = w / N, cellH = h / N
    const cells = new Float64Array(N * N)
    for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
      const x0 = Math.floor(cx*cellW), y0 = Math.floor(cy*cellH)
      const x1 = Math.min(w, Math.floor((cx+1)*cellW)), y1 = Math.min(h, Math.floor((cy+1)*cellH))
      let sum=0,n=0
      for (let y=y0;y<y1;y+=2) for (let x=x0;x<x1;x+=2) {
        const i=(y*w+x)*4; sum += 0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2]; n++
      }
      cells[cy*N+cx] = n ? sum/n : 0
    }
    return { cells: Array.from(cells) }
  })
}
function diffPct(a,b,th=4){ let c=0; for(let i=0;i<a.cells.length;i++) if(Math.abs(a.cells[i]-b.cells[i])>th) c++; return c/a.cells.length }

async function runWinDiff(reduce) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
  const page = (await browser.pages())[0]
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }])
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await wait(500)
  await reachPlanning(page)
  let won = false
  for (let a = 0; a < 8 && !won; a++) {
    await selectTier(page, 'REEF SHELF')
    await paintTilesMouse(page, Array.from({ length: 8 }, (_, i) => a * 9 + i))
    await wait(100)
    await commit(page)
    const settled = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 7000)
    if (settled && /SECURED THE HAUL/i.test(settled)) { won = true; break }
    await clickText(page, 'DIVE AGAIN')
    await wait(250)
  }
  if (!won) { await browser.close(); return { won: false } }
  // Redo a fresh win to measure the canvas from the MOMENT of settle onward
  // (the above loop already consumed the celebration window on the winning
  // attempt) -- so re-trigger DIVE AGAIN -> SAME LINE isn't guaranteed win;
  // just measure THIS settle's tail + immediately sample going forward isn't
  // possible retroactively, so instead: force another win fresh and sample
  // from t=0 of commit.
  await clickText(page, 'DIVE AGAIN').catch(()=>{})
  await wait(250)
  let won2 = false
  const frames = []
  const stamps = [0, 40, 80, 120, 180, 260, 360, 500, 700, 900]
  for (let a = 0; a < 8 && !won2; a++) {
    await selectTier(page, 'REEF SHELF')
    await paintTilesMouse(page, Array.from({ length: 8 }, (_, i) => a * 9 + i))
    await wait(100)
    // commit and immediately start sampling; poll settle text concurrently by racing timers
    await commit(page)
    let prev = 0
    let sawWin = false
    for (const dt of stamps) {
      if (dt > 0) await wait(dt - prev)
      prev = dt
      frames.push(await getCanvasFrame(page))
    }
    const txt = await page.evaluate(() => document.body.innerText)
    if (/SECURED THE HAUL/.test(txt)) { won2 = true; sawWin = true }
    if (!sawWin) {
      const settled = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 3000)
      if (settled && /SECURED THE HAUL/i.test(settled)) won2 = true
      else { await clickText(page, 'DIVE AGAIN'); await wait(250); frames.length = 0 }
    }
  }
  const diffs = []
  let maxDiff = 0
  for (let i = 1; i < frames.length; i++) {
    const d = diffPct(frames[i-1], frames[i])
    diffs.push({ atMs: stamps[i % stamps.length] ?? null, diff: d })
    if (d > maxDiff) maxDiff = d
  }
  await browser.close()
  return { won: won2, diffs, maxDiff }
}

async function main() {
  const on = await runWinDiff(true)
  const off = await runWinDiff(false)
  console.log(JSON.stringify({ on, off }, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
