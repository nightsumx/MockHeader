import { REQUEST_HEADERS, RESPONSE_HEADERS, mergeCatalog, suggestHeaders } from '@/catalog'
import { formatCookieReq, formatSetCookie, parseCookieReq, parseSetCookie } from '@/cookie'
import { CSP_DIRS, formatCsp, parseCsp } from '@/csp'
import { applyPrefs } from '@/dnr'
import { urlToFilter } from '@/dnr'
import { DYNAMIC_KEYS } from '@/expand'
import { activeProfile, cloneProfile, decodePrefs, emptyFilter, emptyProfile, emptyRedirect, emptyRule, patchProfile, resolveTheme } from '@/settings'
import copy from 'clipboard-copy'
import { decodeShare, downloadPrefs, encodeShare } from '@/share'
import { loadPrefs, savePrefs } from '@/store'
import { resolveLang, setLang, t, type Msg } from '@/i18n'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { FILTER_KINDS, type Filter, type FilterKind, type HeaderRule, type Prefs, type Profile, type Theme } from '@/types'
import { VERSION } from '@/version'
import {
  ArrowDownUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  Filter as FilterIcon,
  Globe,
  ListPlus,
  Menu,
  Monitor,
  Moon,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Redo2,
  Search,
  Share2,
  SquarePlus,
  Sun,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useEffect, useRef, useState, type Ref } from 'react'

function applyTheme(theme: Theme) {
  const t = resolveTheme(theme, matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', t === 'dark')
  document.documentElement.classList.toggle('light', t === 'light')
  document.documentElement.setAttribute('data-theme', t)
  document.documentElement.style.background = t === 'dark' ? '#171717' : '#fff'
}

async function persist(next: Prefs) {
  applyTheme(next.theme)
  document.documentElement.lang = resolveLang(next.lang)
  await savePrefs(next)
}

const KIND_MSG: Record<FilterKind, Msg> = {
  url: 'kindUrl',
  urlExclude: 'kindUrlExclude',
  tab: 'kindTab',
  tabGroup: 'kindTabGroup',
  window: 'kindWindow',
  resource: 'kindResource',
  time: 'kindTime',
}
const ADD_MODS = [
  { id: 'req', label: 'addReq' },
  { id: 'res', label: 'addRes' },
  { id: 'cookie', label: 'addCookie' },
  { id: 'setcookie', label: 'addSetCookie' },
  { id: 'csp', label: 'addCsp' },
  { id: 'redirect', label: 'addRedirect' },
] as const

const ADD_FILTERS = [
  { id: 'tab', label: 'addTab' },
  { id: 'tabGroup', label: 'addTabGroup' },
  { id: 'window', label: 'addWindow' },
  { id: 'url', label: 'addUrl' },
  { id: 'urlExclude', label: 'addUrlExclude' },
  { id: 'resource', label: 'addResource' },
  { id: 'time', label: 'addTime' },
] as const
const RES_CHIPS = ['main_frame', 'xmlhttprequest', 'script', 'stylesheet', 'image', 'font', 'media', 'websocket'] as const

function text(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function Hit({
  title,
  onClick,
  className,
  children,
  disabled,
}: {
  title?: string
  onClick?: () => void
  className?: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} className={`hit ${className ?? ''}`}>
      {children}
    </button>
  )
}

function Tick({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Hit
      title={on ? t('off') : t('on')}
      className={`size-5 shrink-0 rounded-[3px] border-2 ${
        on ? 'border-[#2e7d32] bg-[#2e7d32] text-white' : 'border-[var(--line)] text-transparent'
      }`}
      onClick={() => onChange(!on)}
    >
      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.6">
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
    </Hit>
  )
}

function Combo({
  value,
  items,
  placeholder,
  inputRef,
  autoFocus,
  className,
  onChange,
  onPicked,
}: {
  value: string
  items: string[]
  placeholder: string
  inputRef?: Ref<HTMLInputElement>
  autoFocus?: boolean
  className?: string
  onChange: (s: string) => void
  onPicked?: (s: string) => void
}) {
  const [open, setOpen] = useState(false)
  const lock = useRef(false)
  const q = value.trim().toLowerCase()
  const rest = items.filter(h => h.toLowerCase() !== q)
  const show = open && rest.length > 0
  return (
    <Command>
      <CommandInput
        ref={inputRef}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        className={className}
        onValueChange={s => {
          onChange(s)
          if (lock.current) {
            lock.current = false
            return
          }
          setOpen(true)
        }}
        onFocus={() => { if (!lock.current) setOpen(true) }}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
          }
        }}
      />
      {show && (
        <CommandList onMouseDown={e => e.preventDefault()}>
          {rest.map(h => (
            <CommandItem
              key={h}
              value={h}
              onSelect={v => {
                const hit = items.find(x => x.toLowerCase() === v.toLowerCase()) ?? h
                lock.current = true
                onChange(hit)
                setOpen(false)
                onPicked?.(hit)
              }}
            >
              {h}
            </CommandItem>
          ))}
        </CommandList>
      )}
    </Command>
  )
}

