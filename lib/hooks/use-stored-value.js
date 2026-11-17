'use client'

import { useCallback, useSyncExternalStore } from 'react'

// A per-browser preference (sidebar collapsed, table density) kept in localStorage.
// useSyncExternalStore renders the server value first and the stored value after hydration,
// without a setState-in-effect. Falls back to memory when storage is blocked (private mode).
const EVENT = 'nz-stored-value'
const memory = new Map()

function subscribe(onChange) {
  window.addEventListener('storage', onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

function read(key) {
  try {
    const v = localStorage.getItem(key)
    if (v !== null) return v
  } catch {}
  return memory.get(key) ?? null
}

/** [value, setValue] for a string preference; `fallback` is used on the server and when unset. */
export function useStoredValue(key, fallback) {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null)
  const set = useCallback((value) => {
    memory.set(key, value)
    try { localStorage.setItem(key, value) } catch {}
    window.dispatchEvent(new Event(EVENT))
  }, [key])
  return [raw ?? fallback, set]
}
