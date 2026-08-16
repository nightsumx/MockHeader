import { describe, expect, it } from 'vitest'
import { formatCookieReq, formatSetCookie, parseCookieReq, parseSetCookie } from '../src/cookie'
import { formatCsp, parseCsp } from '../src/csp'

describe('cookie req', () => {
  it('roundtrip', () => {
    const xs = parseCookieReq('a=1; b=two')
    expect(xs).toEqual([{ name: 'a', value: '1' }, { name: 'b', value: 'two' }])
    expect(formatCookieReq(xs)).toBe('a=1; b=two')
  })
  it('skips empty names and keeps value equals', () => {
    expect(parseCookieReq('a=1=2; ; =x; b=')).toEqual([
      { name: 'a', value: '1=2' },
      { name: 'b', value: '' },
    ])
    expect(formatCookieReq([{ name: '', value: 'x' }, { name: ' a ', value: '1' }])).toBe('a=1')
  })
  it('empty string', () => {
    expect(parseCookieReq('')).toEqual([])
    expect(formatCookieReq([])).toBe('')
  })
})

describe('set-cookie', () => {
  it('parses attrs', () => {
    const c = parseSetCookie('sid=abc; Domain=ex.com; Path=/; Secure; HttpOnly; SameSite=Lax')
    expect(c.name).toBe('sid')
    expect(c.value).toBe('abc')
    expect(c.domain).toBe('ex.com')
    expect(c.path).toBe('/')
    expect(c.secure).toBe(true)
    expect(c.httpOnly).toBe(true)
    expect(c.sameSite).toBe('Lax')
    expect(formatSetCookie(c)).toContain('Domain=ex.com')
    expect(formatSetCookie(c)).toContain('Secure')
    expect(formatSetCookie(c)).toBe('sid=abc; Domain=ex.com; Path=/; SameSite=Lax; Secure; HttpOnly')
  })
  it('flags without value', () => {
    const c = parseSetCookie('a=1; Secure; HttpOnly')
    expect(c.secure).toBe(true)
    expect(c.httpOnly).toBe(true)
    expect(formatSetCookie({ ...c, secure: false, httpOnly: false, domain: '', path: '', expires: '', sameSite: '' })).toBe('a=1')
  })
})

describe('csp', () => {
  it('roundtrip', () => {
    const xs = parseCsp("default-src 'self'; script-src 'self' 'unsafe-inline'")
    expect(xs[0]).toEqual({ dir: 'default-src', val: "'self'" })
    expect(formatCsp(xs)).toBe("default-src 'self'; script-src 'self' 'unsafe-inline'")
  })
  it('flag-only and empty bits', () => {
    expect(parseCsp("upgrade-insecure-requests; ; default-src 'self'")).toEqual([
      { dir: 'upgrade-insecure-requests', val: '' },
      { dir: 'default-src', val: "'self'" },
    ])
    expect(formatCsp([{ dir: '', val: 'x' }, { dir: 'upgrade-insecure-requests', val: '' }])).toBe('upgrade-insecure-requests')
  })
})
