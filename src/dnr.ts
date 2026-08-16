import { expandValue, usesUrlToken, type ExpandCtx } from './expand'
import { tFor } from './i18n'
import { liveHeaderCount } from './settings'
import type { Filter, HeaderRule, Prefs, Profile, Redirect } from './types'

export const RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'other',
] as const

export type ResourceType = typeof RESOURCE_TYPES[number]

const CHUNK = 10

export type DnrHeader = {
  header: string
  operation: 'set' | 'append' | 'remove'
  value?: string
}

export type DnrCondition = {
  urlFilter?: string
  regexFilter?: string
  excludedRequestDomains?: string[]
  resourceTypes: ResourceType[]
  tabIds?: number[]
}

export type DnrRule = {
  id: number
  priority: number
  action:
    | { type: 'modifyHeaders'; requestHeaders?: DnrHeader[]; responseHeaders?: DnrHeader[] }
    | { type: 'redirect'; redirect: { url?: string; regexSubstitution?: string } }
  condition: DnrCondition
}

export type ApplyCtx = ExpandCtx & {
  tabId?: number
  windowTabIds: number[]
  groupTabIds: number[]
}

export function emptyCtx(): ApplyCtx {
  return { url: '', now: 0, uuid: '0', windowTabIds: [], groupTabIds: [] }
}

function parseHm(s: string): number {
  const t = s.trim()
  const c = t.indexOf(':')
  if (c < 0) return -1
  const h = Number(t.slice(0, c))
  const m = Number(t.slice(c + 1))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1
  return h * 60 + m
}

export function timeInRange(spec: string, now: number): boolean {
  const s = spec.trim()
  const dash = s.indexOf('-')
  if (dash < 0) return true
  const a = parseHm(s.slice(0, dash))
  const b = parseHm(s.slice(dash + 1))
  if (a < 0 || b < 0) return true
  const d = new Date(now)
  const cur = d.getHours() * 60 + d.getMinutes()
  if (a <= b) return cur >= a && cur <= b
  return cur >= a || cur <= b
}

export function profileInTime(filters: Filter[], now: number): boolean {
  const t = filters.find(f => f.enabled && f.kind === 'time')
  if (!t || t.value.trim() === '') return true
  return timeInRange(t.value, now)
}

function toHeader(h: HeaderRule, ctx: ExpandCtx): DnrHeader | null {
  const name = h.name.trim()
  if (!h.enabled || name === '') return null
  if (h.op === 'remove') return { header: name, operation: 'remove' }
  const value = expandValue(h.value, ctx)
  const op = h.value.includes('{{existing_value}}') ? 'append' : h.op
  return { header: name, operation: op, value }
}

function split<T>(xs: T[], n: number): T[][] {
  if (xs.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n))
  return out
}

function domainOf(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('*.')) s = s.slice(2)
  const proto = s.indexOf('://')
  if (proto >= 0) s = s.slice(proto + 3)
  const slash = s.indexOf('/')
  if (slash >= 0) s = s.slice(0, slash)
  if (s.startsWith('*.')) s = s.slice(2)
  return s
}

export function urlToFilter(url: string, match: Filter['match']): string {
  try {
    const u = new URL(url)
    if (match === 'exact') return u.href
    if (match === 'host') return `*://${u.hostname}/*`
    if (match === 'domain') {
      const parts = u.hostname.split('.')
      const root = parts.length <= 2 ? u.hostname : parts.slice(-2).join('.')
      return `*://*.${root}/*`
    }
    if (match === 'prefix') {
      const cut = u.href.indexOf('?')
      return (cut < 0 ? u.href : u.href.slice(0, cut)) + '*'
    }
    return `*://${u.hostname}/*`
  }
  catch {
    return url
  }
}

function urlCond(f: Filter): Pick<DnrCondition, 'urlFilter' | 'regexFilter'> {
  const v = f.value.trim()
  if (v === '') return {}
  if (f.match === 'regex') return { regexFilter: v }
  if (f.match === 'host') return { urlFilter: v.includes('://') ? v : `*://${v}/*` }
  if (f.match === 'domain') {
    const d = domainOf(v)
    return { urlFilter: d === '' ? v : `*://*.${d}/*` }
  }
  if (f.match === 'prefix') return { urlFilter: v.endsWith('*') ? v : `${v}*` }
  if (f.match === 'exact') return { urlFilter: v }
  return { urlFilter: v }
}

export type CondPack = {
  session: boolean
  cond: DnrCondition
}

