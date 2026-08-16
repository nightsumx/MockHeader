import { intersect, oneOf } from 'plena'
import { FILTER_KINDS, HEADER_OPS, URL_MATCHES, type FilterKind, type HeaderOp, type UrlMatch } from '../../src/types'

export type AxisCell = Record<string, string | number | boolean>

export function lookup<T>(map: Record<string, T>, key: unknown, fallback: T): T {
  const k = String(key)
  return Object.prototype.hasOwnProperty.call(map, k) ? map[k]! : fallback
}

export function asOp(v: unknown): HeaderOp {
  for (const op of HEADER_OPS) if (op === v) return op
  return 'set'
}

export function asKind(v: unknown): FilterKind {
  for (const k of FILTER_KINDS) if (k === v) return k
  return 'url'
}

export function asMatch(v: unknown): UrlMatch {
  for (const m of URL_MATCHES) if (m === v) return m
  return 'wildcard'
}

export const headerOps = oneOf(HEADER_OPS)
export const filterKinds = oneOf(FILTER_KINDS)
export const urlMatches = oneOf(URL_MATCHES)

export const flags = oneOf(['on', 'off'] as const)
export const nameShapes = oneOf(['live', 'blank', 'ws'] as const)
export const valueShapes = oneOf(['plain', 'uuid', 'existing'] as const)
export const urlShapes = oneOf(['host', 'full', 'proto-wild', 'empty'] as const)
export const resourceShapes = oneOf(['picked', 'empty', 'junk'] as const)
export const timeSpecs = oneOf(['day', 'overnight', 'bad', 'empty'] as const)
export const nowSlots = oneOf(['dawn', 'open', 'noon', 'close', 'late', 'night'] as const)
export const tokens = oneOf(['none', 'url', 'uuid'] as const)
export const surfaces = oneOf(['header', 'redirect'] as const)
export const redirectFroms = oneOf(['live', 'empty'] as const)
export const redirectTos = oneOf(['live', 'empty', 'uuid'] as const)
export const redirectModes = oneOf(['url', 'regex'] as const)
export const urlPages = oneOf(['valid', 'invalid', 'no-query', 'deep'] as const)

export const urlKinds = intersect(filterKinds, oneOf(['url', 'urlExclude'] as const))
export const tabKinds = intersect(filterKinds, oneOf(['tab', 'tabGroup', 'window'] as const))
export const filterKindsOrNone = oneOf([...FILTER_KINDS, 'none'] as const)

export const CTX = {
  url: 'https://api.shop.example.com/v1/x?q=1',
  now: new Date(2026, 0, 1, 12, 0).getTime(),
  uuid: 'abc',
  tabId: 9,
  windowTabIds: [9, 10],
  groupTabIds: [1, 2],
}

export const NAME = { live: 'X-Id', blank: '', ws: '  ' } as const
export const VALUE = { plain: '1', uuid: '{{uuid}}', existing: 'pre-{{existing_value}}' } as const
export const SHAPE = {
  host: 'a.test',
  full: 'https://api.shop.example.com/v1/x?q=1',
  'proto-wild': 'https://*.ads.example.com/foo',
  empty: '',
} as const
export const RESOURCE = {
  picked: 'xmlhttprequest,main_frame',
  empty: '',
  junk: 'not-a-type',
} as const
export const TIME = { day: '09:00-18:00', overnight: '22:00-06:00', bad: 'bad', empty: '' } as const
export const NOW = {
  dawn: new Date(2026, 0, 1, 6, 0).getTime(),
  open: new Date(2026, 0, 1, 9, 0).getTime(),
  noon: new Date(2026, 0, 1, 12, 0).getTime(),
  close: new Date(2026, 0, 1, 18, 0).getTime(),
  late: new Date(2026, 0, 1, 22, 0).getTime(),
  night: new Date(2026, 0, 1, 23, 0).getTime(),
} as const
export const TOKEN = { none: '1', url: 'pre-{{url_path}}', uuid: '{{uuid}}' } as const
export const REDIR_FROM = { live: 'https://a.test/(.*)', empty: '' } as const
export const REDIR_TO = { live: 'https://b.test/\\1', empty: '', uuid: 'https://b.test/{{uuid}}' } as const
export const PAGE = {
  valid: 'https://api.shop.example.com/v1/x?q=1',
  invalid: 'not a url',
  'no-query': 'https://api.shop.example.com/v1/x',
  deep: 'https://a.b.c.example.com/',
} as const

export function expandOracle(raw: string, ctx: { url: string, now: number, uuid: string }): string {
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
    out += tokenOracle(key, ctx) ?? raw.slice(a, b + 2)
    i = b + 2
  }
  return out
}

function tokenOracle(key: string, ctx: { url: string, now: number, uuid: string }): string | null {
  if (key === 'uuid') return ctx.uuid
  if (key === 'timestamp') return String(ctx.now)
  if (key === 'url') return ctx.url
  if (key === 'existing_value' || key === 'ip_v4') return ''
  if (key === 'url_origin' || key === 'url_hostname' || key === 'url_path') {
    try {
      const u = new URL(ctx.url)
      if (key === 'url_origin') return u.origin
      if (key === 'url_hostname') return u.hostname
      return u.pathname
    }
    catch {
      return ''
    }
  }
  return null
}