function HeaderRow({
  row,
  focus,
  catalog,
  extras,
  canMove,
  onPatch,
  onRemove,
  onMove,
}: {
  row: HeaderRule
  focus: boolean
  catalog: string[]
  extras: string[]
  canMove: boolean
  onPatch: (p: Partial<HeaderRule>) => void
  onRemove: () => void
  onMove: () => void
}) {
  const [menu, setMenu] = useState(false)
  const [sheet, setSheet] = useState<'comment' | 'cookie' | 'csp' | ''>('')
  const valueRef = useRef<HTMLInputElement>(null)
  const low = text(row.name).trim().toLowerCase()
  const isCookie = low === 'cookie'
  const isSetCookie = low === 'set-cookie'
  const isCsp = low === 'content-security-policy'
  const nameHits = suggestHeaders(text(row.name), catalog)
  const valQ = text(row.value)
  const valHits = valQ.includes('{{')
    ? DYNAMIC_KEYS.filter(k => (`{{${k}}}`).includes(valQ) || k.includes(valQ.replaceAll('{', ''))).map(k => `{{${k}}}`)
    : suggestHeaders(valQ, extras)

  return (
    <div className="relative">
      <div className={`group grid h-9 grid-cols-[20px_minmax(0,1.1fr)_minmax(0,1fr)_28px_28px_28px] items-center gap-x-2 px-4 ${text(row.name).trim() === '' && text(row.value).trim() === '' ? 'opacity-55' : ''}`}>
        <Tick on={row.enabled} onChange={enabled => onPatch({ enabled })} />
        <Combo
          value={text(row.name)}
          items={nameHits}
          placeholder={t('headerName')}
          autoFocus={focus}
          onChange={name => onPatch({ name })}
          onPicked={() => valueRef.current?.focus()}
        />
        {row.op === 'remove'
          ? <span className="text-[13px] text-[var(--text-c)]">{t('remove')}</span>
          : (
              <Combo
                value={text(row.value)}
                items={valHits}
                placeholder={t('value')}
                inputRef={valueRef}
                className="text-[var(--text-b)]"
                onChange={value => onPatch({ value })}
              />
            )}
        <Hit title={t('move')} className="size-7 rounded-full text-[var(--text-b)]" disabled={!canMove} onClick={onMove}>
          <ArrowDownUp className="size-3.5" />
        </Hit>
        <Hit title={t('delete')} className="size-7 rounded-full text-[var(--danger)]" onClick={onRemove}>
          <Trash2 className="size-3.5" />
        </Hit>
        <Hit title={t('more')} className="size-7 rounded-full text-[var(--text-c)]" onClick={() => setMenu(v => !v)}>
          <MoreVertical className="size-4" />
        </Hit>
      </div>
      {row.comment !== '' && sheet !== 'comment' && (
        <p className="px-11 pb-1 text-[11px] text-[var(--text-c)]">{row.comment}</p>
      )}
      {menu && (
        <div className="absolute top-8 right-4 z-30 flex flex-col rounded-md bg-[var(--bg-page)] py-1 text-[12px] shadow-lg ring-1 ring-[var(--line)]">
          {(['set', 'append', 'remove'] as const).map(op => (
            <Hit key={op} className={`justify-start px-3 py-1.5 ${row.op === op ? 'text-[#1976d2]' : ''}`} onClick={() => { onPatch({ op }); setMenu(false) }}>
              {op === 'set' ? t('set') : op === 'append' ? t('append') : t('removeOp')}
            </Hit>
          ))}
          <Hit className="justify-start px-3 py-1.5" onClick={() => { setSheet('comment'); setMenu(false) }}>{t('comment')}</Hit>
          {(isCookie || isSetCookie) && <Hit className="justify-start px-3 py-1.5" onClick={() => { setSheet('cookie'); setMenu(false) }}>{t('cookie')}</Hit>}
          {isCsp && <Hit className="justify-start px-3 py-1.5" onClick={() => { setSheet('csp'); setMenu(false) }}>{t('csp')}</Hit>}
        </div>
      )}
      {sheet === 'comment' && (
        <div className="px-11 pb-2">
          <input
            autoFocus
            className="field h-7 w-full text-[12px] outline-none placeholder:text-[var(--text-c)]"
            placeholder={t('comment')}
            value={row.comment}
            onChange={e => onPatch({ comment: e.target.value })}
            onBlur={() => setSheet('')}
          />
        </div>
      )}
      {sheet === 'cookie' && isCookie && (
        <CookieReqSheet value={row.value} onChange={value => onPatch({ value })} onClose={() => setSheet('')} />
      )}
      {sheet === 'cookie' && isSetCookie && (
        <SetCookieSheet value={row.value} onChange={value => onPatch({ value })} onClose={() => setSheet('')} />
      )}
      {sheet === 'csp' && (
        <CspSheet value={row.value} onChange={value => onPatch({ value })} onClose={() => setSheet('')} />
      )}
    </div>
  )
}

