import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'

import { parseStored, readStored, storedKey, subscribeStored, writeStored, type StoredOptions } from '../lib/stored'

export { createStore, setStoredPrefix, type Store, type StoredOptions } from '../lib/stored'

/**
 * State kept in `localStorage` as JSON under `key`, so it outlasts a reload: a panel's width, a
 * folded section, a chosen tab. It reads back `initial` when nothing is kept, what is kept does
 * not parse, or `check` refuses it; holds the value in memory when storage is missing or refused;
 * and follows a change made under the same key anywhere: another `useStored` in the page, a store
 * made by `createStore` with that key, or another tab.
 *
 * The key takes the app's prefix, set once with `setStoredPrefix('tidevann.')`, or `prefix` here.
 * The setter takes a value or a function of the current one; `reset` forgets the kept value, so
 * `initial` shows again.
 */
export function useStored<V>(
    key: string,
    initial: V,
    { prefix, check }: StoredOptions = {},
): [V, (next: V | ((current: V) => V)) => void, () => void] {
    const full = storedKey(key, prefix)
    const subscribe = useCallback((listener: () => void) => subscribeStored(full, listener), [full])
    const raw = useSyncExternalStore(
        subscribe,
        () => readStored(full),
        () => null,
    )
    const first = useRef({ initial, check })
    const value = useMemo(() => parseStored(raw, first.current.initial, first.current.check), [raw])
    const set = useCallback(
        (next: V | ((current: V) => V)) => {
            const current = parseStored(readStored(full), first.current.initial, first.current.check)
            const value = typeof next === 'function' ? (next as (current: V) => V)(current) : next
            writeStored(full, JSON.stringify(value))
        },
        [full],
    )
    const reset = useCallback(() => writeStored(full, null), [full])
    return [value, set, reset]
}
