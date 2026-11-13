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

/** How long a return waits for what it scrolls to load before it gives up on the place, in milliseconds. */
export const SCROLL_WAIT = 10_000

/**
 * Puts a scroller back at `wanted` and holds it there while what it scrolls loads, until the place
 * is reached, the person moves it, or `wait` runs out. It follows the scroller's own size, its
 * children's, and every change below it (rows added, text set, an image loaded), so a page of fixed
 * height whose content arrives after it is drawn is put back too. `onSettled` hears when the wait
 * ends. Returns what stops it.
 */
export function holdScroll(
    area: HTMLElement,
    wanted: ScrollPlace,
    { wait = SCROLL_WAIT, onSettled }: { wait?: number; onSettled?: () => void } = {},
): () => void {
    let pending = true
    const stops: (() => void)[] = []
    const settle = () => {
        if (!pending) return
        pending = false
        for (const stop of stops.splice(0)) stop()
        onSettled?.()
    }
    const place = () => {
        if (!pending) return
        area.scrollTop = wanted.top
        area.scrollLeft = wanted.left
        if (Math.abs(area.scrollTop - wanted.top) <= 1 && Math.abs(area.scrollLeft - wanted.left) <= 1) settle()
    }
    place()
    if (!pending) return () => undefined
    // The person moving it ends the wait for the place to be reached.
    const intents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    for (const intent of intents) {
        area.addEventListener(intent, settle, { passive: true })
        stops.push(() => area.removeEventListener(intent, settle))
    }
    // An image or a frame below it finishing its load grows it without a change to the tree.
    area.addEventListener('load', place, true)
    stops.push(() => area.removeEventListener('load', place, true))
    if (typeof ResizeObserver !== 'undefined') {
        const sized = new ResizeObserver(place)
        for (const element of [area, ...Array.from(area.children)]) sized.observe(element)
        stops.push(() => sized.disconnect())
    }
    if (typeof MutationObserver !== 'undefined') {
        // Content set below a box of fixed height overflows it without resizing it: the tree changing is the sign.
        let height = area.scrollHeight
        const changed = new MutationObserver(() => {
            if (area.scrollHeight === height) return
            height = area.scrollHeight
            place()
        })
        changed.observe(area, { childList: true, subtree: true, characterData: true, attributes: true })
        stops.push(() => changed.disconnect())
    }
    const timer = setTimeout(settle, wait)
    stops.push(() => clearTimeout(timer))
    return settle
}
