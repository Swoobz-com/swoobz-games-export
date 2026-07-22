import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/abyss-receipt-reverify'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))

const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)

// RUN THE LINE / DIVE AGAIN etc. are div-based `CurrentKey` controls, not native
// <button> — so we can't scope to `button` only. Instead exclude the harness
// gotcha (logged 2026-07-06): a `div,span`-inclusive textContent regex can match
// a large ancestor div whose textContent absorbs an injected <style>/keyframes
// block's raw CSS text. Filter by (a) short own-text length and (b) either a real
// BUTTON tag or `cursor:pointer` (an actual clickable control, not a wrapper).
const findText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => {
    const t = (x.textContent || '').trim()
    if (!r.test(t) || t.length > 60) return false
    return x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'
  })
  return b ? { text: b.textContent.trim(), disabled: b.disabled === true, tag: b.tagName } : null
}, re.source)

async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); if(!c) return null; const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, bottom: r.bottom } }) }

// Mobile board is a fixed-MOBILE_TILE_PX canvas (e.g. 644x644, 14x14 grid) inside
// a `.assayBoardScroll` overflow:auto "pan-window" (e.g. 180x180 visible) — a raw
// unscrolled click coordinate outside that window doesn't miss quietly, it hits
// whatever OTHER page element happens to sit there (harness gotcha logged
// 2026-07-06). Scroll-center each target tile inside its scroller before tapping.
async function trace(page, cells, hasTouch){
  for (const [col, row] of cells) {
    await page.evaluate(([col, row]) => {
      const c = document.querySelector('canvas')
      const scroller = c && c.closest('.assayBoardScroll')
      if (!scroller) return
      const rect = c.getBoundingClientRect()
      const TILE = rect.width / 14
      const targetX = col * TILE + TILE / 2
      const targetY = row * TILE + TILE / 2
      scroller.scrollLeft = Math.max(0, Math.min(scroller.scrollWidth - scroller.clientWidth, targetX - scroller.clientWidth / 2))
      scroller.scrollTop = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, targetY - scroller.clientHeight / 2))
    }, [col, row])
    await wait(60)
    const geo = await boardGeo(page)
    const TILE = geo.w / 14
    const x = geo.left + col * TILE + TILE / 2
    const y = geo.top + row * TILE + TILE / 2
    if (hasTouch) { await page.touchscreen.tap(x, y) } else { await page.mouse.click(x, y) }
    await wait(40)
  }
}
const line8 = [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]

const results = { pass: [], fail: [], notes: [] }
function ok(name, cond, detail){ if(cond){ results.pass.push(name) } else { results.fail.push(`${name} :: ${detail||''}`) } console.log(cond?'PASS':'FAIL', name, detail||'') }

const consoleErrors = []
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

async function freshPage(viewport){
  const page = await browser.newPage()
  page.on('console', m => { if(m.type()==='error') consoleErrors.push(m.text()) })
  page.on('pageerror', e => consoleErrors.push('pageerror: '+e.message))
  const ctx = browser.defaultBrowserContext()
  try { await ctx.overridePermissions(URL, ['clipboard-read', 'clipboard-write']) } catch (e) { console.log('permission override failed', e.message) }
  await page.setViewport(viewport)
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'load' })
  await page.bringToFront()
  await wait(500)
  return page
}

