import { domain, fill } from 'plena'
import { runUrlMatch, URL_MATCH_ATOMS, wantUrlMatch } from './url-match'

fill(domain(URL_MATCH_ATOMS, {
  name: 'url-match',
  require: { match: ['wildcard', 'regex', 'host', 'domain', 'prefix', 'exact'] },
  contract: ['filter'],
}), {
  run: runUrlMatch,
  want: wantUrlMatch,
})
