export type ExpandCtx = {
  url: string
  now: number
  uuid: string
}

function originOf(url: string): string {
  try {
    return new URL(url).origin
  }
  catch {
    return ''
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  }
  catch {
    return ''
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname
  }
  catch {
    return ''
  }
}

function tokenValue(key: string, ctx: ExpandCtx): string | null {
  if (key === 'uuid') return ctx.uuid
  if (key === 'timestamp') return String(ctx.now)
  if (key === 'url') return ctx.url
  if (key === 'url_origin') return originOf(ctx.url)
  if (key === 'url_hostname') return hostOf(ctx.url)
  if (key === 'url_path') return pathOf(ctx.url)
  if (key === 'existing_value') return ''
  if (key === 'ip_v4') return ''
  return null
}

export const DYNAMIC_KEYS = ['uuid', 'timestamp', 'url', 'url_origin', 'url_hostname', 'url_path', 'existing_value', 'ip_v4'] as const

export function expandValue(raw: string, ctx: ExpandCtx): string {
  let out = ''
  let i = 0
  while (i < raw.length) {
    const a = raw.indexOf('{{', i)
    if (a < 0) {
      out += raw.slice(i)
      break
    }
    out += raw.slice(i, a)
    const b = raw.indexOf('}}', a + 2)
    if (b < 0) {
      out += raw.slice(a)
      break
    }
    const key = raw.slice(a + 2, b).trim()
    const v = tokenValue(key, ctx)
    out += v === null ? raw.slice(a, b + 2) : v
    i = b + 2
  }
  return out
}

export function usesUrlToken(raw: string): boolean {
  return raw.includes('{{url')
}
