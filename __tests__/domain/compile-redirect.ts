import { compileRules } from '../../src/dnr'
import type { Prefs } from '../../src/types'
import {
  CTX,
  REDIR_FROM,
  REDIR_TO,
  expandOracle,
  flags,
  lookup,
  redirectFroms,
  redirectModes,
  redirectTos,
  type AxisCell,
} from './spaces'

export const COMPILE_REDIRECT_ATOMS = {
  mode: redirectModes,
  from: redirectFroms,
  to: redirectTos,
  enabled: flags,
}

export type CompileRedirectEffect = {
  bucket: 'none' | 'persist' | 'session'
  type: 'redirect' | null
  url: string | null
  regexSubstitution: string | null
  urlFilter: string | null
  regexFilter: string | null
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
      request: [],
      response: [],
      filters: [],
      redirects: [{
        id: 'r1',
        enabled: cell.enabled === 'on',
        from: lookup(REDIR_FROM, cell.from, ''),
        to: lookup(REDIR_TO, cell.to, ''),
        regex: cell.mode === 'regex',
      }],
    }],
  }
}

export function runCompileRedirect(_input: unknown, cell: AxisCell): CompileRedirectEffect {
  const { persist, session } = compileRules(prefsOf(cell), CTX)
  const rule = persist[0] ?? session[0]
  const act = rule?.action
  if (!act || act.type !== 'redirect') {
    return { bucket: 'none', type: null, url: null, regexSubstitution: null, urlFilter: null, regexFilter: null }
  }
  return {
    bucket: persist.length > 0 ? 'persist' : 'session',
    type: 'redirect',
    url: act.redirect.url ?? null,
    regexSubstitution: act.redirect.regexSubstitution ?? null,
    urlFilter: rule?.condition.urlFilter ?? null,
    regexFilter: rule?.condition.regexFilter ?? null,
  }
}

export function wantCompileRedirect(cell: AxisCell): CompileRedirectEffect {
  const none: CompileRedirectEffect = {
    bucket: 'none',
    type: null,
    url: null,
    regexSubstitution: null,
    urlFilter: null,
    regexFilter: null,
  }
  const from = lookup(REDIR_FROM, cell.from, '')
  const to = lookup(REDIR_TO, cell.to, '')
  if (cell.enabled !== 'on' || from.trim() === '' || to.trim() === '') return none
  const expanded = expandOracle(to, CTX)
  if (cell.mode === 'regex') {
    return {
      bucket: 'persist',
      type: 'redirect',
      url: null,
      regexSubstitution: expanded,
      urlFilter: null,
      regexFilter: from.trim(),
    }
  }
  return {
    bucket: 'persist',
    type: 'redirect',
    url: expanded,
    regexSubstitution: null,
    urlFilter: from.trim(),
    regexFilter: null,
  }
}
