import { domainCatalog } from 'plena'
import { DOMAINS } from './catalog'

domainCatalog({
  dir: import.meta.dirname,
  domains: [...DOMAINS],
  expectLiveCount: 6,
  sharedModules: ['spaces', 'catalog'],
})
