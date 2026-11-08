import { useEffect, useRef, type RefObject } from 'react'

import { inertOutside, openOverlay } from '../lib/overlay'

/** What an overlay does while it is open. */
export interface OverlayOptions {
    /** Called on Escape while this overlay is the one on top; Escape does nothing without it. */
    onClose?: () => void
    /** Whether focus goes back to where it was when the overlay closes. On unless turned off. */
    restoreFocus?: boolean
    /** Whether everything on the page outside the overlay is inert while it is open. On unless turned off. */
    inert?: boolean
}

/**
 * Makes an app's own overlay (a drawer, a full-screen view, a sheet drawn without a dialog) behave
 * as a dialog does while `open`: the rest of the page is inert, so neither the keyboard nor the
 * pointer reaches what is under it; focus moves into the overlay (given `tabIndex={-1}` when it has
 * none) unless it is already there; Escape calls `onClose` when this overlay is the one on top; and
 * on closing focus returns to where it was, if that is still on the page. Keys bound with
 * `useShortcuts` stay quiet meanwhile, unless a binding asks to be heard over dialogs.
 *
 * Returns the ref the overlay's outermost element takes.
 */
export function useOverlay<T extends HTMLElement = HTMLDivElement>(
    open: boolean,
    { onClose, restoreFocus = true, inert = true }: OverlayOptions = {},
): RefObject<T | null> {
    const ref = useRef<T | null>(null)
    const close = useRef(onClose)
    useEffect(() => {
        close.current = onClose
    })
    useEffect(() => {
        if (!open) return undefined
        const element = ref.current
        const layer = openOverlay(element)
        const opener =
            document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
        const undo = inert && element !== null ? inertOutside(element) : undefined
        if (element !== null && !element.contains(document.activeElement)) {
            if (!element.hasAttribute('tabindex')) element.tabIndex = -1
            element.focus({ preventScroll: true })
        }
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented || !layer.top() || close.current === undefined) return
            // A popup opened from inside the overlay (a menu, a dialog) closes first, on its own.
            const target = event.target
            if (element !== null && target instanceof Node && target !== document.body && !element.contains(target)) return
            event.preventDefault()
            close.current()
        }
        document.addEventListener('keydown', escape)
        return () => {
            document.removeEventListener('keydown', escape)
            layer.close()
            // Back after the inert goes: focus on an inert element is refused.
            undo?.()
            if (restoreFocus && opener?.isConnected === true) opener.focus({ preventScroll: true })
        }
    }, [open, inert, restoreFocus])
    return ref
}
