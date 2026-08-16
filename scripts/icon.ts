import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(publicDir, { recursive: true })

for (const size of [16, 32, 48, 96, 128]) {
  writeFileSync(join(publicDir, `icon-${size}.png`), pngMark(size))
}

function pngMark(size: number): Buffer {
  const pixels = Buffer.alloc(size * size * 4)
  const paper = [0xff, 0xff, 0xff, 0xff]
  const mark = [0x33, 0x70, 0xff, 0xff]
  for (let i = 0; i < size * size; i++) pixels.set(paper, i * 4)
  const x0 = Math.round(size * 0.22)
  const x1 = Math.round(size * 0.78)
  const h = Math.max(2, Math.round(size * 0.08))
  const ys = [0.28, 0.46, 0.64].map(t => Math.round(size * t))
  for (const y of ys) fill(pixels, size, x0, y, x1, y + h, mark)
  return encodePng(size, pixels)
}

function fill(px: Buffer, size: number, x0: number, y0: number, x1: number, y1: number, rgba: number[]) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      px.set(rgba, (y * size + x) * 4)
    }
  }
}

function encodePng(size: number, rgba: Buffer): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type: string, data: Buffer): Buffer {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcSrc = Buffer.concat([t, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcSrc) >>> 0)
  return Buffer.concat([len, t, data, crc])
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const b of buf) {
    c ^= b
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return c ^ 0xffffffff
}
