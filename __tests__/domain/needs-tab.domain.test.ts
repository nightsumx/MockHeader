import { domain, fill } from 'plena'
import { NEEDS_TAB_ATOMS, runNeedsTab, wantNeedsTab } from './needs-tab'

fill(domain(NEEDS_TAB_ATOMS, {
  name: 'needs-tab',
  require: { kind: ['tab', 'none'], token: ['none', 'url', 'uuid'] },
  contract: ['needs'],
}), {
  run: runNeedsTab,
  want: wantNeedsTab,
})
