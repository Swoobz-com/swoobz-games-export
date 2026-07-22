// Part 5 — small gap-fillers: mobile Glass Box receipt structure (isolated,
// no BET-AGAIN click before it this time), desktop SEND IT commit CTA focus
// screenshot pair (more tab presses), and a WIN-outcome hero-overlay capture
// on mobile to confirm the settled-shrink overlap defect class generalizes.
import puppeteer from 'puppeteer-core';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import http from 'http';

const PORT = 5288;
const URL = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/a11y-fullresweep-0707';
const R = {};
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function waitForServer(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => { res.resume(); resolve(true); });
      req.on('error', () => { if (Date.now() - start > timeoutMs) reject(new Error('server not up')); else setTimeout(tryOnce, 300); });
    };
    tryOnce();
  });
}
async function clickByText(page, re, root = 'body') {
  return page.evaluate((reSrc, rootSel) => {
    const root = document.querySelector(rootSel) || document.body;
    const re = new RegExp(reSrc[0], reSrc[1]);
    const btns = Array.from(root.querySelectorAll('button'));
    const b = btns.find((n) => re.test((n.textContent || '').trim()));
    if (b) { b.click(); return true; }
    return false;
  }, [re.source, re.flags], root);
}

async function main() {
  const devProc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run',
    shell: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(URL, 30000);
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });

    // ---- Desktop: SEND IT focus screenshot pair, extended tab budget ----
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    await page.mouse.click(5, 5);
    let landedOnCommit = false;
    const trace = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const text = await page.evaluate(() => (document.activeElement?.textContent || '').trim().slice(0, 20));
      trace.push(text);
      if (/SEND IT/i.test(text)) { landedOnCommit = true; break; }
    }
    R.desktopCommitTrace = trace;
    R.landedOnCommitCta = landedOnCommit;
    log('[D] commit tab trace:', JSON.stringify(trace), 'landed:', landedOnCommit);
    if (landedOnCommit) {
      const rect = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      await page.screenshot({ path: `${OUT}/desktop-sendit-FOCUSED.png`, clip: { x: Math.max(0, rect.x - 8), y: Math.max(0, rect.y - 8), width: rect.w + 16, height: rect.h + 16 } });
      await page.evaluate(() => document.activeElement.blur());
      await sleep(150);
      await page.screenshot({ path: `${OUT}/desktop-sendit-UNFOCUSED.png`, clip: { x: Math.max(0, rect.x - 8), y: Math.max(0, rect.y - 8), width: rect.w + 16, height: rect.h + 16 } });
    }
    await page.close();

    // ---- Mobile: isolated receipt check + WIN hero-overlay capture ----
    const devices = [
      { name: 'Pixel7', width: 412, height: 915 },
    ];
    R.mobile = {};
    for (const dev of devices) {
      R.mobile[dev.name] = {};
      const mpage = await browser.newPage();
      await mpage.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

      // ---- receipt: reach settled, DO NOT click bet-again after ----
      await mpage.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(700);
      await clickByText(mpage, /SEND IT/i, '[data-testid="bet-console"]');
      await sleep(900);
      let settled = false;
      for (let t = 0; t < 12; t++) {
        const stillPlaying = await mpage.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
        if (!stillPlaying) break;
        const box = await mpage.evaluate(() => { const cv = document.querySelector('[data-testid="vault-grid-canvas"]'); const r = cv.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
        const col = t % 5, row = Math.floor(t / 5) % 5;
        await mpage.touchscreen.tap(box.x + box.w * ((col + 0.5) / 5), box.y + box.h * ((row + 0.5) / 5));
        await sleep(300);
      }
      const stillPlayingAfter = await mpage.evaluate(() => document.querySelector('[data-testid="vault-grid-canvas"]')?.getAttribute('role') === 'grid');
      if (stillPlayingAfter) {
        const info = await mpage.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find((n) => /take profit/i.test(n.textContent || ''));
          if (!b) return null;
          b.scrollIntoView({ block: 'center' });
          const r = b.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        if (info) { await mpage.touchscreen.tap(info.x, info.y); }
      }
      for (let p = 0; p < 25; p++) {
        const txt = await mpage.evaluate(() => document.body.innerText);
        if (/SETTLED\s*[·.]\s*(WIN|LOSS)/i.test(txt)) { settled = true; break; }
        await sleep(250);
      }
      R.mobile[dev.name].reachedSettled = settled;
      if (settled) {
        // WIN hero-overlay capture FIRST (before it auto-dismisses / before any other click)
        await mpage.evaluate(() => window.scrollTo(0, 0));
        const heroPresent = await mpage.evaluate(() => !!document.querySelector('[data-testid="vault-hero-overlay"]'));
        R.mobile[dev.name].heroOverlayPresentAtSettleDetect = heroPresent;
        if (heroPresent) {
          const shot = await mpage.screenshot({ fullPage: false });
          fs.writeFileSync(`${OUT}/mobile-${dev.name}-hero-overlay-settle.png`, shot);
        }
        const outcomeTxt = await mpage.evaluate(() => document.body.innerText.match(/SETTLED[^\n]*/)?.[0] || null);
        R.mobile[dev.name].outcomeAtHeroCapture = outcomeTxt;

        // NOW the receipt toggle (hero overlay auto-dismisses after 2s but the
        // settled panel + receipt toggle persist regardless)
        const toggled = await clickByText(mpage, /view receipt/i);
        await sleep(400);
        R.mobile[dev.name].receiptToggled = toggled;
        if (toggled) {
          const receiptInfoM = await mpage.evaluate(() => {
            const dl = document.querySelector('dl');
            if (!dl) return { found: false };
            const dts = Array.from(dl.querySelectorAll('dt')).map((d) => d.textContent);
            const dds = Array.from(dl.querySelectorAll('dd')).map((d) => (d.textContent || '').length);
            return { found: true, rowCount: dts.length, labels: dts, valueLengths: dds, hasMixerRow: dts.some((t) => /mixer/i.test(t || '')) };
          });
          R.mobile[dev.name].receiptInfo = receiptInfoM;
          log(`[M-${dev.name}] FIX7 (isolated) receipt:`, JSON.stringify(receiptInfoM));
          const shot = await mpage.screenshot({ fullPage: true });
          fs.writeFileSync(`${OUT}/mobile-${dev.name}-receipt-expanded-full.png`, shot);
        }
      }
      await mpage.close();
    }

    fs.writeFileSync(`${OUT}/results-part5.json`, JSON.stringify(R, null, 2));
    log('\n=== PART5 RESULTS WRITTEN ===');
  } finally {
    if (browser) await browser.close().catch(() => {});
    try { execSync(`taskkill /pid ${devProc.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { log('taskkill warn:', e.message); }
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
