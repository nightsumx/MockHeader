import { decodePrefs } from './settings'
import type { Prefs } from './types'

const PREFIX = 'hdr1.'

function toB64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromB64(s: string): string {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function encodeShare(prefs: Prefs): string {
  return PREFIX + toB64(JSON.stringify(prefs))
}

function fileName(name: string): string {
  const raw = name.trim() === '' ? 'headers' : name
  let out = ''
  for (const ch of raw) {
    const ok = (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '-' || ch === '_' || ch === ' '
    out += ok ? ch : '_'
  }
  return out + '.json'
}

export function downloadPrefs(prefs: Prefs, name: string): void {
  const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName(name)
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function decodeShare(raw: string): Prefs | null {
  const s = raw.trim()
  if (!s.startsWith(PREFIX)) return null
  try {
    return decodePrefs(JSON.parse(fromB64(s.slice(PREFIX.length))))
  }
  catch {
    return null
  }
}
