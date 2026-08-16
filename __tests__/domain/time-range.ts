import { compileRules, profileInTime, timeInRange } from '../../src/dnr'
import type { Filter, Prefs } from '../../src/types'
import { CTX, NOW, TIME, flags, lookup, nowSlots, timeSpecs, type AxisCell } from './spaces'

export const TIME_RANGE_ATOMS = {
  spec: timeSpecs,
  now: nowSlots,
  enabled: flags,
}

export type TimeRangeEffect = {
  inRange: boolean
  profileOk: boolean
  emits: boolean
}

function filtersOf(cell: AxisCell): Filter[] {
  return [{
    id: 't',
    enabled: cell.enabled === 'on',
    kind: 'time',
    match: 'wildcard',
    value: lookup(TIME, cell.spec, ''),
  }]
}

function prefsOf(cell: AxisCell): Prefs {
  return {
    theme: 'system',
    lang: 'system',
    on: true,
    activeId: 'a',
    extraNames: [],
    extraValues: [],
    profiles: [{
      id: 'a',
      name: 'P',
      enabled: true,
      request: [{ id: 'h1', enabled: true, name: 'A', value: '1', op: 'set', comment: '' }],
      response: [],
      filters: filtersOf(cell),
      redirects: [],
    }],
  }
}

export function runTimeRange(_input: unknown, cell: AxisCell): TimeRangeEffect {
  const filters = filtersOf(cell)
  const now = lookup(NOW, cell.now, CTX.now)
  const spec = filters[0]?.value ?? ''
  const { persist } = compileRules(prefsOf(cell), { ...CTX, now })
  return {
    inRange: timeInRange(spec, now),
    profileOk: profileInTime(filters, now),
    emits: persist.length > 0,
  }
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

function inRangeOracle(spec: string, now: number): boolean {
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

export function wantTimeRange(cell: AxisCell): TimeRangeEffect {
  const spec = lookup(TIME, cell.spec, '')
  const now = lookup(NOW, cell.now, CTX.now)
  const inRange = inRangeOracle(spec, now)
  const profileOk = cell.enabled !== 'on' || spec.trim() === '' || inRange
  return { inRange, profileOk, emits: profileOk }
}
