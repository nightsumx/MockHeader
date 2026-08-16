import { describe, expect, it } from 'vitest'
import { expandValue, usesUrlToken } from '../src/expand'

const ctx = { url: 'https://a.example.com/p?q=1', now: 1700000000000, uuid: 'u-1' }

describe('expandValue', () => {
  it('leaves plain text', () => {
    expect(expandValue('Bearer x', ctx)).toBe('Bearer x')
  })
  it('fills known tokens', () => {
    expect(expandValue('{{uuid}}', ctx)).toBe('u-1')
    expect(expandValue('t={{timestamp}}', ctx)).toBe('t=1700000000000')
    expect(expandValue('{{url_hostname}}', ctx)).toBe('a.example.com')
    expect(expandValue('{{url_path}}', ctx)).toBe('/p')
    expect(expandValue('{{url_origin}}', ctx)).toBe('https://a.example.com')
    expect(expandValue('{{existing_value}}', ctx)).toBe('')
  })
  it('keeps unknown tokens', () => {
    expect(expandValue('{{nope}}', ctx)).toBe('{{nope}}')
  })
  it('expands several tokens and trims keys', () => {
    expect(expandValue('{{ uuid }}-{{url_path}}', ctx)).toBe('u-1-/p')
    expect(expandValue('{{url}}', ctx)).toBe('https://a.example.com/p?q=1')
    expect(expandValue('{{ip_v4}}', ctx)).toBe('')
  })
  it('unclosed token stays', () => {
    expect(expandValue('pre-{{uuid', ctx)).toBe('pre-{{uuid')
  })
  it('bad url tokens become empty', () => {
    expect(expandValue('{{url_origin}}{{url_hostname}}{{url_path}}', { url: 'not-a-url', now: 1, uuid: 'x' })).toBe('')
  })
})

describe('usesUrlToken', () => {
  it('detects url tokens', () => {
    expect(usesUrlToken('{{url}}')).toBe(true)
    expect(usesUrlToken('{{url_path}}')).toBe(true)
    expect(usesUrlToken('{{uuid}}')).toBe(false)
  })
})
