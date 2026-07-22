import { readPng } from './pngpix.mjs'
import zlib from 'node:zlib'
import fs from 'node:fs'
function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1))}return ~c>>>0}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const t=Buffer.from(type);const crcBuf=Buffer.alloc(4);crcBuf.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crcBuf])}
function writePng(path,w,h,rgba){
  const sig=Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
  const stride=w*4;const raw=Buffer.alloc(h*(stride+1))
  for(let y=0;y<h;y++){raw[y*(stride+1)]=0;rgba.copy(raw,y*(stride+1)+1,y*stride,y*stride+stride)}
  const idat=zlib.deflateSync(raw)
  fs.writeFileSync(path,Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]))
}
const [,,file,x0,y0,ww,hh,scale,out]=process.argv
const p=readPng(file);const X=+x0,Y=+y0,W=+ww,H=+hh,S=+scale
const rgba=Buffer.alloc(W*S*H*S*4)
for(let y=0;y<H*S;y++)for(let x=0;x<W*S;x++){
  const sx=X+Math.floor(x/S),sy=Y+Math.floor(y/S)
  const si=(sy*p.width+sx)*p.channels
  const di=(y*W*S+x)*4
  rgba[di]=p.data[si];rgba[di+1]=p.data[si+1];rgba[di+2]=p.data[si+2];rgba[di+3]=255
}
writePng(out,W*S,H*S,rgba)
console.log('wrote',out,W*S,'x',H*S)
