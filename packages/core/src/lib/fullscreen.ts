import { useLayoutEffect, useRef } from 'react'

import type { DesktopWindow } from './desktop'

/**
 * Full screen for every part that goes full screen: the player's fullscreen view, `VideoPlayer`, a
 * map, a pane expanded with `fullscreen`. A part asks for it with `enterFullscreen` and leaves with
 * `exitFullscreen`, and follows it through `subscribeFullscreen` and `fullscreenElement`, never
 * through the browser's own calls, so a desktop shell can stand in for them.
 *
 * In a browser this is the browser's full screen: `requestFullscreen`, `document.exitFullscreen`
 * and `fullscreenchange`.
 *
 * In a desktop shell whose webview has no full screen of its own for an element (Tauri on macOS),
 * the app hands the library its window's call once, as `setFullscreen` on the `desktop` it gives
 * `Shell` (or `AppBar`, `SignIn`, or `useDesktopFullscreen` where it draws none of them). Then a
 * part going full screen puts the window in its own full screen through that call, and the part's
 * element covers the window, standing in the top layer where the webview has one, as the
 * browser's full screen puts it there; Escape leaves, as it does in a browser. The window leaving
 * its full screen by its own way (the system's button or menu) lets the element go, once the app
 * reports it through `desktop.fullscreen`.
 *
 * Where a browser has no full screen for an element (an iPhone), the element covers the window
 * the same way, unless the part asks not to.
 */

/** A desktop shell's call that puts its window in its own full screen (`true`) or takes it out (`false`). */
export type WindowFullscreenCall = (on: boolean) => unknown

/** The marker the stylesheet covers the window by, set on an element held full screen without the browser's. */
export const FULLSCREEN_ATTRIBUTE = 'data-fullscreen'

let call: WindowFullscreenCall | undefined
/** Whether the desktop window is in its own full screen, as far as the library knows. */
let windowFull = false
/** Whether the library's own call put the window there, so leaving takes it out again. */
let ours = false
/** The element covering the window, or null. */
let held: Element | null = null
const listeners = new Set<() => void>()

function tell(): void {
    for (const listener of listeners) listener()
}

/** Runs the desktop's call, never letting it throw or reject into the part that asked. */
function run(on: boolean): void {
    try {
        const answer = call?.(on)
        if (answer instanceof Promise) answer.catch(() => undefined)
    } catch {
        // The window stays as it was; the element still covers it.
    }
}

function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !event.defaultPrevented) exitFullscreen()
}

function isRoot(element: Element): boolean {
    return typeof document !== 'undefined' && element === document.documentElement
}

type Layered = Element & { showPopover?: () => void; hidePopover?: () => void }

/** Holds `element` over the window: marked for the stylesheet, in the top layer where there is one. */
function take(element: Element): void {
    if (held === element) return
    if (held !== null) release()
    held = element
    if (isRoot(element)) return
    element.setAttribute(FULLSCREEN_ATTRIBUTE, 'window')
    const layered = element as Layered
    if (typeof layered.showPopover === 'function') {
        try {
            element.setAttribute('popover', 'manual')
            layered.showPopover()
        } catch {
            element.removeAttribute('popover')
        }
    }
    document.addEventListener('keydown', onKey)
}

/** Lets the held element go back where it stands. */
function release(): void {
    const element = held
    held = null
    if (element === null || isRoot(element)) return
    document.removeEventListener('keydown', onKey)
    element.removeAttribute(FULLSCREEN_ATTRIBUTE)
    if (element.hasAttribute('popover')) {
        try {
            ;(element as Layered).hidePopover?.()
        } catch {
            // Already hidden.
        }
        element.removeAttribute('popover')
    }
}

/**
 * Hands the library a desktop shell's own full screen, called in place of the browser's from then
 * on; undefined takes it back. Answers with the way to take this one back. `Shell`, `AppBar` and
 * `SignIn` do this with `desktop.setFullscreen`.
 */
export function setDesktopFullscreen(next: WindowFullscreenCall | undefined): () => void {
    call = next
    return () => {
        if (call === next) call = undefined
    }
}

