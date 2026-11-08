/** The overlays of an app's own that are open, the last opened on top, each with its element. */
const open: { element: Element | null }[] = []

/** Whether an overlay opened through `useOverlay` is open, so the keys behind it stay quiet. */
export function overlaysOpen(): boolean {
    return open.length > 0
}

/** One open overlay's place among the others: whether it is on top, and the way to close it. */
export interface OverlayLayer {
    top: () => boolean
    close: () => void
}

/** The element of the overlay on top, or null where none is open or it has no element. */
export function topOverlay(): Element | null {
    return open.at(-1)?.element ?? null
}

/** Puts an overlay on top of those open; `close` takes it away wherever it is. */
export function openOverlay(element: Element | null = null): OverlayLayer {
    const layer = { element }
    open.push(layer)
    return {
        top: () => open[open.length - 1] === layer,
        close: () => {
            const at = open.indexOf(layer)
            if (at !== -1) open.splice(at, 1)
        },
    }
}

/** The little of an element `inertOutside` reads and writes, so it can be asked outside a page. */
export interface InertNode {
    tagName?: string
    inert?: boolean
    getAttribute?: (name: string) => string | null
    parentElement?: InertNode | null
    children?: ArrayLike<InertNode>
}

const LEFT_ALONE = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'META', 'HEAD'])

/**
 * Makes everything on the page outside `element` inert: at each level from the element up to the
 * body, every sibling of the way up, so the overlay and what holds it stay live. A sibling already
 * inert, a live region (where a toast speaks) and an element that draws nothing are left alone.
 * Returns the way back, which undoes exactly what it did.
 */
export function inertOutside(element: InertNode): () => void {
    const made: InertNode[] = []
    let node: InertNode | null = element
    while (node?.parentElement !== undefined && node.parentElement !== null) {
        const parent: InertNode = node.parentElement
        for (const sibling of Array.from(parent.children ?? [])) {
            if (sibling === node || sibling.inert === true) continue
            if (LEFT_ALONE.has((sibling.tagName ?? '').toUpperCase())) continue
            const live = sibling.getAttribute?.('aria-live')
            if (live !== null && live !== undefined && live !== 'off') continue
            sibling.inert = true
            made.push(sibling)
        }
        if ((parent.tagName ?? '').toUpperCase() === 'BODY') break
        node = parent
    }
    return () => {
        for (const sibling of made) sibling.inert = false
    }
}
