import { describe, expect, it } from 'vitest'
import { activeProfile, cloneProfile, decodePrefs, defaultPrefs, emptyFilter, liveHeaderCount, patchProfile, resolveTheme } from '../src/settings'

describe('decodePrefs', () => {
  it('falls back on junk', () => {
    const d = defaultPrefs()
    expect(decodePrefs(null).theme).toBe(d.theme)
    expect(decodePrefs('x').on).toBe(true)
    expect(decodePrefs({ theme: 'neon' }).theme).toBe('system')
    expect(decodePrefs(null).lang).toBe('system')
    expect(decodePrefs({ lang: 'zh' }).lang).toBe('zh')
    expect(decodePrefs({ lang: 'de' }).lang).toBe('system')
  })

  it('keeps known fields', () => {
    const p = decodePrefs({
      theme: 'dark',
      on: false,
      activeId: 'a',
      profiles: [{
        id: 'a',
        name: '测',
        enabled: false,
        urlFilter: '*://x/*',
        request: [{ id: 'h1', enabled: true, name: 'X-A', value: '1', op: 'append' }],
        response: [{ id: 'h2', enabled: false, name: 'X-B', value: '', op: 'remove' }],
      }],
    })
    expect(p.theme).toBe('dark')
    expect(p.on).toBe(false)
    expect(p.activeId).toBe('a')
    expect(p.profiles[0]?.name).toBe('测')
    expect(p.profiles[0]?.request[0]?.op).toBe('append')
    expect(p.profiles[0]?.response[0]?.op).toBe('remove')
    expect(p.profiles[0]?.filters[0]?.value).toBe('*://x/*')
    expect(p.profiles[0]?.request[0]?.comment).toBe('')
  })

  it('repairs missing active id', () => {
    const p = decodePrefs({
      profiles: [{ id: 'only', name: 'A', enabled: true, urlFilter: '', request: [], response: [] }],
      activeId: 'gone',
    })
    expect(p.activeId).toBe('only')
  })

  it('keeps comments, filters, redirects, extras', () => {
    const p = decodePrefs({
      extraNames: ['X-Mine', '', '  '],
      extraValues: ['v1', 3, 'v2'],
      profiles: [{
        id: 'a',
        request: [{ id: 'h1', name: 'A', value: '1', comment: 'note', op: 'set', enabled: true }],
        filters: [
          { id: 'f1', kind: 'tabGroup', value: 'current', enabled: true },
          { id: 'f2', kind: 'time', value: '09:00-18:00', enabled: true },
          { kind: 'nope', value: 'x' },
        ],
        redirects: [{ id: 'r1', from: '*://a/*', to: 'https://b/', regex: true, enabled: true }],
      }],
    })
    expect(p.extraNames).toEqual(['X-Mine'])
    expect(p.extraValues).toEqual(['v1', 'v2'])
    expect(p.profiles[0]?.request[0]?.comment).toBe('note')
    expect(p.profiles[0]?.filters.map(f => f.kind)).toEqual(['tabGroup', 'time', 'url'])
    expect(p.profiles[0]?.redirects[0]?.regex).toBe(true)
  })

  it('does not duplicate legacy urlFilter when filters already have url', () => {
    const p = decodePrefs({
      profiles: [{
        id: 'a',
        urlFilter: '*://old/*',
        filters: [{ kind: 'url', value: '*://new/*', enabled: true }],
      }],
    })
    expect(p.profiles[0]?.filters.filter(f => f.kind === 'url')).toHaveLength(1)
    expect(p.profiles[0]?.filters[0]?.value).toBe('*://new/*')
  })
})

describe('resolveTheme / active / emptyFilter / clone', () => {
  it('resolveTheme', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('activeProfile falls to first', () => {
    const p = decodePrefs({
      activeId: 'gone',
      profiles: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    })
    expect(activeProfile(p).id).toBe('a')
  })

  it('emptyFilter defaults', () => {
    expect(emptyFilter('tab').value).toBe('current')
    expect(emptyFilter('tabGroup').value).toBe('current')
    expect(emptyFilter('time').value).toBe('09:00-18:00')
    expect(emptyFilter('url').value).toBe('')
  })

  it('cloneProfile new ids and copy name', () => {
    const src = decodePrefs({
      profiles: [{
        id: 'a',
        name: 'P',
        request: [{ id: 'h1', name: 'A', value: '1' }],
        filters: [{ id: 'f1', kind: 'url', value: '*' }],
        redirects: [{ id: 'r1', from: 'a', to: 'b' }],
      }],
    }).profiles[0]!
    const c = cloneProfile(src)
    expect(c.id).not.toBe(src.id)
    expect(c.name).toBe('P copy')
    expect(c.request[0]?.id).not.toBe('h1')
    expect(c.request[0]?.name).toBe('A')
    expect(c.filters[0]?.id).not.toBe('f1')
    expect(c.redirects[0]?.id).not.toBe('r1')
  })
})

describe('liveHeaderCount / patch', () => {
  it('counts only live headers', () => {
    const p = decodePrefs({
      on: true,
      profiles: [{
        id: 'a',
        name: 'A',
        enabled: true,
        urlFilter: '',
        request: [
          { id: '1', enabled: true, name: 'A', value: '1', op: 'set' },
          { id: '2', enabled: false, name: 'B', value: '1', op: 'set' },
          { id: '3', enabled: true, name: '  ', value: '1', op: 'set' },
        ],
        response: [{ id: '4', enabled: true, name: 'C', value: '', op: 'remove' }],
      }],
    })
    expect(liveHeaderCount(p)).toBe(2)
    expect(liveHeaderCount({ ...p, on: false })).toBe(0)
    const withRedir = decodePrefs({
      profiles: [{
        id: 'a',
        enabled: true,
        redirects: [
          { enabled: true, from: 'a', to: 'b' },
          { enabled: true, from: 'a', to: '' },
          { enabled: false, from: 'c', to: 'd' },
        ],
      }],
    })
    expect(liveHeaderCount(withRedir)).toBe(1)
  })

  it('patchProfile only touches that id', () => {
    const base = defaultPrefs()
    const extra = { id: 'z', name: 'Z', enabled: true, request: [], response: [], filters: [], redirects: [] }
    const next = patchProfile({ ...base, profiles: [...base.profiles, extra] }, extra.id, { name: '改' })
    expect(next.profiles.find(p => p.id === extra.id)?.name).toBe('改')
    expect(next.profiles.find(p => p.id === base.activeId)?.name).toBe(base.profiles[0]?.name)
  })
})
