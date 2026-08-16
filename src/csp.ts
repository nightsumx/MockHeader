export const CSP_DIRS = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'connect-src',
  'media-src',
  'object-src',
  'frame-src',
  'worker-src',
  'base-uri',
  'form-action',
  'frame-ancestors',
  'report-uri',
  'upgrade-insecure-requests',
] as const

export type CspDir = { dir: string; val: string }

function splitSemi(s: string): string[] {
  const out: string[] = []
  let cur = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ';') {
      out.push(cur)
      cur = ''
      continue
    }
    cur += s[i]
  }
  out.push(cur)
  return out
}

export function parseCsp(s: string): CspDir[] {
  const out: CspDir[] = []
  for (const part of splitSemi(s)) {
    const t = part.trim()
    if (t === '') continue
    const i = t.indexOf(' ')
    if (i < 0) out.push({ dir: t, val: '' })
    else out.push({ dir: t.slice(0, i), val: t.slice(i + 1).trim() })
  }
  return out
}

export function formatCsp(xs: CspDir[]): string {
  return xs
    .filter(x => x.dir.trim() !== '')
    .map(x => x.val.trim() === '' ? x.dir.trim() : `${x.dir.trim()} ${x.val.trim()}`)
    .join('; ')
}
