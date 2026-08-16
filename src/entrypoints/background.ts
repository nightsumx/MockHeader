import { applyPrefs, emptyCtx, needsTabCtx, type ApplyCtx } from '../dnr'
import { decodePrefs, emptyRule, patchProfile } from '../settings'
import { loadPrefs, savePrefs, watchPrefs } from '../store'
import type { Prefs } from '../types'

async function ctxOf(prefs: Prefs): Promise<ApplyCtx> {
  const base = { ...emptyCtx(), now: Date.now(), uuid: crypto.randomUUID() }
  if (!needsTabCtx(prefs) && !prefs.profiles.some(p => p.filters.some(f => f.kind === 'url'))) {
    return base
  }
  try {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true })
    const url = tab?.url ?? ''
    const tabId = tab?.id
    const windowId = tab?.windowId
    let windowTabIds: number[] = []
    let groupTabIds: number[] = []
    if (windowId != null) {
      const ts = await browser.tabs.query({ windowId })
      windowTabIds = ts.map(t => t.id).filter(id => typeof id === 'number')
      const gid = tab?.groupId
      if (typeof gid === 'number' && gid >= 0) {
        groupTabIds = ts.filter(t => t.groupId === gid).map(t => t.id).filter(id => typeof id === 'number')
      }
      else if (tabId != null) {
        groupTabIds = [tabId]
      }
    }
    return { ...base, url, tabId, windowTabIds, groupTabIds }
  }
  catch {
    return base
  }
}

export default defineBackground(() => {
  let last: Prefs | null = null
  let t: ReturnType<typeof setTimeout> | undefined

  const run = (p?: Prefs) => {
    if (t !== undefined) clearTimeout(t)
    t = setTimeout(async () => {
      const prefs = p ?? last ?? await loadPrefs()
      last = prefs
      applyPrefs(prefs, await ctxOf(prefs))
    }, 80)
  }

  run()
  watchPrefs(p => run(p))
  browser.runtime.onInstalled.addListener(() => run())
  browser.runtime.onStartup.addListener(() => run())
  try {
    browser.alarms.create('headers-tick', { periodInMinutes: 1 })
    browser.alarms.onAlarm.addListener(a => {
      if (a.name === 'headers-tick') run(last ?? undefined)
    })
  }
  catch {}
  browser.tabs.onActivated.addListener(() => {
    if (last && needsTabCtx(last)) run(last)
  })
  browser.tabs.onUpdated.addListener((_id, info) => {
    if (info.status === 'complete' && last && needsTabCtx(last)) run(last)
  })

  browser.commands.onCommand.addListener(async cmd => {
    const prefs = last ?? await loadPrefs()
    if (cmd === 'toggle-pause') {
      const next = { ...prefs, on: !prefs.on }
      await savePrefs(next)
      return
    }
    if (cmd === 'add-header') {
      const id = prefs.activeId
      const p = prefs.profiles.find(x => x.id === id)
      if (!p) return
      await savePrefs(patchProfile(prefs, id, { request: [...p.request, emptyRule()] }))
    }
  })

  const onMsg = (msg: { type?: string; prefs?: unknown }, _s: unknown, send: (v: unknown) => void) => {
    if (msg.type === 'getPrefs') {
      loadPrefs().then(send)
      return true
    }
    if (msg.type === 'setPrefs' && msg.prefs != null) {
      savePrefs(decodePrefs(msg.prefs)).then(() => send({ ok: true }))
      return true
    }
    return false
  }
  browser.runtime.onMessage.addListener(onMsg)
  browser.runtime.onMessageExternal.addListener(onMsg)
})
