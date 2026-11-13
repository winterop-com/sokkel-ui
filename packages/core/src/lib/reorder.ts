/**
 * The arithmetic of moving things in an order, apart from any drag, so an app applies what a
 * sortable part reports without loading the drag engine.
 */

/** The list with the item at `from` taken out and put back at `to`; the same list when either is out of range. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
    const next = [...list]
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return next
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
}

/** The list with `item` put in at `index`, held within the list's ends. */
export function insertItem<T>(list: readonly T[], item: T, index: number): T[] {
    const next = [...list]
    next.splice(Math.max(0, Math.min(index, list.length)), 0, item)
    return next
}

/**
 * Where a one-step move from `index` lands, `by` places along a list of `count` items, or
 * undefined when it would leave the list.
 */
export function stepTo(index: number, by: number, count: number): number | undefined {
    const to = index + by
    return to < 0 || to >= count || by === 0 ? undefined : to
}
