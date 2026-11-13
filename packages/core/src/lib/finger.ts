import { isValidElement } from 'react'

/**
 * A hit area a finger square, centered on a small trigger below `md`, drawn as an invisible
 * `::after` so the trigger keeps its size and the row around it its height.
 */
export const FINGER_HIT =
    'relative max-md:after:absolute max-md:after:top-1/2 max-md:after:left-1/2 max-md:after:size-finger max-md:after:-translate-x-1/2 max-md:after:-translate-y-1/2'

// The hit area makes its trigger `relative` and draws on its `::after`: an element placed by its own
// position, or drawing its own `::after`, keeps both.
const OWN_PLACE = /(^|\s|:)(absolute|fixed|sticky|static)(\s|$)|(^|\s)([\w-]+:)*after:/

/**
 * Whether a trigger takes the finger hit area: one the library draws itself, or one given a
 * `render` element whose own classes neither place it nor draw its `::after`. A trigger whose
 * classes are a function, or whose `render` is a function, is left as it is.
 */
export function takesFinger(render: unknown, className: unknown): boolean {
    if (className !== undefined && typeof className !== 'string') return false
    if (render === undefined) return true
    if (!isValidElement<{ className?: unknown }>(render)) return false
    const own = render.props.className
    if (own === undefined) return true
    return typeof own === 'string' && !OWN_PLACE.test(own)
}
