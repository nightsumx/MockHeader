export const REQUEST_HEADERS = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Access-Control-Request-Headers',
  'Access-Control-Request-Method',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'DNT',
  'Expect',
  'Forwarded',
  'From',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'If-Range',
  'If-Unmodified-Since',
  'Origin',
  'Pragma',
  'Proxy-Authorization',
  'Range',
  'Referer',
  'TE',
  'Upgrade',
  'User-Agent',
  'Via',
  'Warning',
  'X-API-Key',
  'X-Auth-Token',
  'X-CSRF-Token',
  'X-Forwarded-For',
  'X-Forwarded-Host',
  'X-Forwarded-Proto',
  'X-Forwarded-Server',
  'X-Real-IP',
  'X-Request-ID',
  'X-Requested-With',
]

export const RESPONSE_HEADERS = [
  'Access-Control-Allow-Credentials',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Methods',
  'Access-Control-Allow-Origin',
  'Access-Control-Expose-Headers',
  'Access-Control-Max-Age',
  'Age',
  'Allow',
  'Cache-Control',
  'Content-Disposition',
  'Content-Encoding',
  'Content-Language',
  'Content-Length',
  'Content-Security-Policy',
  'Content-Type',
  'Date',
  'ETag',
  'Expires',
  'Last-Modified',
  'Location',
  'Permissions-Policy',
  'Pragma',
  'Referrer-Policy',
  'Server',
  'Set-Cookie',
  'Strict-Transport-Security',
  'Timing-Allow-Origin',
  'Transfer-Encoding',
  'Vary',
  'WWW-Authenticate',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'X-Powered-By',
  'X-Request-ID',
  'X-XSS-Protection',
]

export function mergeCatalog(base: readonly string[], extra: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const h of [...extra, ...base]) {
    const k = h.toLowerCase()
    if (seen.has(k) || h.trim() === '') continue
    seen.add(k)
    out.push(h)
  }
  return out
}

export function suggestHeaders(query: string, list: readonly string[]): string[] {
  const q = query.trim().toLowerCase()
  if (q === '') return []
  const hits = list.filter(h => h.toLowerCase().includes(q))
  hits.sort((a, b) => {
    const as = a.toLowerCase().startsWith(q)
    const bs = b.toLowerCase().startsWith(q)
    if (as !== bs) return as ? -1 : 1
    return a.localeCompare(b)
  })
  return hits.slice(0, 8)
}

export function markQuery(name: string, query: string): { t: string; on: boolean }[] {
  const q = query.trim()
  if (q === '') return [{ t: name, on: false }]
  const i = name.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return [{ t: name, on: false }]
  const parts = [
    { t: name.slice(0, i), on: false },
    { t: name.slice(i, i + q.length), on: true },
    { t: name.slice(i + q.length), on: false },
  ]
  return parts.filter(p => p.t !== '')
}
