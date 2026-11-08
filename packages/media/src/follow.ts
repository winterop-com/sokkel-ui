/**
 * Where a scroller goes to keep a row in view, as the playing row of a list or the line being sung
 * moves on. Pure, so the choice has tests and `useFollow` only measures and scrolls.
 */

/** How long following waits after the reader last scrolled, in milliseconds. */
export const FOLLOW_PAUSE = 4000

/** A stretch along the scroller's content: where it starts and how tall it is, in pixels. */
export interface Stretch {
    top: number
    height: number
}

/**
 * Where the scroller's top goes so `row` is centered in `view`, held between 0 and `max`, or
 * `undefined` when it need not move: under `reveal`, while the row is wholly in view; under
 * `center`, while the row is already centered.
 */
export function followTop(row: Stretch, view: Stretch, max: number, mode: 'reveal' | 'center'): number | undefined {
    if (mode === 'reveal' && row.top >= view.top && row.top + row.height <= view.top + view.height) return undefined
    const top = Math.round(Math.min(Math.max(0, row.top + row.height / 2 - view.height / 2), Math.max(0, max)))
    return Math.abs(top - view.top) < 1 ? undefined : top
}
