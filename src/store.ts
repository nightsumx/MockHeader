import { decodePrefs, defaultPrefs } from './settings'
import type { Prefs } from './types'

const KEY = 'prefs'

export async function loadPrefs(): Promise<Prefs> {
  const bag = await browser.storage.local.get(KEY)
  return decodePrefs(bag[KEY])
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await browser.storage.local.set({ [KEY]: prefs })
}

export function watchPrefs(fn: (p: Prefs) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area !== 'local' || changes[KEY] == null) return
    fn(decodePrefs(changes[KEY].newValue))
  }
  browser.storage.onChanged.addListener(listener)
  return () => browser.storage.onChanged.removeListener(listener)
}

export { defaultPrefs }