// Measures the settled-receipt cluster: PAYOUT value, HallmarkSeal, both CopyGlyph buttons, headline, WRECK RECKONING line, seed/hash/round text.
async function measureReceipt(page) {
  return page.evaluate(() => {
    function rectOf(el) { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } }
    function intersect(a, b) {
      if (!a || !b) return 0
      const left = Math.max(a.left, b.left), right = Math.min(a.right, b.right)
      const top = Math.max(a.top, b.top), bottom = Math.min(a.bottom, b.bottom)
      const w = right - left, h = bottom - top
      if (w <= 0 || h <= 0) return 0
      return w * h
    }
    const bodyTxt = document.body.innerText
    // headline
    const headline = [...document.querySelectorAll('div')].find(x => /^(SECURED THE HAUL|RUGGED BY THE DEEP)$/i.test((x.textContent || '').trim()))
    // PAYOUT label + value
    const payoutLabel = [...document.querySelectorAll('div')].find(x => (x.textContent || '').trim() === 'PAYOUT')
    let payoutValueEl = null
    if (payoutLabel && payoutLabel.parentElement) {
      const sibs = [...payoutLabel.parentElement.children]
      payoutValueEl = sibs[sibs.indexOf(payoutLabel) + 1] || null
    }
    // WRECK RECKONING line — use LEAF-MOST match (a naive substring-match
    // over textContent also matches every ANCESTOR div, since textContent
    // bubbles up; the leaf-filter keeps only nodes with no matching
    // descendant, i.e. the actual innermost flex:1 text node).
    function leafMatch(tag, re) {
      const all = [...document.querySelectorAll(tag)].filter(x => re.test(x.textContent || ''))
      const leaves = all.filter(d => !all.some(o => o !== d && d.contains(o)))
      return leaves[0] || null
    }
    const wreck = leafMatch('div', /WRECK RECKONING/i)
    // seed / hash rows (span with wordBreak containing "seed" / "hash")
    const seedSpan = [...document.querySelectorAll('span')].find(x => /^seed\s/i.test((x.textContent || '').trim()))
    const hashSpan = [...document.querySelectorAll('span')].find(x => /^hash\s/i.test((x.textContent || '').trim()))
    const roundDiv = leafMatch('div', /^round\s/i)
    // copy buttons (aria-label starts with "Copy ")
    const copyBtns = [...document.querySelectorAll('button[aria-label^="Copy "]')]
    // hallmark seal: JSX renders <div flex-row><div flex:1>WRECK...</div><HallmarkSeal/></div> —
    // the seal is the wreck leaf's own NEXT SIBLING in that flex row (not a
    // shallow-children search from some huge mis-detected ancestor).
    const seal = wreck ? wreck.nextElementSibling : null

    const payoutRect = rectOf(payoutValueEl)
    const sealRect = rectOf(seal)
    const copy1Rect = copyBtns[0] ? rectOf(copyBtns[0]) : null
    const copy2Rect = copyBtns[1] ? rectOf(copyBtns[1]) : null

    return {
      headlineText: headline ? headline.textContent.trim() : null,
      payoutLabelPresent: !!payoutLabel,
      payoutValueText: payoutValueEl ? payoutValueEl.textContent.trim() : null,
      wreckText: wreck ? wreck.textContent.trim() : null,
      seedText: seedSpan ? seedSpan.textContent.trim() : null,
      hashText: hashSpan ? hashSpan.textContent.trim() : null,
      roundText: roundDiv ? roundDiv.textContent.trim() : null,
      sealPresent: !!seal,
      copyBtnCount: copyBtns.length,
      copyBtnLabels: copyBtns.map(b => b.getAttribute('aria-label')),
      copyBtnTexts: copyBtns.map(b => b.textContent.trim()),
      overlaps: {
        sealVsPayout: intersect(sealRect, payoutRect),
        sealVsCopy1: intersect(sealRect, copy1Rect),
        sealVsCopy2: intersect(sealRect, copy2Rect),
        copy1VsCopy2: intersect(copy1Rect, copy2Rect),
      },
      rects: { payoutRect, sealRect, copy1Rect, copy2Rect },
      bodyTxtSample: bodyTxt.slice(0, 400),
    }
  })
}

async function clickCopyButtonsAndVerify(page, tag) {
  const btnHandles = await page.$$('button[aria-label^="Copy "]')
  ok(`${tag} copy buttons found = 2`, btnHandles.length === 2, `found=${btnHandles.length}`)
  const out = []
  await page.bringToFront()
  await wait(200)
  for (let i = 0; i < btnHandles.length; i++) {
    const beforeText = await page.evaluate(el => el.textContent.trim(), btnHandles[i])
    const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), btnHandles[i])
    const expected = ariaLabel.replace(/^Copy /, '')
    await page.bringToFront()
    await btnHandles[i].click()
    await wait(150)
    const afterText = await page.evaluate(el => el.textContent.trim(), btnHandles[i])
    let clipboardText = null
    try {
      clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    } catch (e) {
      clipboardText = `ERR:${e.message}`
    }
    ok(`${tag} copy btn#${i + 1} text flips to "copied" on click`, afterText === 'copied', `before="${beforeText}" after="${afterText}"`)
    ok(`${tag} copy btn#${i + 1} clipboard content matches source text`, clipboardText === expected, `clip="${(clipboardText||'').slice(0,20)}..." expected="${expected.slice(0,20)}..."`)
    out.push({ ariaLabel, beforeText, afterText, clipboardMatches: clipboardText === expected })
    await wait(1300) // let the "copied" reset timer elapse before the next button, avoid cross-contamination
  }
  return out
}

async function runToSettle(page, depth, cells, hasTouch) {
  await clickText(page, /ENTER THE DIVE/); await wait(300)
  if (depth) await clickText(page, new RegExp(depth, 'i'))
  await wait(150)
  await trace(page, cells, hasTouch)
  await wait(150)
  await clickText(page, /^RUN THE LINE/)
  let settledText = null
  for (let i = 0; i < 40 && !settledText; i++) {
    await wait(120)
    const t = await page.evaluate(() => document.body.innerText)
    if (/SECURED THE HAUL/i.test(t) || /RUGGED BY THE DEEP/i.test(t)) settledText = t
  }
  return settledText
}