function CookieReqSheet({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const xs = parseCookieReq(value)
  const rows = xs.length > 0 ? xs : [{ name: '', value: '' }]
  return (
    <div className="mx-4 mb-2 rounded-md bg-[var(--bg-side)] p-2">
      {rows.map((p, i) => (
        <div key={i} className="mb-1 flex gap-1">
          <input className="field h-7 flex-1 text-[12px] outline-none" placeholder="name" value={p.name} onChange={e => onChange(formatCookieReq(rows.map((x, j) => j === i ? { ...x, name: e.target.value } : x)))} />
          <input className="field h-7 flex-1 text-[12px] outline-none" placeholder="value" value={p.value} onChange={e => onChange(formatCookieReq(rows.map((x, j) => j === i ? { ...x, value: e.target.value } : x)))} />
        </div>
      ))}
      <div className="flex gap-2">
        <Hit className="rounded px-2 py-0.5 text-[11px] text-[#1976d2]" onClick={() => onChange(formatCookieReq([...rows, { name: '', value: '' }]))}>{t('pair')}</Hit>
        <Hit className="rounded px-2 py-0.5 text-[11px] text-[var(--text-c)]" onClick={onClose}>{t('close')}</Hit>
      </div>
    </div>
  )
}

function SetCookieSheet({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const c = parseSetCookie(value)
  const set = (p: Partial<typeof c>) => onChange(formatSetCookie({ ...c, ...p }))
  return (
    <div className="mx-4 mb-2 grid grid-cols-2 gap-1 rounded-md bg-[var(--bg-side)] p-2 text-[12px]">
      <input className="field h-7 outline-none" placeholder="name" value={c.name} onChange={e => set({ name: e.target.value })} />
      <input className="field h-7 outline-none" placeholder="value" value={c.value} onChange={e => set({ value: e.target.value })} />
      <input className="field h-7 outline-none" placeholder="Domain" value={c.domain} onChange={e => set({ domain: e.target.value })} />
      <input className="field h-7 outline-none" placeholder="Path" value={c.path} onChange={e => set({ path: e.target.value })} />
      <input className="field col-span-2 h-7 outline-none" placeholder="Expires" value={c.expires} onChange={e => set({ expires: e.target.value })} />
      <Hit className={`rounded px-2 py-1 ${c.secure ? 'text-[#1976d2]' : 'text-[var(--text-c)]'}`} onClick={() => set({ secure: !c.secure })}>Secure</Hit>
      <Hit className={`rounded px-2 py-1 ${c.httpOnly ? 'text-[#1976d2]' : 'text-[var(--text-c)]'}`} onClick={() => set({ httpOnly: !c.httpOnly })}>HttpOnly</Hit>
      <input className="field col-span-2 h-7 outline-none" placeholder="SameSite" value={c.sameSite} onChange={e => set({ sameSite: e.target.value })} />
      <Hit className="rounded px-2 py-0.5 text-[11px] text-[var(--text-c)]" onClick={onClose}>{t('close')}</Hit>
    </div>
  )
}

function CspSheet({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const xs = parseCsp(value)
  const rows = xs.length > 0 ? xs : [{ dir: 'default-src', val: "'self'" }]
  return (
    <div className="mx-4 mb-2 rounded-md bg-[var(--bg-side)] p-2">
      {rows.map((p, i) => (
        <div key={i} className="mb-1 flex gap-1">
          <select
            className="field h-7 text-[12px] outline-none"
            value={p.dir}
            onChange={e => onChange(formatCsp(rows.map((x, j) => j === i ? { ...x, dir: e.target.value } : x)))}
          >
            {CSP_DIRS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input className="field h-7 flex-1 text-[12px] outline-none" value={p.val} onChange={e => onChange(formatCsp(rows.map((x, j) => j === i ? { ...x, val: e.target.value } : x)))} />
        </div>
      ))}
      <div className="flex gap-2">
        <Hit className="rounded px-2 py-0.5 text-[11px] text-[#1976d2]" onClick={() => onChange(formatCsp([...rows, { dir: 'script-src', val: '' }]))}>{t('directive')}</Hit>
        <Hit className="rounded px-2 py-0.5 text-[11px] text-[var(--text-c)]" onClick={onClose}>{t('close')}</Hit>
      </div>
    </div>
  )
}

function HeaderBlock({
  title,
  rows,
  query,
  focusId,
  catalog,
  extras,
  onChange,
  onAdd,
}: {
  title: string
  rows: HeaderRule[]
  query: string
  focusId: string
  catalog: string[]
  extras: string[]
  onChange: (rows: HeaderRule[]) => void
  onAdd: () => void
}) {
  const [ghost, setGhost] = useState(emptyRule)
  const [by, setBy] = useState<'name' | 'value' | 'comment'>('name')
  const needGhost = rows.length === 0 || text(rows[rows.length - 1]!.name).trim() !== ''
  const shown = query === ''
    ? rows
    : rows.filter(h => text(h.name).toLowerCase().includes(query) || text(h.value).toLowerCase().includes(query) || text(h.comment).toLowerCase().includes(query))

  const move = (id: string) => {
    const i = rows.findIndex(h => h.id === id)
    if (i < 0 || rows.length < 2) return
    const j = i === rows.length - 1 ? i - 1 : i + 1
    const next = [...rows]
    const a = next[i]
    const b = next[j]
    if (!a || !b) return
    next[i] = b
    next[j] = a
    onChange(next)
  }

  return (
    <section>
      <div className="flex h-9 items-center gap-1 px-4">
        <Tick
          on={rows.length > 0 && rows.every(h => h.enabled)}
          onChange={v => onChange(rows.map(h => ({ ...h, enabled: v })))}
        />
        <p className="ml-2 flex-1 text-[13px] font-semibold">{title}</p>
        <Hit title={t('add')} className="h-7 gap-1 rounded-md px-2 text-[12px] font-medium text-[#1976d2]" onClick={onAdd}>
          <Plus className="size-3.5" />
          {t('add')}
        </Hit>
        <Hit
          title={t('sortBy', { by })}
          className="h-7 gap-1 rounded-md px-2 text-[12px] font-medium text-[#1976d2]"
          disabled={rows.length < 2}
          onClick={() => {
            const order = ['name', 'value', 'comment'] as const
            const nextBy = order[(order.indexOf(by) + 1) % 3] ?? 'name'
            setBy(nextBy)
            onChange([...rows].sort((a, b) => {
              const av = text(a[nextBy]).trim()
              const bv = text(b[nextBy]).trim()
              if (av === '') return 1
              if (bv === '') return -1
              return av.localeCompare(bv)
            }))
          }}
        >
          <ArrowDownUp className="size-3.5" />
          {t('sort')}
        </Hit>
        <Hit title={t('clear')} className="h-7 gap-1 rounded-md px-2 text-[12px] font-medium text-[var(--danger)]" disabled={rows.length === 0} onClick={() => onChange([])}>
          <Trash2 className="size-3.5" />
          {t('clear')}
        </Hit>
      </div>
      {shown.map(row => (
        <HeaderRow
          key={row.id}
          row={row}
          focus={row.id === focusId}
          catalog={catalog}
          extras={extras}
          canMove={rows.length > 1}
          onPatch={p => onChange(rows.map(h => h.id === row.id ? { ...h, ...p } : h))}
          onRemove={() => onChange(rows.filter(h => h.id !== row.id))}
          onMove={() => move(row.id)}
        />
      ))}
      {needGhost && query === '' && (
        <HeaderRow
          row={ghost}
          focus={ghost.id === focusId}
          catalog={catalog}
          extras={extras}
          canMove={false}
          onPatch={p => {
            onChange([...rows, { ...ghost, ...p }])
            setGhost(emptyRule())
          }}
          onRemove={() => {}}
          onMove={() => {}}
        />
      )}
    </section>
  )
}

function FilterList({
  filters,
  tabUrl,
  onChange,
}: {
  filters: Filter[]
  tabUrl: string
  onChange: (xs: Filter[]) => void
}) {
  return (
    <section>
      <div className="flex h-9 items-center px-4">
        <p className="flex-1 text-[13px] font-semibold">{t('filters')}</p>
        <Hit className="h-7 gap-1 rounded-md px-2 text-[12px] font-medium text-[#1976d2]" onClick={() => onChange([...filters, emptyFilter()])}>
          <Plus className="size-3.5" />
          {t('add')}
        </Hit>
      </div>
      <div className="px-4 py-2">
      {filters.map(f => (
        <div key={f.id} className="mb-1.5 flex flex-wrap items-center gap-1 rounded-md px-1">
          <Tick on={f.enabled} onChange={enabled => onChange(filters.map(x => x.id === f.id ? { ...x, enabled } : x))} />
          <select
            className="field h-7 text-[12px] outline-none"
            value={f.kind}
            onChange={e => {
              const kind = e.target.value as FilterKind
              onChange(filters.map(x => x.id === f.id ? { ...x, kind, value: kind === 'tab' || kind === 'tabGroup' || kind === 'window' ? 'current' : kind === 'time' ? '09:00-18:00' : '' } : x))
            }}
          >
            {FILTER_KINDS.map(k => <option key={k} value={k}>{t(KIND_MSG[k])}</option>)}
          </select>
          {f.kind === 'url' || f.kind === 'urlExclude'
            ? (
                <>
                  <input
                    className="field h-7 min-w-0 flex-1 font-mono text-[12px] outline-none"
                    placeholder={f.kind === 'urlExclude' ? 'ads.example.com' : '*://*.example.com/*'}
                    value={f.value}
                    onChange={e => onChange(filters.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))}
                  />
                  {f.kind === 'url' && tabUrl !== '' && (
                    <>
                      <Hit className="rounded px-1.5 py-0.5 text-[11px] text-[#1976d2]" onClick={() => onChange(filters.map(x => x.id === f.id ? { ...x, match: 'exact', value: urlToFilter(tabUrl, 'exact') } : x))}>{t('page')}</Hit>
                      <Hit className="rounded px-1.5 py-0.5 text-[11px] text-[#1976d2]" onClick={() => onChange(filters.map(x => x.id === f.id ? { ...x, match: 'host', value: urlToFilter(tabUrl, 'host') } : x))}>{t('host')}</Hit>
                      <Hit className="rounded px-1.5 py-0.5 text-[11px] text-[#1976d2]" onClick={() => onChange(filters.map(x => x.id === f.id ? { ...x, match: 'domain', value: urlToFilter(tabUrl, 'domain') } : x))}>{t('domain')}</Hit>
                      <Hit className={`rounded px-1.5 py-0.5 text-[11px] ${f.match === 'regex' ? 'text-[#1976d2]' : 'text-[var(--text-c)]'}`} onClick={() => onChange(filters.map(x => x.id === f.id ? { ...x, match: x.match === 'regex' ? 'wildcard' : 'regex' } : x))}>{t('regex')}</Hit>
                    </>
                  )}
                </>
              )
            : f.kind === 'time'
              ? (
                  <input
                    className="field h-7 min-w-0 flex-1 font-mono text-[12px] outline-none"
                    placeholder="09:00-18:00"
                    value={f.value}
                    onChange={e => onChange(filters.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))}
                  />
                )
            : f.kind === 'resource'
              ? (
                  <div className="flex flex-1 flex-wrap gap-1">
                    {RES_CHIPS.map(t => {
                      const on = f.value.split(',').map(s => s.trim()).includes(t)
                      return (
                        <Hit
                          key={t}
                          className={`rounded px-1.5 py-0.5 text-[11px] ${on ? 'text-[#1976d2]' : 'text-[var(--text-c)]'}`}
                          onClick={() => {
                            const cur = f.value.split(',').map(s => s.trim()).filter(Boolean)
                            const next = on ? cur.filter(x => x !== t) : [...cur, t]
                            onChange(filters.map(x => x.id === f.id ? { ...x, value: next.join(',') } : x))
                          }}
                        >
                          {t}
                        </Hit>
                      )
                    })}
                  </div>
                )
              : <span className="flex-1 text-[12px] text-[var(--text-c)]">{t('currentOnly')}</span>}
          <Hit className="size-7 rounded-full text-[var(--danger)]" onClick={() => onChange(filters.filter(x => x.id !== f.id))}>×</Hit>
        </div>
      ))}
      </div>
    </section>
  )
}

export function App() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [rail, setRail] = useState(true)
  const [q, setQ] = useState('')
  const [find, setFind] = useState(false)
  const [filterOn, setFilterOn] = useState(false)
  const [more, setMore] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [redirOn, setRedirOn] = useState(false)
  const [extraOn, setExtraOn] = useState(false)
  const [extraDraft, setExtraDraft] = useState('')
  const [focusId, setFocusId] = useState('')
  const [tabUrl, setTabUrl] = useState('')
  const [past, setPast] = useState<Prefs[]>([])
  const [future, setFuture] = useState<Prefs[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const addRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadPrefs().then(p => {
      setPrefs(p)
      applyTheme(p.theme)
      applyPrefs(p).then(setErr)
      if (activeProfile(p).filters.length > 0) setFilterOn(true)
      if (activeProfile(p).redirects.length > 0) setRedirOn(true)
    })
    browser.tabs.query({ active: true, currentWindow: true }).then(ts => {
      const u = ts[0]?.url
      if (u) setTabUrl(u)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!addOpen && !more) return
    const close = (e: PointerEvent) => {
      const t = e.target
      if (t instanceof Node && (addRef.current?.contains(t) || moreRef.current?.contains(t))) return
      setAddOpen(false)
      setMore(false)
    }
    const id = window.setTimeout(() => document.addEventListener('pointerdown', close, true), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('pointerdown', close, true)
    }
  }, [addOpen, more])

  if (!prefs) return null
  setLang(resolveLang(prefs.lang))
  document.documentElement.lang = resolveLang(prefs.lang)

  const emit = (next: Prefs, record = true) => {
    if (record) {
      setPast(s => [...s.slice(-50), prefs])
      setFuture([])
    }
    setPrefs(next)
    persist(next)
  }

  const undo = () => {
    const prev = past[past.length - 1]
    if (!prev) return
    setPast(s => s.slice(0, -1))
    setFuture(s => [prefs, ...s])
    setPrefs(prev)
    persist(prev)
  }

  const redo = () => {
    const next = future[0]
    if (!next) return
    setFuture(s => s.slice(1))
    setPast(s => [...s, prefs])
    setPrefs(next)
    persist(next)
  }

  const cur = activeProfile(prefs)
  const patch = (p: Partial<Profile>) => emit(patchProfile(prefs, cur.id, p))
  const idx = Math.max(1, prefs.profiles.findIndex(p => p.id === cur.id) + 1)
  const ql = q.trim().toLowerCase()
  const showFilter = filterOn || cur.filters.length > 0
  const showRedir = redirOn || cur.redirects.length > 0
  const reqCat = mergeCatalog(REQUEST_HEADERS, prefs.extraNames)
  const resCat = mergeCatalog(RESPONSE_HEADERS, prefs.extraNames)

  const addReq = (name = '', value = '') => {
    const r = { ...emptyRule(), name: text(name), value: text(value) }
    setFocusId(r.id)
    patch({ request: [...cur.request, r] })
  }
  const addRes = (name = '', value = '') => {
    const r = { ...emptyRule(), name: text(name), value: text(value) }
    setFocusId(r.id)
    patch({ response: [...cur.response, r] })
  }
  const addFilt = (kind: FilterKind) => {
    setFilterOn(true)
    patch({ filters: [...cur.filters, emptyFilter(kind)] })
  }
  const runAdd = (id: string) => {
    setAddOpen(false)
    if (id === 'req') addReq()
    else if (id === 'res') addRes()
    else if (id === 'cookie') addReq('Cookie')
    else if (id === 'setcookie') addRes('Set-Cookie')
    else if (id === 'csp') addRes('Content-Security-Policy', "default-src 'self'")
    else if (id === 'redirect') {
      setRedirOn(true)
      patch({ redirects: [...cur.redirects, emptyRedirect()] })
    }
    else addFilt(id as FilterKind)
  }

  return (
    <div className="root flex min-h-[360px] bg-[var(--bg-page)] text-[var(--text-a)]">
      {rail && (
        <aside className="flex w-12 shrink-0 flex-col items-center gap-0.5 border-r border-[var(--line)] bg-[var(--bg-side)] py-1.5">
          <Hit title={t('sidebar')} className="size-10 rounded-full text-[var(--text-b)]" onClick={() => setRail(false)}>
            <Menu className="size-[18px]" />
          </Hit>
          <Hit title={t('search')} className="size-10 rounded-full text-[var(--text-b)]" onClick={() => setFind(v => !v)}>
            <Search className="size-[18px]" />
          </Hit>
          {prefs.profiles.map((p, i) => (
            <Hit
              key={p.id}
              title={p.enabled ? p.name : t('paused', { name: p.name })}
              className={`relative size-10 rounded-full text-[18px] font-bold ${p.id === cur.id ? 'bg-[var(--bar)] text-white' : 'text-[var(--text-b)]'} ${p.enabled ? '' : 'opacity-40'}`}
              onClick={() => emit({ ...prefs, activeId: p.id })}
            >
              {i + 1}
              <span
                className={`absolute right-1 bottom-1 size-1.5 rounded-full ${p.enabled ? 'bg-emerald-400' : 'bg-[var(--text-c)]'}`}
                onClick={e => {
                  e.stopPropagation()
                  emit(patchProfile(prefs, p.id, { enabled: !p.enabled }))
                }}
              />
            </Hit>
          ))}
          <Hit
            title={t('newProfile')}
            className="size-10 rounded-full text-[var(--text-b)]"
            onClick={() => {
              const p = emptyProfile(`Profile ${prefs.profiles.length + 1}`)
              emit({ ...prefs, profiles: [...prefs.profiles, p], activeId: p.id })
            }}
          >
            <SquarePlus className="size-[18px]" />
          </Hit>
          <Hit title={t('import')} className="size-10 rounded-full text-[var(--text-b)]" onClick={() => fileRef.current?.click()}>
            <Download className="size-[18px]" />
          </Hit>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center bg-[var(--bar)] pr-1 pl-2 text-[var(--bar-ink)]">
          {!rail && (
            <Hit title={t('sidebar')} className="size-9 rounded-full" onClick={() => setRail(true)}>
              <Menu className="size-4" />
            </Hit>
          )}
          <span className="mr-1.5 flex size-6 items-center justify-center rounded-full border border-white/50 text-[12px] font-bold">{idx}</span>
          <input className="h-8 min-w-0 flex-1 bg-transparent text-[16px] font-medium text-white outline-none" value={cur.name} onChange={e => patch({ name: e.target.value })} />
          <Hit title={t('undo')} className="size-9 rounded-full" disabled={past.length === 0} onClick={undo}><Undo2 className="size-4" /></Hit>
          <div ref={addRef} className="relative">
            <Hit
              title={t('add')}
              className={`size-10 rounded-full text-white ${addOpen ? 'bg-white/25' : 'bg-white/15'}`}
              onClick={() => setAddOpen(v => !v)}
            >
              <Plus className="size-5" />
            </Hit>
            {addOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-40 flex overflow-hidden rounded-lg bg-[#2b2b2b] text-[14px] text-white shadow-2xl">
                <div className="flex min-w-[200px] flex-col py-1">
                  {ADD_MODS.map(it => (
                    <button
                      key={it.id}
                      type="button"
                      className="hit justify-start px-4 py-2.5 text-left"
                      onClick={() => runAdd(it.id)}
                    >
                      {t(it.label)}
                    </button>
                  ))}
                </div>
                <div className="flex min-w-[200px] flex-col border-l border-white/10 py-1">
                  {ADD_FILTERS.map(it => (
                    <button
                      key={it.id}
                      type="button"
                      className="hit justify-start px-4 py-2.5 text-left"
                      onClick={() => runAdd(it.id)}
                    >
                      {t(it.label)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Hit title={prefs.on ? t('pause') : t('resume')} className="size-9 rounded-full" onClick={() => emit({ ...prefs, on: !prefs.on })}>
            {prefs.on ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Hit>
          <Hit title={t('redo')} className="size-9 rounded-full" disabled={future.length === 0} onClick={redo}><Redo2 className="size-4" /></Hit>
          <Hit title={t('popOut')} className="size-9 rounded-full" onClick={() => window.open(location.href, 'headers', 'width=720,height=560')}><ExternalLink className="size-4" /></Hit>
          <div ref={moreRef} className="relative">
            <Hit title={t('more')} className="size-9 rounded-full" onClick={() => setMore(v => !v)}><MoreVertical className="size-4" /></Hit>
            {more && (
              <div className="absolute top-[calc(100%+6px)] right-1 z-40 w-56 overflow-hidden rounded-lg bg-[#2b2b2b] py-1 text-[13px] text-white shadow-2xl">
                <button type="button" className="hit menu" onClick={() => {
                  const p = cloneProfile(cur)
                  emit({ ...prefs, profiles: [...prefs.profiles, p], activeId: p.id })
                  setMore(false)
                }}
                >
                  <Copy className="size-3.5 shrink-0 opacity-80" />
                  {t('clone')}
                </button>
                <button
                  type="button"
                  className="hit menu"
                  onClick={() => {
                    downloadPrefs(prefs, cur.name)
                    copy(encodeShare(prefs)).then(() => {
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 1500)
                    }).catch(() => {})
                    setMore(false)
                  }}
                >
                  {copied ? <Check className="size-3.5 shrink-0 opacity-80" /> : <Share2 className="size-3.5 shrink-0 opacity-80" />}
                  {copied ? t('copied') : t('export')}
                </button>
                <button type="button" className="hit menu" onClick={() => { setExtraOn(v => !v); setMore(false) }}>
                  <ListPlus className="size-3.5 shrink-0 opacity-80" />
                  {extraOn ? t('hideExtras') : t('autocomplete')}
                </button>
                <div className="flex items-center gap-0.5 whitespace-nowrap px-2.5 py-1.5 text-[12px] text-white/55">
                  {([['light', 'light', Sun], ['dark', 'dark', Moon], ['system', 'system', Monitor]] as const).map(([id, msg, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      className={`hit shrink-0 items-center gap-1 rounded px-2 py-1 ${prefs.theme === id ? 'text-white' : 'text-white/45'}`}
                      onClick={() => emit({ ...prefs, theme: id })}
                    >
                      <Icon className="size-3.5" />
                      {t(msg)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-0.5 whitespace-nowrap px-2.5 py-1.5 text-[12px] text-white/55">
                  <Globe className="ml-1 size-3.5 shrink-0 opacity-80" />
                  {([['system', 'langAuto'], ['en', 'langEn'], ['zh', 'langZh']] as const).map(([id, msg]) => (
                    <button
                      key={id}
                      type="button"
                      className={`hit shrink-0 rounded px-2 py-1 ${prefs.lang === id ? 'text-white' : 'text-white/45'}`}
                      onClick={() => emit({ ...prefs, lang: id })}
                    >
                      {t(msg)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="hit menu text-[#ff8a80]"
                  disabled={prefs.profiles.length <= 1}
                  onClick={() => {
                    if (prefs.profiles.length <= 1) return
                    const profiles = prefs.profiles.filter(p => p.id !== cur.id)
                    const list = profiles.length > 0 ? profiles : [emptyProfile('Profile 1')]
                    emit({ ...prefs, profiles: list, activeId: list[0]!.id })
                    setMore(false)
                  }}
                >
                  <Trash2 className="size-3.5" />
                  {t('delete')}
                </button>
                <p className="px-3.5 py-1.5 text-[11px] text-white/35">v{VERSION}</p>
              </div>
            )}
          </div>
        </header>

        <div className={`flex min-h-0 flex-1 flex-col transition-opacity duration-150 ${prefs.on ? '' : 'opacity-40'}`}>

          {extraOn && (
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2">
              <input
                className="h-7 min-w-0 flex-1 bg-transparent text-[12px] outline-none"
                placeholder={t('extraPlaceholder')}
                value={extraDraft}
                onChange={e => setExtraDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key !== 'Enter' || extraDraft.trim() === '') return
                  emit({ ...prefs, extraNames: [...prefs.extraNames, extraDraft.trim()] })
                  setExtraDraft('')
                }}
              />
              <span className="text-[11px] text-[var(--text-c)]">{prefs.extraNames.length}</span>
            </div>
          )}

          {find && (
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2">
              <Search className="size-3.5 text-[var(--text-c)]" />
              <input autoFocus className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" placeholder={t('searchPlaceholder')} value={q} onChange={e => setQ(e.target.value)} />
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            <HeaderBlock title={t('requestHeaders')} rows={cur.request} query={ql} focusId={focusId} catalog={reqCat} extras={prefs.extraValues} onChange={request => patch({ request })} onAdd={() => addReq()} />
            <HeaderBlock title={t('responseHeaders')} rows={cur.response} query={ql} focusId={focusId} catalog={resCat} extras={prefs.extraValues} onChange={response => patch({ response })} onAdd={() => addRes()} />
            {showRedir && (
              <section>
                <div className="flex h-9 items-center px-4">
                  <p className="flex-1 text-[13px] font-semibold">{t('redirects')}</p>
                  <Hit className="h-7 gap-1 rounded-md px-2 text-[12px] font-medium text-[#1976d2]" onClick={() => patch({ redirects: [...cur.redirects, emptyRedirect()] })}>
                    <Plus className="size-3.5" />
                    {t('add')}
                  </Hit>
                </div>
                {cur.redirects.map(r => (
                  <div key={r.id} className="flex items-center gap-1 px-4 py-1">
                    <Tick on={r.enabled} onChange={enabled => patch({ redirects: cur.redirects.map(x => x.id === r.id ? { ...x, enabled } : x) })} />
                    <input className="field h-7 min-w-0 flex-1 font-mono text-[12px] outline-none" placeholder="from" value={r.from} onChange={e => patch({ redirects: cur.redirects.map(x => x.id === r.id ? { ...x, from: e.target.value } : x) })} />
                    <span className="text-[var(--text-c)]">→</span>
                    <input className="field h-7 min-w-0 flex-1 font-mono text-[12px] outline-none" placeholder="to" value={r.to} onChange={e => patch({ redirects: cur.redirects.map(x => x.id === r.id ? { ...x, to: e.target.value } : x) })} />
                    <Hit className={`rounded px-1.5 text-[11px] ${r.regex ? 'text-[#1976d2]' : 'text-[var(--text-c)]'}`} onClick={() => patch({ redirects: cur.redirects.map(x => x.id === r.id ? { ...x, regex: !x.regex } : x) })}>{t('regex')}</Hit>
                    <Hit className="size-7 rounded-full text-[var(--danger)]" onClick={() => patch({ redirects: cur.redirects.filter(x => x.id !== r.id) })}>×</Hit>
                  </div>
                ))}
              </section>
            )}

            {showFilter
              ? <FilterList filters={cur.filters} tabUrl={tabUrl} onChange={filters => patch({ filters })} />
              : (
                  <p className="px-4 pt-3 text-[13px] leading-snug text-[var(--text-a)]">
                    {t('filterHint')}
                  </p>
                )}

            {err !== '' && <p className="px-4 pt-2 text-xs text-[var(--danger)]">{err}</p>}

            <div className="flex gap-2 px-4 py-3">
              <Hit className="h-9 rounded-[4px] bg-[#1976d2] px-3.5 text-[13px] font-semibold text-white" onClick={() => addReq()}>
                <Plus className="mr-1 size-4" />
                MOD
              </Hit>
              <Hit
                className="h-9 rounded-[4px] bg-[#1976d2] px-3.5 text-[13px] font-semibold text-white"
                onClick={() => {
                  setFilterOn(true)
                  if (cur.filters.length === 0) patch({ filters: [emptyFilter()] })
                }}
              >
                <FilterIcon className="mr-1 size-4" />
                FILTER
              </Hit>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,text/plain"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          f.text().then(text => {
            const shared = decodeShare(text)
            if (shared) {
              emit(shared)
              return
            }
            try {
              emit(decodePrefs(JSON.parse(text)))
            }
            catch {
              setErr(t('importFailed'))
            }
          })
        }}
      />
    </div>
  )
}
