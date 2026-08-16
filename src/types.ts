import type { LangPref } from './i18n'

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = typeof THEMES[number]
export type { LangPref }

export const HEADER_OPS = ['set', 'append', 'remove'] as const
export type HeaderOp = typeof HEADER_OPS[number]

export const FILTER_KINDS = ['url', 'urlExclude', 'tab', 'tabGroup', 'window', 'resource', 'time'] as const
export type FilterKind = typeof FILTER_KINDS[number]

export const URL_MATCHES = ['wildcard', 'regex', 'host', 'domain', 'prefix', 'exact'] as const
export type UrlMatch = typeof URL_MATCHES[number]

export type HeaderRule = {
  id: string
  enabled: boolean
  name: string
  value: string
  op: HeaderOp
  comment: string
}

export type Filter = {
  id: string
  enabled: boolean
  kind: FilterKind
  match: UrlMatch
  value: string
}

export type Redirect = {
  id: string
  enabled: boolean
  from: string
  to: string
  regex: boolean
}

export type Profile = {
  id: string
  name: string
  enabled: boolean
  request: HeaderRule[]
  response: HeaderRule[]
  filters: Filter[]
  redirects: Redirect[]
}

export type Prefs = {
  theme: Theme
  lang: LangPref
  on: boolean
  activeId: string
  profiles: Profile[]
  extraNames: string[]
  extraValues: string[]
}
