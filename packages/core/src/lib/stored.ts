/**
 * Values kept in `localStorage` by key, safe when storage is missing or refused (a private window,
 * blocked site data): what cannot be kept there is held in memory until the page is left. Every
 * write tells the listeners of its key in this tab, and a write in another tab reaches them through
 * the window's `storage` event.
 */

// What could not be kept in `localStorage`, so the value holds until the page is left.
const memory = new Map<string, string | null>()
const listeners = new Map<string, Set<() => void>>()
let prefix = ''

/** The prefix every `useStored` key takes unless it gives its own, such as an app's name and a dot. */
export function setStoredPrefix(next: string): void {
    prefix = next
}

/** The key a value is kept under: the prefix given, or the app's, before the key. */
export function storedKey(key: string, own?: string): string {
    return `${own ?? prefix}${key}`
}

/** The text kept under a full key, or null when nothing is. */
export function readStored(key: string): string | null {
    if (memory.has(key)) return memory.get(key) ?? null
    try {
        return globalThis.localStorage?.getItem(key) ?? null
    } catch {
        return null
    }
}

/** Keeps text under a full key, or removes it with null, and tells the key's listeners. */
export function writeStored(key: string, value: string | null): void {
    try {
        if (value === null) globalThis.localStorage.removeItem(key)
        else globalThis.localStorage.setItem(key, value)
        memory.delete(key)
    } catch {
        memory.set(key, value)
    }
    notify(key)
}

function notify(key: string): void {
    for (const listener of listeners.get(key) ?? []) listener()
}

/** Lets go of what memory holds for a key, or for every key with null, once storage has it from another tab. */
export function forgetStored(key: string | null): void {
    if (key === null) memory.clear()
    else memory.delete(key)
}

function onStorage(event: StorageEvent): void {
    forgetStored(event.key)
    // A clear in another tab names no key: every value may have changed.
    if (event.key === null) for (const key of listeners.keys()) notify(key)
    else if (listeners.has(event.key)) notify(event.key)
}

/** Hears every change to a full key, in this tab and in others; returns the way to stop. */
export function subscribeStored(key: string, listener: () => void): () => void {
    if (listeners.size === 0 && typeof window !== 'undefined') window.addEventListener('storage', onStorage)
    const set = listeners.get(key) ?? new Set()
    set.add(listener)
    listeners.set(key, set)
    return () => {
        set.delete(listener)
        if (set.size === 0) listeners.delete(key)
        if (listeners.size === 0 && typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
    }
}

/**
 * Kept text read back as JSON, or `fallback` when there is none, it does not parse, or `check`
 * refuses it (a value kept by an older version of the app, or by hand).
 */
export function parseStored<V>(raw: string | null, fallback: V, check?: (value: unknown) => boolean): V {
    if (raw === null) return fallback
    try {
        const value: unknown = JSON.parse(raw)
        return check === undefined || check(value) ? (value as V) : fallback
    } catch {
        return fallback
    }
}

/** Options for a value kept in storage. */
export interface StoredOptions {
    /** The prefix before the key, in place of the app's from `setStoredPrefix`. */
    prefix?: string
    /** Whether a kept value is one to use; one refused reads back as the initial value. */
    check?: (value: unknown) => boolean
}

/** One value shared by every reader, and the ways to read, change and watch it. */
export interface Store<V> {
    /** The value now; the same object until it changes. */
    get: () => V
    /** Replaces the value; one equal by `Object.is` tells nobody. */
    set: (next: V) => void
    /** Replaces the value with one made from the current one. */
    update: (change: (current: V) => V) => void
    /** Hears every change; returns the way to stop. */
    subscribe: (listener: () => void) => () => void
}

/**
 * A value held outside React, shared by every component that reads it through `useStore` or
 * `useStoreValue`: who is signed in, whether the rail is folded, what is playing. Given `key`, it
 * is kept in `localStorage` as JSON (under the app's prefix), read back on load, and follows a
 * change made in another tab; without one it lasts until the page is left.
 */
export function createStore<V>(initial: V, { key, ...options }: StoredOptions & { key?: string } = {}): Store<V> {
    const full = key === undefined ? undefined : storedKey(key, options.prefix)
    let raw = full === undefined ? null : readStored(full)
    let current = full === undefined ? initial : parseStored(raw, initial, options.check)
    const listeners = new Set<() => void>()
    const tell = () => {
        // A copy, so a listener that stops itself does not skip the next one.
        for (const listener of Array.from(listeners)) listener()
    }
    let stopKept: (() => void) | undefined
    const set = (next: V) => {
        if (Object.is(next, current)) return
        current = next
        if (full !== undefined) {
            raw = JSON.stringify(next)
            writeStored(full, raw)
        }
        tell()
    }
    return {
        get: () => current,
        set,
        update: (change) => set(change(current)),
        subscribe: (listener) => {
            listeners.add(listener)
            // A kept value follows writes to its key made elsewhere: another store, a hook, another tab.
            if (full !== undefined && stopKept === undefined)
                stopKept = subscribeStored(full, () => {
                    const now = readStored(full)
                    if (now === raw) return
                    raw = now
                    current = parseStored(now, initial, options.check)
                    tell()
                })
            return () => {
                listeners.delete(listener)
                if (listeners.size === 0) {
                    stopKept?.()
                    stopKept = undefined
                }
            }
        },
    }
}
