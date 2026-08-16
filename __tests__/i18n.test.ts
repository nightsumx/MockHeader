import { describe, expect, it } from 'vitest'
import { detectLang, resolveLang, setLang, t } from '../src/i18n'

describe('i18n', () => {
  it('detects zh prefixes, else en', () => {
    expect(detectLang('zh')).toBe('zh')
    expect(detectLang('zh-CN')).toBe('zh')
    expect(detectLang('zh-TW')).toBe('zh')
    expect(detectLang('en-US')).toBe('en')
    expect(detectLang('ja')).toBe('en')
    expect(detectLang('')).toBe('en')
  })

  it('system follows navigator, unknown pref is system', () => {
    expect(resolveLang('en', 'zh-CN')).toBe('en')
    expect(resolveLang('zh', 'en-US')).toBe('zh')
    expect(resolveLang('system', 'zh-CN')).toBe('zh')
    expect(resolveLang('system', 'fr-FR')).toBe('en')
  })

  it('fills vars and falls back to en keys', () => {
    setLang('en')
    expect(t('paused', { name: 'A' })).toBe('A (paused)')
    setLang('zh')
    expect(t('paused', { name: 'A' })).toBe('A（已停）')
    expect(t('clone')).toBe('克隆')
  })
})
