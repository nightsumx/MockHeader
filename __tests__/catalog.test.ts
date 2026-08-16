import { describe, expect, it } from 'vitest'
import { REQUEST_HEADERS, markQuery, mergeCatalog, suggestHeaders } from '../src/catalog'

describe('suggestHeaders', () => {
  it('empty query is empty', () => {
    expect(suggestHeaders('', REQUEST_HEADERS)).toEqual([])
    expect(suggestHeaders('   ', REQUEST_HEADERS)).toEqual([])
  })

  it('prefix hits first', () => {
    const hits = suggestHeaders('x-forwarded', REQUEST_HEADERS)
    expect(hits[0]).toBe('X-Forwarded-For')
    expect(hits).toContain('X-Forwarded-Host')
    expect(hits).toContain('X-Forwarded-Proto')
    expect(hits.every(h => h.toLowerCase().includes('x-forwarded'))).toBe(true)
  })

  it('mid-string match and cap at 8', () => {
    const mid = suggestHeaders('control', REQUEST_HEADERS)
    expect(mid).toContain('Cache-Control')
    expect(mid[0]?.toLowerCase().startsWith('control') || mid.includes('Cache-Control')).toBe(true)
    expect(suggestHeaders('e', REQUEST_HEADERS).length).toBeLessThanOrEqual(8)
  })
})

describe('mergeCatalog', () => {
  it('extras first, case-insensitive dedupe, skip blank', () => {
    expect(mergeCatalog(['Accept', 'Cookie'], ['X-Mine', 'accept', '', 'Cookie'])).toEqual(['X-Mine', 'accept', 'Cookie'])
  })
})

describe('markQuery', () => {
  it('marks the matched slice', () => {
    expect(markQuery('X-Forwarded-For', 'x-forwarded')).toEqual([
      { t: 'X-Forwarded', on: true },
      { t: '-For', on: false },
    ])
  })

  it('no match is plain', () => {
    expect(markQuery('Accept', 'xyz')).toEqual([{ t: 'Accept', on: false }])
  })

  it('marks a middle slice', () => {
    expect(markQuery('Cache-Control', 'control')).toEqual([
      { t: 'Cache-', on: false },
      { t: 'Control', on: true },
    ])
  })

  it('empty query is unmarked', () => {
    expect(markQuery('Accept', '')).toEqual([{ t: 'Accept', on: false }])
  })
})