export function compileConditions(filters: Filter[], ctx: ApplyCtx): CondPack[] {
  const live = filters.filter(f => f.enabled)
  const includes = live.filter(f => f.kind === 'url')
  const excludes = live.filter(f => f.kind === 'urlExclude').map(f => domainOf(f.value)).filter(d => d !== '')
  const resF = live.find(f => f.kind === 'resource')
  const tabF = live.find(f => f.kind === 'tab')
  const groupF = live.find(f => f.kind === 'tabGroup')
  const winF = live.find(f => f.kind === 'window')

  let resourceTypes: ResourceType[] = [...RESOURCE_TYPES]
  if (resF && resF.value.trim() !== '') {
    const picked = resF.value.split(',').map(s => s.trim()).filter(s => (RESOURCE_TYPES as readonly string[]).includes(s))
    if (picked.length > 0) resourceTypes = picked as ResourceType[]
  }

  let tabIds: number[] | undefined
  let session = false
  if (tabF) {
    session = true
    if (ctx.tabId != null) tabIds = [ctx.tabId]
  }
  else if (groupF) {
    session = true
    if (ctx.groupTabIds.length > 0) tabIds = [...ctx.groupTabIds]
  }
  else if (winF) {
    session = true
    if (ctx.windowTabIds.length > 0) tabIds = [...ctx.windowTabIds]
  }

  const base = {
    ...(excludes.length > 0 ? { excludedRequestDomains: excludes } : {}),
    resourceTypes,
    ...(tabIds && tabIds.length > 0 ? { tabIds } : {}),
  }

  if (includes.length === 0) return [{ session, cond: base }]
  return includes.map(f => ({ session, cond: { ...base, ...urlCond(f) } }))
}

function headerChunks(p: Profile, ctx: ExpandCtx) {
  const req = p.request.map(h => toHeader(h, ctx)).filter(h => h !== null)
  const res = p.response.map(h => toHeader(h, ctx)).filter(h => h !== null)
  return { reqs: split(req, CHUNK), ress: split(res, CHUNK) }
}

export function compileRules(prefs: Prefs, ctx: ApplyCtx = emptyCtx()): { persist: DnrRule[]; session: DnrRule[] } {
  const persist: DnrRule[] = []
  const session: DnrRule[] = []
  if (!prefs.on) return { persist, session }
  let id = 1
  const push = (sessioned: boolean, rule: DnrRule) => {
    if (sessioned) session.push(rule)
    else persist.push(rule)
  }

  for (const p of prefs.profiles) {
    if (!p.enabled) continue
    if (!profileInTime(p.filters, ctx.now)) continue
    const packs = compileConditions(p.filters, ctx)
    const { reqs, ress } = headerChunks(p, ctx)
    const n = Math.max(reqs.length, ress.length, 0)
    if (n > 0) {
      for (const pack of packs) {
        for (let i = 0; i < n; i++) {
          const requestHeaders = reqs[i]
          const responseHeaders = ress[i]
          push(pack.session, {
            id: id++,
            priority: 1,
            action: {
              type: 'modifyHeaders',
              ...(requestHeaders && requestHeaders.length > 0 ? { requestHeaders } : {}),
              ...(responseHeaders && responseHeaders.length > 0 ? { responseHeaders } : {}),
            },
            condition: pack.cond,
          })
        }
      }
    }
    for (const r of p.redirects) {
      if (!r.enabled || r.from.trim() === '' || r.to.trim() === '') continue
      const to = expandValue(r.to, ctx)
      for (const pack of packs) {
        const cond = r.regex
          ? { ...pack.cond, regexFilter: r.from.trim(), urlFilter: undefined }
          : { ...pack.cond, urlFilter: r.from.trim(), regexFilter: undefined }
        push(pack.session, {
          id: id++,
          priority: 2,
          action: {
            type: 'redirect',
            redirect: r.regex ? { regexSubstitution: to } : { url: to },
          },
          condition: cond,
        })
      }
    }
  }
  return { persist, session }
}

export function needsTabCtx(prefs: Prefs): boolean {
  for (const p of prefs.profiles) {
    if (!p.enabled) continue
    for (const f of p.filters) {
      if (f.enabled && (f.kind === 'tab' || f.kind === 'tabGroup' || f.kind === 'window')) return true
    }
    for (const h of [...p.request, ...p.response]) {
      if (h.enabled && usesUrlToken(h.value)) return true
    }
    for (const r of p.redirects) {
      if (r.enabled && usesUrlToken(r.to)) return true
    }
  }
  return false
}

export async function paintBadge(prefs: Prefs): Promise<void> {
  const n = liveHeaderCount(prefs)
  await browser.action.setBadgeBackgroundColor({ color: '#3370ff' })
  try {
    await browser.action.setBadgeTextColor({ color: '#fff' })
  }
  catch {}
  if (!prefs.on) {
    await browser.action.setBadgeText({ text: 'off' })
    return
  }
  await browser.action.setBadgeText({ text: n > 0 ? String(n) : '' })
}

export async function applyPrefs(prefs: Prefs, ctx: ApplyCtx = emptyCtx()): Promise<string> {
  const { persist, session } = compileRules(prefs, ctx)
  try {
    const oldDyn = await browser.declarativeNetRequest.getDynamicRules()
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldDyn.map(r => r.id),
      addRules: persist,
    })
    if (browser.declarativeNetRequest.getSessionRules) {
      const oldSes = await browser.declarativeNetRequest.getSessionRules()
      await browser.declarativeNetRequest.updateSessionRules({
        removeRuleIds: oldSes.map(r => r.id),
        addRules: session,
      })
    }
    await paintBadge(prefs)
    return ''
  }
  catch (e) {
    await paintBadge(prefs)
    return e instanceof Error ? e.message : tFor(prefs.lang, 'rulesFailed')
  }
}
