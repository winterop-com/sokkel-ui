/**
 * A CSS length, such as a token's `var(--density-overlay-inset)`, in pixels as the document
 * resolves it now (inside `within` when given, so a theme scoped to an element counts), for a part
 * that hands a size to an engine. Without a document, or when the length resolves to nothing, it is
 * `fallback`.
 */
export function cssPixels(length: string, fallback = 0, within?: HTMLElement): number {
    if (typeof document === 'undefined' || document.body === null) return fallback
    const probe = document.createElement('div')
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:0;width:${length}`
    ;(within ?? document.body).appendChild(probe)
    const pixels = probe.getBoundingClientRect().width
    probe.remove()
    return pixels > 0 ? pixels : fallback
}
