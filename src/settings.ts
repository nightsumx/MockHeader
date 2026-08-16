import { LANGS, type LangPref } from './i18n'
import { FILTER_KINDS, HEADER_OPS, THEMES, URL_MATCHES, type Filter, type FilterKind, type HeaderOp, type HeaderRule, type Prefs, type Profile, type Redirect, type Theme, type UrlMatch } from './types'

export function nid(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 10)
}

export function emptyRule(): HeaderRule {
  return { id: nid('h'), enabled: true, name: '', value: '', op: 'set', comment: '' }
}

export function emptyFilter(kind: FilterKind = 'url'): Filter {
  const value = kind === 'tab' || kind === 'tabGroup' || kind === 'window'
    ? 'current'
    : kind === 'time' ? '09:00-18:00' : ''
  return { id: nid('f'), enabled: true, kind, match: 'wildcard', value }
}

export function emptyRedirect(): Redirect {
  return { id: nid('r'), enabled: true, from: '', to: '', regex: false }
}

export function emptyProfile(name = 'Profile 1'): Profile {
  return { id: nid('p'), name, enabled: true, request: [], response: [], filters: [], redirects: [] }
}

export function defaultPrefs(): Prefs {
  const p = emptyProfile('Profile 1')
  return { theme: 'system', lang: 'system', on: true, activeId: p.id, profiles: [p], extraNames: [], extraValues: [] }
}

function rec(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function themeOf(v: unknown): Theme {
  for (const t of THEMES) if (t === v) return t
  return 'system'
}

function langOf(v: unknown): LangPref {
  for (const l of LANGS) if (l === v) return l
  return 'system'
}

function opOf(v: unknown): HeaderOp {
  for (const op of HEADER_OPS) if (op === v) return op
  return 'set'
}

function kindOf(v: unknown): FilterKind {
  for (const k of FILTER_KINDS) if (k === v) return k
  return 'url'
}

function matchOf(v: unknown): UrlMatch {
  for (const m of URL_MATCHES) if (m === v) return m
  return 'wildcard'
}

function mapRule(v: unknown, i: number): HeaderRule {
  const o = rec(v)
  if (!o) return { ...emptyRule(), id: `h${i}` }
  const id = str(o.id, '')
  return {
    id: id !== '' ? id : `h${i}`,
    enabled: bool(o.enabled, true),
    name: str(o.name, ''),
    value: str(o.value, ''),
    op: opOf(o.op),
    comment: str(o.comment, ''),
  }
}

function mapFilter(v: unknown, i: number): Filter {
  const o = rec(v)
  if (!o) return { ...emptyFilter(), id: `f${i}` }
  const id = str(o.id, '')
  return {
    id: id !== '' ? id : `f${i}`,
    enabled: bool(o.enabled, true),
    kind: kindOf(o.kind),
    match: matchOf(o.match),
    value: str(o.value, ''),
  }
}

function mapRedirect(v: unknown, i: number): Redirect {
  const o = rec(v)
  if (!o) return { ...emptyRedirect(), id: `r${i}` }
  const id = str(o.id, '')
  return {
    id: id !== '' ? id : `r${i}`,
    enabled: bool(o.enabled, true),
    from: str(o.from, ''),
    to: str(o.to, ''),
    regex: bool(o.regex, false),
  }
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter(x => typeof x === 'string' && x.trim() !== '')
}

function mapProfile(v: unknown, i: number): Profile {
  const o = rec(v)
  const seed = emptyProfile(`Profile ${i + 1}`)
  if (!o) return { ...seed, id: `p${i}` }
  const id = str(o.id, '')
  const request = Array.isArray(o.request) ? o.request.map(mapRule) : []
  const response = Array.isArray(o.response) ? o.response.map(mapRule) : []
  const filters = Array.isArray(o.filters) ? o.filters.map(mapFilter) : []
  const redirects = Array.isArray(o.redirects) ? o.redirects.map(mapRedirect) : []
  const legacy = str(o.urlFilter, '')
  if (legacy !== '' && !filters.some(f => f.kind === 'url')) {
    filters.push({ id: `furl${i}`, enabled: true, kind: 'url', match: 'wildcard', value: legacy })
  }
  return {
    id: id !== '' ? id : `p${i}`,
    name: str(o.name, seed.name),
    enabled: bool(o.enabled, true),
    request,
    response,
    filters,
    redirects,
  }
}

export function decodePrefs(raw: unknown): Prefs {
  const d = defaultPrefs()
  const o = rec(raw)
  if (!o) return d
  const listed = Array.isArray(o.profiles) ? o.profiles : null
  const profiles = listed && listed.length > 0
    ? listed.map(mapProfile)
    : d.profiles
  const aid = str(o.activeId, d.activeId)
  const activeId = profiles.some(p => p.id === aid)
    ? aid
    : (profiles[0]?.id ?? d.activeId)
  return {
    theme: themeOf(o.theme),
    lang: langOf(o.lang),
    on: bool(o.on, true),
    activeId,
    profiles,
    extraNames: strList(o.extraNames),
    extraValues: strList(o.extraValues),
  }
}

export function resolveTheme(pref: Theme, darkMq = false): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref
  return darkMq ? 'dark' : 'light'
}

export function activeProfile(prefs: Prefs): Profile {
  return prefs.profiles.find(p => p.id === prefs.activeId) ?? prefs.profiles[0] ?? emptyProfile('Profile 1')
}

export function patchProfile(prefs: Prefs, id: string, patch: Partial<Profile>): Prefs {
  return {
    ...prefs,
    profiles: prefs.profiles.map(p => p.id === id ? { ...p, ...patch } : p),
  }
}

export function cloneProfile(p: Profile): Profile {
  const id = nid('p')
  return {
    ...p,
    id,
    name: p.name + ' copy',
    request: p.request.map(h => ({ ...h, id: nid('h') })),
    response: p.response.map(h => ({ ...h, id: nid('h') })),
    filters: p.filters.map(f => ({ ...f, id: nid('f') })),
    redirects: p.redirects.map(r => ({ ...r, id: nid('r') })),
  }
}

export function liveHeaderCount(prefs: Prefs): number {
  if (!prefs.on) return 0
  let n = 0
  for (const p of prefs.profiles) {
    if (!p.enabled) continue
    for (const h of p.request) if (h.enabled && h.name.trim() !== '') n++
    for (const h of p.response) if (h.enabled && h.name.trim() !== '') n++
    for (const r of p.redirects) if (r.enabled && r.from.trim() !== '' && r.to.trim() !== '') n++
  }
  return n
}
