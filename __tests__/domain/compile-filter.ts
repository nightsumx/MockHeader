import { values } from 'plena'
import { compileConditions, RESOURCE_TYPES } from '../../src/dnr'
import type { Filter } from '../../src/types'
import {
  CTX,
  RESOURCE,
  SHAPE,
  asKind,
  asMatch,
  flags,
  filterKinds,
  lookup,
  resourceShapes,
  tabKinds,
  type AxisCell,
  urlKinds,
  urlMatches,
  urlShapes,
} from './spaces'

export const COMPILE_FILTER_ATOMS = {
  kind: filterKinds,
  match: urlMatches,
  on: flags,
  shape: urlShapes,
  resource: resourceShapes,
}

export function compileFilterLegal(cell: AxisCell) {
  const url = values(urlKinds).some(k => k === cell.kind)
  if (!url && cell.match !== 'wildcard') return { ok: false as const, reason: 'match only for url' }
  if (!url && cell.shape !== 'host') return { ok: false as const, reason: 'url shape only for url' }
  if (cell.kind === 'urlExclude' && cell.match !== 'wildcard') return { ok: false as const, reason: 'exclude ignores match' }
  if (cell.kind !== 'resource' && cell.resource !== 'picked') return { ok: false as const, reason: 'resource shape only for resource' }
  return { ok: true as const }
}

export type CompileFilterEffect = {
  session: boolean
  urlFilter: string | null
  regexFilter: string | null
  excluded: string[]
  resources: 'all' | string[]
  tabIds: number[] | null
}

function filterOf(cell: AxisCell): Filter {
  const kind = asKind(cell.kind)
  const match = asMatch(cell.match)
  let value = ''
  if (kind === 'url' || kind === 'urlExclude') value = lookup(SHAPE, cell.shape, '')
  else if (kind === 'resource') value = lookup(RESOURCE, cell.resource, '')
  else if (kind === 'time') value = '09:00-18:00'
  else value = 'current'
  return { id: 'f1', enabled: cell.on === 'on', kind, match, value }
}

export function runCompileFilter(_input: unknown, cell: AxisCell): CompileFilterEffect {
  const packs = compileConditions([filterOf(cell)], CTX)
  const cond = packs[0]?.cond
  const types = cond?.resourceTypes ?? []
  const all = types.length === RESOURCE_TYPES.length && types.every((t, i) => t === RESOURCE_TYPES[i])
  return {
    session: packs[0]?.session ?? false,
    urlFilter: cond?.urlFilter ?? null,
    regexFilter: cond?.regexFilter ?? null,
    excluded: cond?.excludedRequestDomains ?? [],
    resources: all ? 'all' : [...types],
    tabIds: cond?.tabIds ?? null,
  }
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

function urlCond(match: string, raw: string): { urlFilter: string | null, regexFilter: string | null } {
  const v = raw.trim()
  if (v === '') return { urlFilter: null, regexFilter: null }
  if (match === 'regex') return { urlFilter: null, regexFilter: v }
  if (match === 'host') return { urlFilter: v.includes('://') ? v : `*://${v}/*`, regexFilter: null }
  if (match === 'domain') {
    const d = domainOf(v)
    return { urlFilter: d === '' ? v : `*://*.${d}/*`, regexFilter: null }
  }
  if (match === 'prefix') return { urlFilter: v.endsWith('*') ? v : `${v}*`, regexFilter: null }
  if (match === 'exact') return { urlFilter: v, regexFilter: null }
  return { urlFilter: v, regexFilter: null }
}

export function wantCompileFilter(cell: AxisCell): CompileFilterEffect {
  const empty: CompileFilterEffect = {
    session: false,
    urlFilter: null,
    regexFilter: null,
    excluded: [],
    resources: 'all',
    tabIds: null,
  }
  if (cell.on !== 'on') return empty
  if (cell.kind === 'url') return { ...empty, ...urlCond(String(cell.match), lookup(SHAPE, cell.shape, '')) }
  if (cell.kind === 'urlExclude') {
    const d = domainOf(lookup(SHAPE, cell.shape, ''))
    return { ...empty, excluded: d === '' ? [] : [d] }
  }
  if (cell.kind === 'resource') {
    if (cell.resource === 'picked') return { ...empty, resources: ['xmlhttprequest', 'main_frame'] }
    return empty
  }
  if (values(tabKinds).some(k => k === cell.kind)) {
    const tabIds = cell.kind === 'tab'
      ? [CTX.tabId]
      : cell.kind === 'tabGroup'
        ? [...CTX.groupTabIds]
        : [...CTX.windowTabIds]
    return { ...empty, session: true, tabIds }
  }
  return empty
}
