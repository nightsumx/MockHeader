import { describe, expect, it } from 'vitest'
import { decodePrefs } from '../src/settings'
import { decodeShare, encodeShare } from '../src/share'

describe('share', () => {
  it('roundtrips prefs including unicode', () => {
    const p = decodePrefs({
      theme: 'dark',
      on: false,
      extraNames: ['X-测'],
      profiles: [{
        id: 'a',
        name: '配置',
        request: [{ name: 'Authorization', value: 'Bearer 你好', comment: '备' }],
        filters: [{ kind: 'url', value: '*://*.example.com/*' }],
        redirects: [{ from: 'a', to: 'b', regex: true }],
      }],
    })
    const got = decodeShare(encodeShare(p))
    expect(got).toEqual(p)
  })

  it('trims and rejects junk', () => {
    const p = decodePrefs({ theme: 'light' })
    const token = encodeShare(p)
    expect(decodeShare(`  ${token}  `)).toEqual(p)
    expect(decodeShare('')).toBeNull()
    expect(decodeShare('hdr1.!!!')).toBeNull()
    expect(decodeShare('not-a-token')).toBeNull()
    expect(token.startsWith('hdr1.')).toBe(true)
  })
})
