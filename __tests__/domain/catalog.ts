export const DOMAINS = [
  { id: 'compile-header', status: 'live' as const, contract: ['bucket', 'headers'] },
  { id: 'compile-filter', status: 'live' as const, contract: ['session', 'urlFilter', 'regexFilter', 'excluded', 'resources', 'tabIds'] },
  { id: 'compile-redirect', status: 'live' as const, contract: ['bucket', 'type', 'url', 'regexSubstitution', 'urlFilter', 'regexFilter'] },
  { id: 'time-range', status: 'live' as const, contract: ['inRange', 'profileOk', 'emits'] },
  { id: 'needs-tab', status: 'live' as const, contract: ['needs'] },
  { id: 'url-match', status: 'live' as const, contract: ['filter'] },
] as const
