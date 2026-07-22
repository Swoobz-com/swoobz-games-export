// Minimal PNG decoder (RGBA/RGB, non-interlaced) using only node:zlib, just
// enough to sample arbitrary pixel coordinates from a puppeteer screenshot
// without adding a new npm dependency.
import fs from 'node:fs'
import zlib from 'node:zlib'

function readPng(filePath) {
  const buf = fs.readFileSync(filePath)
  let offset = 8 // skip signature
  let width, height, bitDepth, colorType
  const idatChunks = []
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    if (type === 'IHDR') {
      width = buf.readUInt32BE(dataStart)
      height = buf.readUInt32BE(dataStart + 4)
      bitDepth = buf.readUInt8(dataStart + 8)
      colorType = buf.readUInt8(dataStart + 9)
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(dataStart, dataStart + len))
    } else if (type === 'IEND') {
      break
    }
    offset = dataStart + len + 4 // skip CRC
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks))
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
  const bpp = channels * (bitDepth / 8)
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)
  let rawOffset = 0
  for (let y = 0; y < height; y++) {
    const filterType = raw[rawOffset]
    rawOffset += 1
    const rowStart = y * stride
    const prevRowStart = (y - 1) * stride
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rawOffset + x]
      const a = x >= bpp ? out[rowStart + x - bpp] : 0
      const b = y > 0 ? out[prevRowStart + x] : 0
      const c = y > 0 && x >= bpp ? out[prevRowStart + x - bpp] : 0
      let val
      switch (filterType) {
        case 0: val = rawByte; break
        case 1: val = rawByte + a; break
        case 2: val = rawByte + b; break
        case 3: val = rawByte + Math.floor((a + b) / 2); break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
          val = rawByte + pr
          break
        }
        default: val = rawByte
      }
      out[rowStart + x] = val & 0xff
    }
    rawOffset += stride
  }
  return { width, height, channels, data: out }
}

export function getPixel(png, x, y) {
  const idx = (y * png.width + x) * png.channels
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2]]
}

export function sampleGrid3x3(filePath, regionFn) {
  const png = readPng(filePath)
  const region = regionFn ? regionFn(png.width, png.height) : { x0: 0, y0: 0, x1: png.width, y1: png.height }
  const pts = []
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const x = Math.floor(region.x0 + (region.x1 - region.x0) * (0.15 + i * 0.35))
      const y = Math.floor(region.y0 + (region.y1 - region.y0) * (0.15 + j * 0.35))
      pts.push({ x, y, rgb: getPixel(png, x, y) })
    }
  }
  const luma = pts.map((p) => (p.rgb[0] + p.rgb[1] + p.rgb[2]) / 3)
  const mean = luma.reduce((a, b) => a + b, 0) / luma.length
  const variance = luma.reduce((a, v) => a + (v - mean) * (v - mean), 0) / luma.length
  return { pts, mean, variance, width: png.width, height: png.height }
}

export { readPng }
