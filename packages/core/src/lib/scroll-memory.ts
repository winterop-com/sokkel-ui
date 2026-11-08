import { storedKey } from './stored'

/** Where a scroller was left: how far down and how far across. */
export interface ScrollPlace {
    top: number
    left: number
}

// Every place kept this page, so a return finds it even where session storage is refused.
const places = new Map<string, ScrollPlace>()

function full(key: string): string {
    return storedKey(`scroll.${key}`)
}

function session(): Storage | undefined {
    try {
        return globalThis.sessionStorage
    } catch {
        return undefined
    }
}

/** Whether a kept value is a place to scroll to. */
function isPlace(value: unknown): value is ScrollPlace {
    const place = value as ScrollPlace | null
    return typeof place === 'object' && place !== null && Number.isFinite(place.top) && Number.isFinite(place.left)
}

/** Notes where a scroller under `key` is now; `keepScroll` writes it to session storage. */
export function rememberScroll(key: string, place: ScrollPlace): void {
    places.set(full(key), place)
}

/**
 * Where a scroller under `key` was left this session: from this page's memory, or else from
 * session storage, so a reload finds it too. Undefined where it was never left.
 */
export function recallScroll(key: string): ScrollPlace | undefined {
    const name = full(key)
    const held = places.get(name)
    if (held !== undefined) return held
    try {
        const raw = session()?.getItem(name) ?? null
        const value: unknown = raw === null ? null : JSON.parse(raw)
        return isPlace(value) ? value : undefined
    } catch {
        return undefined
    }
}

/** Writes the place noted under `key` to session storage, where it can be; memory holds it either way. */
export function keepScroll(key: string): void {
    const name = full(key)
    const place = places.get(name)
    if (place === undefined) return
    try {
        session()?.setItem(name, JSON.stringify(place))
    } catch {
        // Storage refused (a private window, blocked site data, full): the page's memory holds it.
    }
}
