import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:2},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});
await wait(3000);
const S='shots/';
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
// readout row: find text near "per tap starts"
async function rugReadout(){const t=await texts();const i=t.findIndex(x=>/per tap starts/i.test(x));if(i<0)return '(no rugs row)';return t.slice(Math.max(0,i-1),i+6).join(' ');}
async function hasRugsStepper(){const t=await texts();return t.some(x=>/per tap starts/i.test(x))||t.filter(x=>x==='RUGS').length>0;}
// click a stepper +/- located by y-band
async function clickStepperPlus(){const ok=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='+');const r=b.find(e=>{const q=e.getBoundingClientRect();return q.y>560&&q.y<680;});if(!r)return false;r.click();return true;});return ok;}
async function clickStepperMinus(){return await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].filter(e=>e.textContent.trim()==='−');const r=b.find(e=>{const q=e.getBoundingClientRect();return q.y>560&&q.y<680;});if(!r)return false;r.click();return true;});}

await clickText('ape in');await wait(1400);
console.log('BLUECHIPS default readout:', await rugReadout());
// step up rugs a bunch
for(let i=0;i<7;i++){const ok=await clickStepperPlus();await wait(250);console.log(`  +rug (${ok}):`, await rugReadout());}
await page.screenshot({path:S+'F4-bluechips-highrugs.png'});
// select SHITCOIN, check no stepper
await page.evaluate(()=>{const c=[...document.querySelectorAll('button')].find(e=>e.textContent.includes('SHITCOIN'));c&&c.click();});await wait(500);
console.log('SHITCOIN has RUGS stepper?', await hasRugsStepper(), '| readout:', await rugReadout());
await page.screenshot({path:S+'F4-shitcoin-nostepper.png'});
// select ALTSEASON, check stepper + range
await page.evaluate(()=>{const c=[...document.querySelectorAll('button')].find(e=>e.textContent.includes('ALTSEASON'));c&&c.click();});await wait(500);
console.log('ALTSEASON has RUGS stepper?', await hasRugsStepper(), '| readout:', await rugReadout());
// push altseason to max
for(let i=0;i<20;i++){await clickStepperPlus();await wait(120);}
console.log('ALTSEASON maxed readout:', await rugReadout());
for(let i=0;i<30;i++){await clickStepperMinus();await wait(80);}
console.log('ALTSEASON min readout:', await rugReadout());
await browser.close();console.log('DONE');
