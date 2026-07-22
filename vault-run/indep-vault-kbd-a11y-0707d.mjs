// PART 4 -- isolated, clean tab-order count from a totally fresh page load,
// with per-press logging of exactly which element received focus (to
// resolve the "why did it take 4 presses" ambiguity from part 1 cleanly).
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/a11y0707';
const URL = 'http://localhost:5311/';
const log = (...a) => console.log(...a);
const R = {};

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  const cta = await page.$('[data-testid="vault-ctl-cta"]');
  if (cta) {
    await cta.click();
    await new Promise((r) => setTimeout(r, 900)); // let the phase transition + re-render fully settle
  }

  const dump = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      return { tag: a?.tagName, testid: a?.getAttribute?.('data-testid'), text: (a?.textContent || '').slice(0, 40) };
    });

  R.trace = [];
  R.trace.push({ press: 0, ...(await dump()) });
  for (let i = 1; i <= 8; i++) {
    await page.keyboard.press('Tab');
    await new Promise((r) => setTimeout(r, 60));
    const d = await dump();
    R.trace.push({ press: i, ...d });
    log(`Tab press #${i} -> `, JSON.stringify(d));
    if (d.testid === 'vault-grid-canvas') {
      R.pressesToReachGrid = i;
    }
  }

  // Continue tabbing past the grid to enumerate the rest of the sequence
  // and confirm we can leave + it doesn't loop back into 25 tile stops.
  for (let i = 9; i <= 14; i++) {
    await page.keyboard.press('Tab');
    await new Promise((r) => setTimeout(r, 60));
    const d = await dump();
    R.trace.push({ press: i, ...d });
    log(`Tab press #${i} -> `, JSON.stringify(d));
  }

  fs.writeFileSync(`${OUT}/results-part4-taborder.json`, JSON.stringify(R, null, 2));
  console.log('\n=== PART 4 RESULTS WRITTEN ===');
  await browser.close();
}
main().catch((e) => {
  console.error('DRIVER ERROR', e);
  process.exit(1);
});
