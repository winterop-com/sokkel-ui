import { useCallback, useRef, useSyncExternalStore } from 'react'

import type { Store } from '../lib/stored'

export { createStore, type Store } from '../lib/stored'

/** A store's value in a component, drawn again whenever it changes. */
export function useStore<V>(store: Store<V>): V {
    return useSyncExternalStore(store.subscribe, store.get, store.get)
}

/**
 * One fact read out of a store, drawn again only when that fact changes: a store that changes
 * often (a player's position, four times a second) leaves alone the components that read
 * something else from it. The fact is compared with `Object.is`, so `select` returns one value
 * (a number, a string, an object the store already holds), never a new object made each call.
 */
export function useStoreValue<V, S>(store: Store<V>, select: (value: V) => S): S {
    const held = useRef<{ from: V; value: S } | null>(null)
    const snapshot = useCallback(() => {
        const value = store.get()
        if (held.current !== null && Object.is(held.current.from, value)) return held.current.value
        const fact = select(value)
        const kept = held.current !== null && Object.is(held.current.value, fact) ? held.current.value : fact
        held.current = { from: value, value: kept }
        return kept
    }, [select, store])
    return useSyncExternalStore(store.subscribe, snapshot, snapshot)
}
