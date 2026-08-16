export type CookiePair = {
  name: string
  value: string
}

export type SetCookie = CookiePair & {
  domain: string
  path: string
  expires: string
  secure: boolean
  httpOnly: boolean
  sameSite: string
}

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

function kv(part: string): { k: string; v: string } {
  const t = part.trim()
  const i = t.indexOf('=')
  if (i < 0) return { k: t, v: '' }
  return { k: t.slice(0, i).trim(), v: t.slice(i + 1).trim() }
}

export function parseCookieReq(s: string): CookiePair[] {
  return splitSemi(s).map(kv).filter(p => p.k !== '').map(p => ({ name: p.k, value: p.v }))
}

export function formatCookieReq(xs: CookiePair[]): string {
  return xs.filter(p => p.name.trim() !== '').map(p => `${p.name.trim()}=${p.value}`).join('; ')
}

export function parseSetCookie(s: string): SetCookie {
  const parts = splitSemi(s).map(kv)
  const first = parts[0] ?? { k: '', v: '' }
  const out: SetCookie = {
    name: first.k,
    value: first.v,
    domain: '',
    path: '',
    expires: '',
    secure: false,
    httpOnly: false,
    sameSite: '',
  }
  for (const p of parts.slice(1)) {
    const k = p.k.toLowerCase()
    if (k === 'domain') out.domain = p.v
    else if (k === 'path') out.path = p.v
    else if (k === 'expires') out.expires = p.v
    else if (k === 'samesite') out.sameSite = p.v
    else if (k === 'secure') out.secure = true
    else if (k === 'httponly') out.httpOnly = true
  }
  return out
}

export function formatSetCookie(c: SetCookie): string {
  const bits = [`${c.name.trim()}=${c.value}`]
  if (c.domain.trim() !== '') bits.push(`Domain=${c.domain.trim()}`)
  if (c.path.trim() !== '') bits.push(`Path=${c.path.trim()}`)
  if (c.expires.trim() !== '') bits.push(`Expires=${c.expires.trim()}`)
  if (c.sameSite.trim() !== '') bits.push(`SameSite=${c.sameSite.trim()}`)
  if (c.secure) bits.push('Secure')
  if (c.httpOnly) bits.push('HttpOnly')
  return bits.join('; ')
}
