export const LANGS = ['system', 'en', 'zh'] as const
export type LangPref = typeof LANGS[number]
export type Lang = 'en' | 'zh'

const EN = {
  off: 'Off',
  on: 'On',
  headerName: 'Header name',
  value: 'Value',
  remove: 'remove',
  move: 'Move',
  delete: 'Delete',
  more: 'More',
  set: 'Set',
  append: 'Append',
  removeOp: 'Remove',
  comment: 'Comment',
  cookie: 'Cookie',
  csp: 'CSP',
  pair: '+ pair',
  close: 'Close',
  directive: '+ directive',
  add: 'Add',
  sort: 'SORT',
  clear: 'CLEAR',
  sortBy: 'Sort: {by}',
  page: 'Page',
  host: 'Host',
  domain: 'Domain',
  regex: 'Regex',
  currentOnly: 'Current only',
  addFilter: '+ Filter',
  sidebar: 'Sidebar',
  search: 'Search',
  paused: '{name} (paused)',
  newProfile: 'New profile',
  import: 'Import',
  undo: 'Undo',
  redo: 'Redo',
  pause: 'Pause',
  resume: 'Resume',
  popOut: 'Pop out',
  clone: 'Clone',
  export: 'Export',
  copied: 'Copied',
  hideExtras: 'Hide extras',
  autocomplete: 'Autocomplete',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  extraPlaceholder: 'Extra header name, Enter to add',
  searchPlaceholder: 'Search',
  requestHeaders: 'Request headers',
  responseHeaders: 'Response headers',
  redirects: 'Redirects',
  filters: 'Filters',
  filterHint: 'Changes apply to all requests. Add a filter to limit by URL or tab.',
  importFailed: 'Import failed',
  kindUrl: 'Include',
  kindUrlExclude: 'Exclude',
  kindTab: 'This tab',
  kindTabGroup: 'Tab group',
  kindWindow: 'This window',
  kindResource: 'Type',
  kindTime: 'Time',
  addReq: 'Request header',
  addRes: 'Response header',
  addCookie: 'Cookie request',
  addSetCookie: 'Set-Cookie response',
  addCsp: 'Content security policy',
  addRedirect: 'Redirect URL',
  addTab: 'Tab filter',
  addTabGroup: 'Tab group filter',
  addWindow: 'Window filter',
  addUrl: 'URL filter',
  addUrlExclude: 'Exclude URL filter',
  addResource: 'Resource filter',
  addTime: 'Time filter',
  langAuto: 'Auto',
  langEn: 'English',
  langZh: '中文',
  rulesFailed: 'Rules not applied',
} as const

const ZH: Record<keyof typeof EN, string> = {
  off: '关闭',
  on: '开启',
  headerName: '请求头名',
  value: '值',
  remove: '删除',
  move: '移动',
  delete: '删除',
  more: '更多',
  set: '设',
  append: '加',
  removeOp: '删',
  comment: '注释',
  cookie: 'Cookie',
  csp: 'CSP',
  pair: '+ 一对',
  close: '收起',
  directive: '+ 指令',
  add: '添加',
  sort: '排序',
  clear: '清空',
  sortBy: '排序：{by}',
  page: '此页',
  host: '此站',
  domain: '此域',
  regex: '正则',
  currentOnly: '仅当前',
  addFilter: '+ 过滤',
  sidebar: '侧栏',
  search: '搜索',
  paused: '{name}（已停）',
  newProfile: '新配置',
  import: '导入',
  undo: '撤销',
  redo: '重做',
  pause: '暂停',
  resume: '继续',
  popOut: '弹出',
  clone: '克隆',
  export: '导出',
  copied: '已复制',
  hideExtras: '收起补全',
  autocomplete: '补全词',
  light: '浅色',
  dark: '深色',
  system: '系统',
  extraPlaceholder: '自定义头名，回车加入补全',
  searchPlaceholder: '搜索',
  requestHeaders: '请求头',
  responseHeaders: '响应头',
  redirects: '重定向',
  filters: '过滤',
  filterHint: '现在会改所有请求。加一条过滤，只动某些网址或标签页。',
  importFailed: '导入失败',
  kindUrl: '包含',
  kindUrlExclude: '排除',
  kindTab: '此标签',
  kindTabGroup: '此标签组',
  kindWindow: '此窗口',
  kindResource: '类型',
  kindTime: '时段',
  addReq: '请求头',
  addRes: '响应头',
  addCookie: 'Cookie 请求',
  addSetCookie: 'Set-Cookie 响应',
  addCsp: '内容安全策略',
  addRedirect: '重定向 URL',
  addTab: '标签页过滤',
  addTabGroup: '标签组过滤',
  addWindow: '窗口过滤',
  addUrl: 'URL 过滤',
  addUrlExclude: '排除 URL',
  addResource: '资源类型',
  addTime: '时段过滤',
  langAuto: '自动',
  langEn: 'English',
  langZh: '中文',
  rulesFailed: '规则未生效',
}

export type Msg = keyof typeof EN

const TABLE: Record<Lang, Record<Msg, string>> = { en: EN, zh: ZH }

let current: Lang = 'en'

export function detectLang(nav = ''): Lang {
  const s = nav.trim().toLowerCase()
  if (s === 'zh' || s.startsWith('zh-')) return 'zh'
  return 'en'
}

export function resolveLang(pref: LangPref, nav = typeof navigator === 'undefined' ? '' : navigator.language): Lang {
  if (pref === 'en' || pref === 'zh') return pref
  return detectLang(nav)
}

export function setLang(lang: Lang): void {
  current = lang
}

export function t(key: Msg, vars?: Record<string, string>): string {
  let s = TABLE[current][key] ?? EN[key]
  if (!vars) return s
  for (const k of Object.keys(vars)) {
    const token = '{' + k + '}'
    const i = s.indexOf(token)
    if (i >= 0) s = s.slice(0, i) + vars[k] + s.slice(i + token.length)
  }
  return s
}

export function tFor(pref: LangPref, key: Msg, nav?: string): string {
  const lang = resolveLang(pref, nav ?? (typeof navigator === 'undefined' ? '' : navigator.language))
  return TABLE[lang][key] ?? EN[key]
}
