import type { Prefs } from '../../src/types'
import { compileRules } from '../../src/dnr'
import { CTX, NAME, VALUE, asOp, expandOracle, flags, headerOps, lookup, nameShapes, valueShapes, type AxisCell } from './spaces'

export const COMPILE_HEADER_ATOMS = {
  op: headerOps,
  name: nameShapes,
  value: valueShapes,
  enabled: flags,
  prefsOn: flags,
  profileOn: flags,
}

export function compileHeaderLegal(cell: AxisCell) {
  const gatesLive = cell.prefsOn === 'on' && cell.profileOn === 'on' && cell.enabled === 'on'
  const defaultHeader = cell.op === 'set' && cell.name === 'live' && cell.value === 'plain'
  if (!gatesLive && !defaultHeader) return { ok: false as const, reason: 'gate only on default header' }
  return { ok: true as const }
}

export type CompileHeaderEffect = {
  bucket: 'none' | 'persist' | 'session'
  headers: { header: string, operation: string, value?: string }[]
}

function prefsOf(cell: AxisCell): Prefs {
  const name = lookup(NAME, cell.name, '')
  const value = lookup(VALUE, cell.value, '1')
  return {
    theme: 'system',
    lang: 'system',
    on: cell.prefsOn === 'on',
    activeId: 'a',
    extraNames: [],
    extraValues: [],
    profiles: [{
      id: 'a',
      name: 'P',
      enabled: cell.profileOn === 'on',
      request: [{
        id: 'h1',
        enabled: cell.enabled === 'on',
        name,
        value,
        op: asOp(cell.op),
        comment: '',
      }],
      response: [],
      filters: [],
      redirects: [],
    }],
  }
}

export function runCompileHeader(_input: unknown, cell: AxisCell): CompileHeaderEffect {
  const { persist, session } = compileRules(prefsOf(cell), CTX)
  const bucket = persist.length > 0 ? 'persist' as const : session.length > 0 ? 'session' as const : 'none' as const
  const rule = persist[0] ?? session[0]
  const act = rule?.action
  const headers = act && act.type === 'modifyHeaders' ? (act.requestHeaders ?? []) : []
  return { bucket, headers }
}

export function wantCompileHeader(cell: AxisCell): CompileHeaderEffect {
  const live = cell.prefsOn === 'on' && cell.profileOn === 'on' && cell.enabled === 'on'
  const name = lookup(NAME, cell.name, '').trim()
  if (!live || name === '') return { bucket: 'none', headers: [] }
  if (cell.op === 'remove') return { bucket: 'persist', headers: [{ header: name, operation: 'remove' }] }
  const raw = lookup(VALUE, cell.value, '1')
  const value = expandOracle(raw, CTX)
  const operation = raw.includes('{{existing_value}}') ? 'append' : String(cell.op)
  return { bucket: 'persist', headers: [{ header: name, operation, value }] }
}
