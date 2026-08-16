import { describe, expect, it } from 'vitest'
import { compileConditions, compileRules, emptyCtx } from '../src/dnr'
import { decodePrefs } from '../src/settings'

function all(raw: unknown) {
  const { persist, session } = compileRules(decodePrefs(raw))
  return [...persist, ...session]
}

describe('compileRules composition', () => {
  it('empty when off or no live headers', () => {
    expect(all({ on: false, profiles: [{ id: 'a', enabled: true, request: [{ enabled: true, name: 'A', value: '1', op: 'set' }] }] })).toEqual([])
    expect(all({ on: true, profiles: [{ id: 'a', enabled: false, request: [{ enabled: true, name: 'A', value: '1', op: 'set' }] }] })).toEqual([])
    expect(all({ on: true, profiles: [{ id: 'a', enabled: true, request: [] }] })).toEqual([])
  })

  it('maps set append remove and legacy urlFilter', () => {
    const rules = all({
      on: true,
      profiles: [{
        id: 'a',
        enabled: true,
        urlFilter: '*://*.example.com/*',
        request: [
          { enabled: true, name: 'Authorization', value: 'Bearer x', op: 'set' },
          { enabled: true, name: 'Accept', value: 'a', op: 'append' },
        ],
        response: [
          { enabled: true, name: 'X-Frame-Options', value: '', op: 'remove' },
        ],
      }],
    })
    expect(rules).toHaveLength(1)
    const act = rules[0]?.action
    expect(act && 'requestHeaders' in act ? act.requestHeaders : null).toEqual([
      { header: 'Authorization', operation: 'set', value: 'Bearer x' },
      { header: 'Accept', operation: 'append', value: 'a' },
    ])
    expect(act && 'responseHeaders' in act ? act.responseHeaders : null).toEqual([
      { header: 'X-Frame-Options', operation: 'remove' },
    ])
    expect(rules[0]?.condition.urlFilter).toBe('*://*.example.com/*')
  })

  it('one rule per live profile', () => {
    const rules = all({
      on: true,
      profiles: [
        { id: 'a', enabled: true, request: [{ enabled: true, name: 'A', value: '1', op: 'set' }], response: [] },
        { id: 'b', enabled: true, request: [], response: [{ enabled: true, name: 'C', value: 'x', op: 'set' }] },
      ],
    })
    expect(rules).toHaveLength(2)
    const a0 = rules[0]?.action
    expect(a0 && 'requestHeaders' in a0 ? a0.requestHeaders : null).toEqual([{ header: 'A', operation: 'set', value: '1' }])
    const a1 = rules[1]?.action
    expect(a1 && 'responseHeaders' in a1 ? a1.responseHeaders : null).toEqual([{ header: 'C', operation: 'set', value: 'x' }])
  })

  it('splits more than 10 headers', () => {
    const request = Array.from({ length: 12 }, (_, i) => ({
      enabled: true,
      name: `H${i}`,
      value: '1',
      op: 'set' as const,
    }))
    const rules = all({ on: true, profiles: [{ id: 'a', enabled: true, request, response: [] }] })
    expect(rules).toHaveLength(2)
    const a0 = rules[0]?.action
    expect(a0 && 'requestHeaders' in a0 ? a0.requestHeaders?.length : 0).toBe(10)
  })
})

describe('compileConditions composition', () => {
  it('exclude domain + resource types', () => {
    const packs = compileConditions([
      { id: '1', enabled: true, kind: 'urlExclude', match: 'wildcard', value: 'ads.example.com' },
      { id: '2', enabled: true, kind: 'resource', match: 'wildcard', value: 'xmlhttprequest,main_frame' },
    ], emptyCtx())
    expect(packs[0]?.cond.excludedRequestDomains).toEqual(['ads.example.com'])
    expect(packs[0]?.cond.resourceTypes).toEqual(['xmlhttprequest', 'main_frame'])
  })

  it('multiple includes expand to multiple packs', () => {
    const packs = compileConditions([
      { id: '1', enabled: true, kind: 'url', match: 'host', value: 'a.test' },
      { id: '2', enabled: true, kind: 'url', match: 'regex', value: 'https://b\\.test/.*' },
      { id: '3', enabled: false, kind: 'url', match: 'exact', value: 'https://skip.test/' },
    ], emptyCtx())
    expect(packs).toHaveLength(2)
    expect(packs[0]?.cond.urlFilter).toBe('*://a.test/*')
    expect(packs[1]?.cond.regexFilter).toBe('https://b\\.test/.*')
  })
})
