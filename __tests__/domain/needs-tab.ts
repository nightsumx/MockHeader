import { values } from 'plena'
import { needsTabCtx } from '../../src/dnr'
import type { Prefs } from '../../src/types'
import { TOKEN, asKind, flags, filterKindsOrNone, lookup, surfaces, tabKinds, tokens, type AxisCell } from './spaces'

export const NEEDS_TAB_ATOMS = {
  kind: filterKindsOrNone,
  token: tokens,
  surface: surfaces,
  profileOn: flags,
  filterOn: flags,
}

export type NeedsTabEffect = {
  needs: boolean
}

function prefsOf(cell: AxisCell): Prefs {
  const token = lookup(TOKEN, cell.token, '1')
  const filterOn = cell.filterOn === 'on' && cell.kind !== 'none'
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
      enabled: cell.profileOn === 'on',
      request: cell.surface === 'header'
        ? [{ id: 'h1', enabled: true, name: 'A', value: token, op: 'set', comment: '' }]
        : [],
      response: [],
      filters: cell.kind === 'none'
        ? []
        : [{
            id: 'f1',
            enabled: filterOn,
            kind: asKind(cell.kind),
            match: 'wildcard',
            value: cell.kind === 'time' ? '09:00-18:00' : 'current',
          }],
      redirects: cell.surface === 'redirect'
        ? [{ id: 'r1', enabled: true, from: 'https://a.test/', to: token, regex: false }]
        : [],
    }],
  }
}

export function runNeedsTab(_input: unknown, cell: AxisCell): NeedsTabEffect {
  return { needs: needsTabCtx(prefsOf(cell)) }
}

export function wantNeedsTab(cell: AxisCell): NeedsTabEffect {
  if (cell.profileOn !== 'on') return { needs: false }
  const tab = cell.filterOn === 'on' && values(tabKinds).some(k => k === cell.kind)
  const urlTok = cell.token === 'url'
  return { needs: tab || urlTok }
}
