import sharp from 'sharp'
await sharp('shots-aztec-visreg-0704/desktop-1440x900-06-settled.png')
  .extract({ left: 300, top: 670, width: 560, height: 90 })
  .resize({ width: 1680 })
  .toFile('shots-aztec-visreg-0704/_crop-seal-desktop.png')
console.log('done')
