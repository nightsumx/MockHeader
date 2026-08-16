import { urlToFilter } from '../../src/dnr'
import { PAGE, asMatch, lookup, urlMatches, urlPages, type AxisCell } from './spaces'

export const URL_MATCH_ATOMS = {
  match: urlMatches,
  page: urlPages,
}

export type UrlMatchEffect = {
  filter: string
}

export function runUrlMatch(_input: unknown, cell: AxisCell): UrlMatchEffect {
  return { filter: urlToFilter(lookup(PAGE, cell.page, ''), asMatch(cell.match)) }
}

export function wantUrlMatch(cell: AxisCell): UrlMatchEffect {
  const url = lookup(PAGE, cell.page, '')
  try {
    const u = new URL(url)
    if (cell.match === 'exact') return { filter: u.href }
    if (cell.match === 'host') return { filter: `*://${u.hostname}/*` }
    if (cell.match === 'domain') {
      const parts = u.hostname.split('.')
      const root = parts.length <= 2 ? u.hostname : parts.slice(-2).join('.')
      return { filter: `*://*.${root}/*` }
    }
    if (cell.match === 'prefix') {
      const cut = u.href.indexOf('?')
      return { filter: (cut < 0 ? u.href : u.href.slice(0, cut)) + '*' }
    }
    return { filter: `*://${u.hostname}/*` }
  }
  catch {
    return { filter: url }
  }
}
