/**
 * How `DataTable` windows stacked cards that grow to their text: where each card starts by the
 * heights measured so far, which cards a view draws, and the measuring of those drawn. A table
 * fetches it the first time its stacked cards grow; it imports nothing, so loading it later splits
 * none of the page's start into chunks.
 */

/**
 * Where each card starts, `gap` below the one before it, each as tall as last measured (`heights`,
 * by key) or `estimate` until it is; one more entry says where the last ends.
 */
export function cardTops(keys: readonly string[], heights: ReadonlyMap<string, number>, estimate: number, gap: number): number[] {
    const tops = [0]
    for (const key of keys) tops.push(tops[tops.length - 1] + (heights.get(key) ?? estimate) + gap)
    return tops
}

/** How many of `tops` lie below `at`, found by halving. */
function below(tops: readonly number[], at: number): number {
    let low = 0
    let high = tops.length
    while (low < high) {
        const middle = (low + high) >> 1
        if (tops[middle] < at) low = middle + 1
        else high = middle
    }
    return low
}

/** The cards of `tops` drawn for a view from `top`, `height` tall: those it shows and `over` either side. */
export function cardRange(tops: readonly number[], top: number, height: number, over: number): { first: number; last: number } {
    const count = tops.length - 1
    return {
        first: Math.max(0, below(tops, top + 1) - 1 - over),
        last: Math.min(count, below(tops, top + height) + over),
    }
}

/**
 * Measures the cards drawn in `box` (each marked with its key in `data-row` and its place in
 * `data-card`) into `heights`, and says how far the view must move to keep what is in it put: by how
 * much the cards wholly above it changed. Undefined when no card changed.
 */
export function measureCards(
    box: HTMLElement,
    tops: readonly number[],
    heights: Map<string, number>,
    estimate: number,
    gap: number,
): number | undefined {
    let moved: number | undefined
    for (const card of box.querySelectorAll<HTMLElement>('[data-card]')) {
        const key = card.dataset.row ?? ''
        const was = heights.get(key) ?? estimate
        const now = card.offsetHeight
        if (now <= 0 || now === was) continue
        heights.set(key, now)
        moved = (moved ?? 0) + (tops[Number(card.dataset.card)] + was + gap <= box.scrollTop ? now - was : 0)
    }
    return moved
}
