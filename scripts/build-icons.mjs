import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const root = join(import.meta.dirname, '..')
const svg = readFileSync(join(root, 'build/icon.svg'))
const png = (size) => sharp(svg, { density: Math.ceil((72 * size) / 256) * 2 }).resize(size, size).png().toBuffer()

writeFileSync(join(root, 'build/icon.png'), await png(512))
writeFileSync(join(root, 'build/icon.ico'), await pngToIco(await Promise.all([16, 24, 32, 48, 64, 128, 256].map(png))))
for (const size of [16, 32, 48, 128]) writeFileSync(join(root, `extension/icons/icon${size}.png`), await png(size))

console.log('icons written')
