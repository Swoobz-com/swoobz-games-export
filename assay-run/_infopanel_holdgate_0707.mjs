import { launch, wait } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const OUT = 'shots-infopanel-0707'
fs.mkdirSync(OUT, { recursive: true })

const INFO_SEL = 'button[aria-label="How to play · Abyss Line game info"]'
const DIALOG_SEL = '[role="dialog"][aria-labelledby="abyss-info-title"]'

async function dialogText(page) {
  return page.evaluate((sel) => {
    const d = document.querySelector(sel)
    return d ? d.innerText : null
  }, DIALOG_SEL)
}
async function dialogOpen(page) {
  return page.evaluate((sel) => !!document.querySelector(sel), DIALOG_SEL)
}
async function activeInfo(page) {
  // returns {isTrigger, isInsideDialog, label}
  return page.evaluate((infoSel, dlgSel) => {
    const a = document.activeElement
    if (!a) return { isTrigger: false, isInsideDialog: false, tag: null, label: null }
    const trigger = document.querySelector(infoSel)
    const dlg = document.querySelector(dlgSel)
    return {
      isTrigger: a === trigger,
      isInsideDialog: !!(dlg && dlg.contains(a)),
      tag: a.tagName,
      label: a.getAttribute('aria-label') || a.textContent?.trim()?.slice(0, 20) || null,
    }
  }, INFO_SEL, DIALOG_SEL)
}

async function checkOverlap(page) {
  // Ensure the fixed "?" pill and PLAY SAFE pill do not overlap.
  return page.evaluate((infoSel) => {
    const info = document.querySelector(infoSel)
    const safe = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'PLAY SAFE')
    if (!info || !safe) return { ok: false, reason: 'missing pill', info: !!info, safe: !!safe }
    const a = info.getBoundingClientRect()
    const b = safe.getBoundingClientRect()
    const overlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)
    return { ok: !overlap, info: { l: a.left, r: a.right, t: a.top }, safe: { l: b.left, r: b.right, t: b.top } }
  }, INFO_SEL)
}

async function run(viewport, tag) {
  const { browser, page, consoleErrors } = await launch(viewport)
  const res = { tag }

  // Chrome overlap check (both pills present, no overlap) at lobby.
  res.overlap = await checkOverlap(page)

  // --- Open via the "?" button (mouse) ---
  await page.click(INFO_SEL)
  await wait(350)
  res.openedByButton = await dialogOpen(page)
  const txt = await dialogText(page)
  res.dialogText = txt
  await page.screenshot({ path: `${OUT}/${tag}-open.png` })

  // dialog attributes
  res.attrs = await page.evaluate((sel) => {
    const d = document.querySelector(sel)
    if (!d) return null
    const titleEl = document.getElementById(d.getAttribute('aria-labelledby'))
    return {
      role: d.getAttribute('role'),
      ariaModal: d.getAttribute('aria-modal'),
      labelledby: d.getAttribute('aria-labelledby'),
      titleText: titleEl ? titleEl.textContent : null,
    }
  }, DIALOG_SEL)

  // focus moved into dialog on open?
  res.focusOnOpen = await activeInfo(page)

  // content assertions (tier-correct + fairness + rtp + loop + pace + haul)
  res.content = {
    reef: /REEF SHELF/.test(txt) && /8\.95x/.test(txt),
    midnight: /MIDNIGHT ZONE/.test(txt) && /19\.16x/.test(txt),
    hadal: /HADAL TRENCH/.test(txt) && /446\.12x/.test(txt),
    mines6: /6 mines/.test(txt),
    mines8: /8 mines/.test(txt),
    mines16: /16 mines/.test(txt),
    trailRange: /8/.test(txt) && /60 ducats|60/.test(txt),
    claimLine: /CLAIM LINE/.test(txt),
    runLine: /RUN THE LINE/.test(txt),
    seaMine: /sea-mine/.test(txt) && /busts/.test(txt),
    pace: /INSTANT/.test(txt) && /DUCAT-BY-DUCAT/.test(txt),
    haulToWin: /HAUL/.test(txt) && /TO WIN/.test(txt),
    fairness: /provably fair/i.test(txt) && /Glass Box/.test(txt) && /seed/.test(txt),
    rtp: /96\.5%/.test(txt),
    safety: /PLAY SAFE/.test(txt),
  }
  // em-dash in rendered dialog copy?
  res.emDashInCopy = /—/.test(txt)

  // --- Close via Esc, focus returns to trigger ---
  await page.keyboard.press('Escape')
  await wait(300)
  res.closedByEsc = !(await dialogOpen(page))
  res.focusAfterEsc = await activeInfo(page)

  // --- Keyboard-only: Tab to the trigger, Enter to open ---
  // reset focus to body, then tab until the info trigger is focused (bounded).
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await page.evaluate(() => document.body.focus?.())
  let reached = false
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const st = await activeInfo(page)
    if (st.isTrigger) { reached = true; break }
  }
  res.tabReachedTrigger = reached
  if (reached) {
    await page.keyboard.press('Enter')
    await wait(300)
    res.openedByKeyboard = await dialogOpen(page)
    await page.screenshot({ path: `${OUT}/${tag}-open-kbd.png` })
    // close via the CLOSE button using keyboard trap: Tab to a close then Enter,
    // but simplest deterministic: press Escape and confirm focus return.
    await page.keyboard.press('Escape')
    await wait(300)
    res.closedAfterKbd = !(await dialogOpen(page))
    res.focusReturnAfterKbd = await activeInfo(page)
  }

  // --- Reopen and close via the explicit bottom CLOSE button ---
  await page.click(INFO_SEL)
  await wait(250)
  const clickedClose = await page.evaluate((dlgSel) => {
    const d = document.querySelector(dlgSel)
    if (!d) return false
    const btn = [...d.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'CLOSE')
    if (!btn) return false
    btn.click()
    return true
  }, DIALOG_SEL)
  await wait(250)
  res.closeButtonWorks = clickedClose && !(await dialogOpen(page))
  res.focusAfterCloseBtn = await activeInfo(page)

  res.consoleErrors = consoleErrors
  await browser.close()
  return res
}

async function main() {
  const desktop = await run({ width: 1440, height: 900 }, 'desktop-1440')
  const mobile = await run({ width: 412, height: 915 }, 'mobile-412')
  console.log(JSON.stringify({ desktop, mobile }, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
