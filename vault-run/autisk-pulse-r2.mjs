import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5332/'
const OUT='C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/pulse-run/shots-autisk'
fs.mkdirSync(OUT,{recursive:true})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const log=(...a)=>console.log(...a)
async function metrics(page,tag){
  return await page.evaluate((tag)=>{
    const r={tag}
    r.scrollW=document.documentElement.scrollWidth
    r.innerW=window.innerWidth
    r.hScroll=document.documentElement.scrollWidth>window.innerWidth
    r.innerH=window.innerHeight
    r.docH=document.documentElement.scrollHeight
    const ctas=[...document.querySelectorAll('.cta')].map(b=>{const rc=b.getBoundingClientRect();return{txt:(b.textContent||'').trim().slice(0,40),top:Math.round(rc.top),bottom:Math.round(rc.bottom),belowFold:rc.bottom>window.innerHeight+1}})
    r.ctas=ctas
    return r
  },tag)
}
async function owlRect(page){
  return await page.evaluate(()=>{
    const img=document.querySelector('.owl-in')
    const cp=document.querySelector('.count-pop')
    const chart=document.querySelector('svg')
    const out={}
    if(img){const r=img.getBoundingClientRect();out.owl={x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom)}}
    if(cp){const r=cp.getBoundingClientRect();out.count={cx:Math.round(r.x+r.width/2),y:Math.round(r.y),txt:(cp.textContent||'').trim()}}
    if(chart){const r=chart.closest('div').getBoundingClientRect();out.chartBox={x:Math.round(r.x),right:Math.round(r.right)}}
    return out
  })
}
async function run(){
  const browser=await puppeteer.launch({executablePath:CHROME,headless:true,args:['--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1']})
  for(const [W,H] of [[1440,900],[1920,1080]]){
    const page=await browser.newPage()
    await page.setViewport({width:W,height:H,deviceScaleFactor:1})
    await page.goto(URL,{waitUntil:'networkidle0'})
    await sleep(800)
    const tagWH=W+'x'+H
    await page.screenshot({path:OUT+'/r2-'+tagWH+'-01-bet.png'})
    log(tagWH,'bet',JSON.stringify(await metrics(page,'bet')))
    if(W===1440){
      const alpha=await page.evaluate(async()=>{
        async function probe(src){
          const img=new Image()
          await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=src})
          const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight
          const g=c.getContext('2d');g.drawImage(img,0,0)
          const d=g.getImageData(0,0,c.width,c.height).data
          let partial=0,opaque=0,transparent=0,rim=0,total=c.width*c.height
          for(let i=0;i<d.length;i+=4){
            const a=d[i+3],r=d[i],gg=d[i+1],b=d[i+2]
            if(a<20)transparent++;else if(a>230)opaque++;else partial++
            if(a>20&&a<230&&gg>r+15&&b>r+10)rim++
          }
          return{w:c.width,h:c.height,total,partial,opaque,transparent,rim,partialPct:(100*partial/total).toFixed(2),rimPct:(100*rim/total).toFixed(3)}
        }
        const urls=['/src/candle/assets/chairman-0.png','/src/candle/assets/chairman-1.png','/src/candle/assets/chairman-2.png']
        const res={}
        for(const u of urls){try{res[u]=await probe(u)}catch(e){res[u]='ERR '+e.message}}
        return res
      })
      log('CHAIRMAN ALPHA:',JSON.stringify(alpha,null,1))
      fs.writeFileSync(OUT+'/r2-chairman-alpha.json',JSON.stringify(alpha,null,1))
    }
    await page.evaluate(()=>{const chips=[...document.querySelectorAll('.chip')];const off=chips.find(c=>c.textContent.trim()==='OFF');if(off)off.click()})
    await page.evaluate(()=>{const b=[...document.querySelectorAll('.cta')].find(b=>/COMMIT/.test(b.textContent));if(b)b.click()})
    await sleep(1400)
    await page.screenshot({path:OUT+'/r2-'+tagWH+'-02-live.png'})
    log(tagWH,'live',JSON.stringify(await metrics(page,'live')))
    await sleep(6000)
    await page.screenshot({path:OUT+'/r2-'+tagWH+'-03-postlive.png'})
    log(tagWH,'postlive',JSON.stringify(await metrics(page,'postlive')))
    await page.reload({waitUntil:'networkidle0'});await sleep(500)
    await page.evaluate(()=>{const chips=[...document.querySelectorAll('.chip')];const t=chips.find(c=>c.textContent.trim()==='1.2x');if(t)t.click()})
    await page.evaluate(()=>{const b=[...document.querySelectorAll('.cta')].find(b=>/COMMIT/.test(b.textContent));if(b)b.click()})
    let cashedShot=false
    for(let i=0;i<40;i++){await sleep(200);const txt=await page.evaluate(()=>document.body.innerText);if(/CASHED|DODGED|WATCHING/.test(txt)&&!cashedShot){await page.screenshot({path:OUT+'/r2-'+tagWH+'-04-cashed.png'});log(tagWH,'cashed',JSON.stringify(await metrics(page,'cashed')));cashedShot=true;}if(/NEXT ROUND IN/.test(txt)){await page.screenshot({path:OUT+'/r2-'+tagWH+'-05-settled-cashed.png'});log(tagWH,'settled-cashed',JSON.stringify(await metrics(page,'settled-cashed')));break;}}
    await page.reload({waitUntil:'networkidle0'});await sleep(400)
    await page.evaluate(()=>{const chips=[...document.querySelectorAll('.chip')];const off=chips.find(c=>c.textContent.trim()==='OFF');if(off)off.click()})
    await page.evaluate(()=>{const b=[...document.querySelectorAll('.cta')].find(b=>/COMMIT/.test(b.textContent));if(b)b.click()})
    for(let i=0;i<50;i++){await sleep(200);const txt=await page.evaluate(()=>document.body.innerText);if(/RUGGED|CRASHED AT/.test(txt)){await page.screenshot({path:OUT+'/r2-'+tagWH+'-06-rugged.png'});log(tagWH,'rugged',JSON.stringify(await metrics(page,'rugged')));break;}}
    await page.reload({waitUntil:'networkidle0'});await sleep(400)
    await page.evaluate(()=>{const b=[...document.querySelectorAll('.fomc-test')].find(b=>/PUMP/.test(b.textContent));if(b)b.click()})
    let pumpHush=false,pumpRes=false
    for(let i=0;i<70;i++){await sleep(150);const st=await owlRect(page);const txt=await page.evaluate(()=>document.body.innerText);
      if(st.count&&/^[123]$/.test(st.count.txt)&&!pumpHush){await page.screenshot({path:OUT+'/r2-'+tagWH+'-07-pump-hush.png'});log(tagWH,'PUMP-hush',JSON.stringify(st));pumpHush=true;}
      if(/PUMP!/.test(txt)&&!pumpRes){await page.screenshot({path:OUT+'/r2-'+tagWH+'-08-pump-result.png'});log(tagWH,'PUMP-result',JSON.stringify(await owlRect(page)));pumpRes=true;}
      if(pumpHush&&pumpRes)break;}
    if(!pumpHush)log(tagWH,'PUMP hush NOT captured')
    await page.reload({waitUntil:'networkidle0'});await sleep(400)
    await page.evaluate(()=>{const b=[...document.querySelectorAll('.fomc-test')].find(b=>/DUMP/.test(b.textContent));if(b)b.click()})
    let dumpHush=false,dumpRes=false
    for(let i=0;i<70;i++){await sleep(150);const st=await owlRect(page);const txt=await page.evaluate(()=>document.body.innerText);
      if(st.count&&/^[123]$/.test(st.count.txt)&&!dumpHush){await page.screenshot({path:OUT+'/r2-'+tagWH+'-09-dump-hush.png'});log(tagWH,'DUMP-hush',JSON.stringify(st));dumpHush=true;}
      if(/DUMP!/.test(txt)&&!dumpRes){await page.screenshot({path:OUT+'/r2-'+tagWH+'-10-dump-result.png'});log(tagWH,'DUMP-result',JSON.stringify(await owlRect(page)));dumpRes=true;}
      if(dumpHush&&dumpRes)break;}
    if(!dumpHush)log(tagWH,'DUMP hush NOT captured')
    await page.reload({waitUntil:'networkidle0'});await sleep(400)
    await page.evaluate(()=>{const b=[...document.querySelectorAll('.fomc-test')].find(b=>/WICK/.test(b.textContent));if(b)b.click()})
    let wickShot=false
    for(let i=0;i<50;i++){await sleep(150);const txt=await page.evaluate(()=>document.body.innerText);if(/WICK SAVE/.test(txt)&&!wickShot){await page.screenshot({path:OUT+'/r2-'+tagWH+'-11-wick.png'});log(tagWH,'wick',JSON.stringify(await metrics(page,'wick')));wickShot=true;break;}}
    if(!wickShot)log(tagWH,'WICK NOT captured')
    await page.close()
  }
  await browser.close()
  log('DONE')
}
run().catch(e=>{console.error('FATAL',e);process.exit(1)})