/**
 * Tells the library whether the desktop window is in its own full screen, however it got there: a
 * window leaving it lets go of the element covering it, as the browser's full screen does when it is
 * left. `Shell`, `AppBar` and `SignIn` report `desktop.fullscreen` as it changes.
 */
export function reportDesktopFullscreen(on: boolean): void {
    if (on === windowFull) return
    windowFull = on
    if (!on) {
        ours = false
        if (held !== null && call !== undefined) release()
    }
    tell()
}

export interface EnterFullscreenOptions {
    /**
     * Whether the element covers the window where neither the desktop nor the browser can put it in
     * full screen, or the browser refuses; true unless the part has a way of its own, as a video on
     * an iPhone has.
     */
    cover?: boolean
}

/**
 * Puts `element` in full screen: the desktop window's own, the element covering the window, when
 * the app handed the library the desktop's call, and the browser's otherwise. The page's root
 * element (`document.documentElement`) puts the whole page in full screen and is never covered.
 * Call it from the press that asks, as the browser wants. Answers false only where nothing could
 * be done and `cover` is false.
 */
export function enterFullscreen(element: Element, { cover = true }: EnterFullscreenOptions = {}): boolean {
    if (call !== undefined) {
        take(element)
        if (!windowFull) {
            windowFull = true
            ours = true
            run(true)
        }
        tell()
        return true
    }
    const covered = () => {
        if (!cover || isRoot(element)) return
        take(element)
        tell()
    }
    if (typeof element.requestFullscreen === 'function') {
        try {
            Promise.resolve(element.requestFullscreen()).catch(covered)
        } catch {
            covered()
        }
        return true
    }
    if (!cover || isRoot(element)) return false
    covered()
    return true
}

/**
 * Leaves full screen, the desktop's or the browser's. Given `element`, only when that element is the
 * one in full screen, as a part leaving does when it closes or unmounts.
 */
export function exitFullscreen(element?: Element): void {
    if (held !== null && (element === undefined || element === held)) {
        release()
        if (ours) {
            ours = false
            windowFull = false
            run(false)
        }
        tell()
        return
    }
    if (typeof document === 'undefined') return
    const current = document.fullscreenElement
    if (current === null || current === undefined || (element !== undefined && element !== current)) return
    try {
        Promise.resolve(document.exitFullscreen()).catch(() => undefined)
    } catch {
        // Already left.
    }
}

/** The element in full screen now, the desktop's or the browser's, or null. */
export function fullscreenElement(): Element | null {
    if (held !== null) return held
    return typeof document === 'undefined' ? null : (document.fullscreenElement ?? null)
}

/** Whether the page is in full screen: the browser's, or the desktop window's own. */
export function isFullscreen(): boolean {
    return windowFull || (typeof document !== 'undefined' && (document.fullscreenElement ?? null) !== null)
}

/** Calls `listener` whenever full screen is entered or left, the desktop's or the browser's; answers with the way to stop. */
export function subscribeFullscreen(listener: () => void): () => void {
    listeners.add(listener)
    if (typeof document !== 'undefined') document.addEventListener('fullscreenchange', listener)
    return () => {
        listeners.delete(listener)
        if (typeof document !== 'undefined') document.removeEventListener('fullscreenchange', listener)
    }
}

/**
 * Hands every part that goes full screen the desktop window's own full screen while mounted:
 * `desktop.setFullscreen` stands in for the browser's, and `desktop.fullscreen` says when the window
 * left it by its own way. `Shell`, `AppBar` and `SignIn` call it with their `desktop`; an app that
 * draws none of them calls it once at its root.
 */
export function useDesktopFullscreen(desktop: DesktopWindow | undefined): void {
    const latest = useRef(desktop?.setFullscreen)
    useLayoutEffect(() => {
        latest.current = desktop?.setFullscreen
    })
    const given = desktop?.setFullscreen !== undefined
    useLayoutEffect(() => {
        if (!given) return
        return setDesktopFullscreen((on) => latest.current?.(on))
    }, [given])
    const reported = desktop?.fullscreen
    useLayoutEffect(() => {
        if (reported !== undefined) reportDesktopFullscreen(reported)
    }, [reported])
}