async function probeViewport(viewportName, viewport) {
  console.log(`\n===== ${viewportName} (${viewport.width}x${viewport.height}) =====`)

  // ---- WIN journey ----
  // NB: reuse ONE page across retry attempts (reload in place) rather than opening
  // a fresh browser.newPage() per attempt — repeated newPage()/close() cycles were
  // found (2026-07-06 harness debugging) to silently degrade the CDP
  // clipboard-write permission grant for whichever page survives, producing a
  // false "clipboard write denied" failure that does NOT reproduce with a single
  // reused page. Isolated repro: `_abyss_clipboard_probe4.mjs` (single page,
  // reload-per-retry) succeeds every time; the original multi-newPage retry loop
  // failed 8/8 times identically.
  let winPage = await freshPage(viewport)
  let winSettled = null
  for (let a = 0; a < 20 && !winSettled; a++) {
    if (a > 0) {
      await winPage.evaluate(() => { try { window.localStorage.clear() } catch {} })
      await winPage.reload({ waitUntil: 'load' })
      await winPage.bringToFront()
      await wait(400)
    }
    const t = await runToSettle(winPage, 'REEF', line8, !!viewport.hasTouch)
    if (t && /SECURED THE HAUL/i.test(t)) { winSettled = t; break }
  }
  ok(`${viewportName} WIN settle reachable`, !!winSettled)
  if (!winSettled) { await winPage.close(); winPage = null }
  if (winPage) {
    await winPage.screenshot({ path: `${OUT}/${viewportName}-win-settled.png` })
    const m = await measureReceipt(winPage)
    ok(`${viewportName} WIN headline renders (SECURED THE HAUL)`, /SECURED THE HAUL/i.test(m.headlineText || ''), m.headlineText)
    ok(`${viewportName} WIN PAYOUT value renders (non-empty $ amount)`, !!m.payoutValueText && /\$/.test(m.payoutValueText) === false ? /\d/.test(m.payoutValueText) : /\d/.test(m.payoutValueText||''), m.payoutValueText)
    ok(`${viewportName} WIN WRECK RECKONING line renders`, /WRECK RECKONING/i.test(m.wreckText || ''), m.wreckText)
    ok(`${viewportName} WIN seed text renders`, !!m.seedText && m.seedText.length > 10, (m.seedText||'').slice(0,40))
    ok(`${viewportName} WIN hash text renders`, !!m.hashText && m.hashText.length > 10, (m.hashText||'').slice(0,40))
    ok(`${viewportName} WIN round text renders`, !!m.roundText, m.roundText)
    ok(`${viewportName} WIN verify-seal (HallmarkSeal) present`, m.sealPresent)
    ok(`${viewportName} WIN both copy buttons present (count=2)`, m.copyBtnCount === 2, JSON.stringify(m.copyBtnLabels))
    ok(`${viewportName} WIN seal does not overlap PAYOUT`, m.overlaps.sealVsPayout === 0, `overlap=${m.overlaps.sealVsPayout}px2`)
    ok(`${viewportName} WIN seal does not overlap copy btn 1`, m.overlaps.sealVsCopy1 === 0, `overlap=${m.overlaps.sealVsCopy1}px2`)
    ok(`${viewportName} WIN seal does not overlap copy btn 2`, m.overlaps.sealVsCopy2 === 0, `overlap=${m.overlaps.sealVsCopy2}px2`)
    ok(`${viewportName} WIN copy btn1 does not overlap copy btn2`, m.overlaps.copy1VsCopy2 === 0, `overlap=${m.overlaps.copy1VsCopy2}px2`)

    // copy affordance functional test
    await clickCopyButtonsAndVerify(winPage, `${viewportName} WIN`)

    // restart path A: DIVE AGAIN
    const t0 = Date.now()
    await clickText(winPage, /DIVE AGAIN/)
    let advanced = false
    for (let i = 0; i < 20 && !advanced; i++) {
      await wait(50)
      const t = await winPage.evaluate(() => document.body.innerText)
      if (!/SECURED THE HAUL/i.test(t)) advanced = true
    }
    const restartMs = Date.now() - t0
    ok(`${viewportName} DIVE AGAIN restart advances state (no soft-lock)`, advanced, `${restartMs}ms`)
    ok(`${viewportName} DIVE AGAIN restart latency < 1500ms`, restartMs < 1500, `${restartMs}ms`)
    const postDiveAgain = await winPage.evaluate(() => document.body.innerText)
    ok(`${viewportName} post-DIVE-AGAIN: no leftover receipt (SECURED/RUGGED gone)`, !/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(postDiveAgain))
    const runKeyAfter = await findText(winPage, /RUN THE LINE/)
    ok(`${viewportName} post-DIVE-AGAIN: reached planning (RUN THE LINE visible)`, !!runKeyAfter, JSON.stringify(runKeyAfter))
    await winPage.screenshot({ path: `${OUT}/${viewportName}-after-dive-again.png` })
    ok(`${viewportName} console errors after WIN+DIVE-AGAIN cycle = 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0,5)))
    await winPage.close()
  }

  // ---- BUST journey ---- (same single-reused-page pattern, see WIN journey comment)
  let bustPage = await freshPage(viewport)
  let bustSettled = null
  for (let a = 0; a < 12 && !bustSettled; a++) {
    if (a > 0) {
      await bustPage.evaluate(() => { try { window.localStorage.clear() } catch {} })
      await bustPage.reload({ waitUntil: 'load' })
      await bustPage.bringToFront()
      await wait(400)
    }
    const t = await runToSettle(bustPage, 'HADAL', line8, !!viewport.hasTouch)
    if (t && /RUGGED BY THE DEEP/i.test(t)) { bustSettled = t; break }
  }
  ok(`${viewportName} BUST settle reachable`, !!bustSettled)
  if (!bustSettled) { await bustPage.close(); bustPage = null }
  if (bustPage) {
    await bustPage.screenshot({ path: `${OUT}/${viewportName}-bust-settled.png` })
    const m = await measureReceipt(bustPage)
    ok(`${viewportName} BUST headline renders (RUGGED BY THE DEEP)`, /RUGGED BY THE DEEP/i.test(m.headlineText || ''), m.headlineText)
    ok(`${viewportName} BUST PAYOUT value renders`, !!m.payoutValueText, m.payoutValueText)
    ok(`${viewportName} BUST WRECK RECKONING line renders`, /WRECK RECKONING/i.test(m.wreckText || ''), m.wreckText)
    ok(`${viewportName} BUST seed text renders`, !!m.seedText && m.seedText.length > 10, (m.seedText||'').slice(0,40))
    ok(`${viewportName} BUST hash text renders`, !!m.hashText && m.hashText.length > 10, (m.hashText||'').slice(0,40))
    ok(`${viewportName} BUST round text renders`, !!m.roundText, m.roundText)
    ok(`${viewportName} BUST verify-seal (HallmarkSeal) present`, m.sealPresent)
    ok(`${viewportName} BUST both copy buttons present (count=2)`, m.copyBtnCount === 2, JSON.stringify(m.copyBtnLabels))
    ok(`${viewportName} BUST seal does not overlap PAYOUT`, m.overlaps.sealVsPayout === 0, `overlap=${m.overlaps.sealVsPayout}px2`)
    ok(`${viewportName} BUST seal does not overlap copy btn 1`, m.overlaps.sealVsCopy1 === 0, `overlap=${m.overlaps.sealVsCopy1}px2`)
    ok(`${viewportName} BUST seal does not overlap copy btn 2`, m.overlaps.sealVsCopy2 === 0, `overlap=${m.overlaps.sealVsCopy2}px2`)

    // copy affordance functional test
    await clickCopyButtonsAndVerify(bustPage, `${viewportName} BUST`)

    // restart path B: SAME LINE
    const t0 = Date.now()
    const sameLineHit = await clickText(bustPage, /SAME LINE/)
    await wait(300)
    const restartMs = Date.now() - t0
    const t = await bustPage.evaluate(() => document.body.innerText)
    ok(`${viewportName} SAME LINE restart fires (no dead CTA)`, !!sameLineHit, JSON.stringify(sameLineHit))
    ok(`${viewportName} post-SAME-LINE: no leftover receipt (SECURED/RUGGED gone)`, !/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t))
    const runKeyAfterSame = await findText(bustPage, /RUN THE LINE/)
    ok(`${viewportName} post-SAME-LINE: RUN THE LINE re-armed`, runKeyAfterSame && /^RUN THE LINE$/i.test(runKeyAfterSame.text.trim()), JSON.stringify(runKeyAfterSame))
    ok(`${viewportName} SAME LINE restart latency < 1500ms`, restartMs < 1500, `${restartMs}ms`)
    await bustPage.screenshot({ path: `${OUT}/${viewportName}-after-same-line.png` })
    ok(`${viewportName} console errors after BUST+SAME-LINE cycle = 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0,5)))
    await bustPage.close()
  }
}

await probeViewport('desktop-1440x900', { width: 1440, height: 900, deviceScaleFactor: 1 })
await probeViewport('mobile-pixel7-412x915', { width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true })

await browser.close()

console.log('\n=== SUMMARY ===')
console.log('PASS:', results.pass.length)
console.log('FAIL:', results.fail.length)
if (results.fail.length) {
  console.log('\nFAILURES:')
  results.fail.forEach(f => console.log(' -', f))
}
console.log('\nCONSOLE ERRORS TOTAL:', consoleErrors.length)
if (consoleErrors.length) console.log(consoleErrors.slice(0, 10))

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, consoleErrors }, null, 2))
