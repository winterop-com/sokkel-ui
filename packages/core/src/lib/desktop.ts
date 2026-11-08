import type { CSSProperties, MouseEvent } from 'react'

/**
 * How a frame stands in a desktop window whose native title bar is hidden (Electron's
 * `hiddenInset`, Tauri's `Overlay`), so the frame's top strip is the window's only title bar.
 * `Shell`, `AppBar` and `SignIn` take it as `desktop`; the library never imports a desktop shell,
 * so what moves the window is the app's to call.
 *
 * Given at all, the top strip is the window's drag region: it wears `-webkit-app-region: drag`,
 * which Electron's Chromium reads, with every control in it opted out, and it cannot be selected
 * as text.
 */
export interface DesktopWindow {
    /**
     * Room at the strip's start for the window's own buttons, which macOS draws over the page in
     * such a window: `true` for the usual room (`--spacing-traffic-lights`, 80px), or the room in
     * pixels. Leave it off in a browser and off macOS, where nothing is drawn there.
     */
    trafficLights?: boolean | number
    /**
     * Called when the strip is pressed outside its controls, for a webview that ignores
     * `app-region` (WKWebView, so Tauri on macOS): the app starts the window's own drag, such as
     * Tauri's `getCurrentWindow().startDragging()`.
     */
    onWindowDrag?: () => void
    /** Called when the strip is double-clicked outside its controls: the app zooms the window, as a title bar does. */
    onWindowZoom?: () => void
}

/**
 * What a press in the strip does its own job with, so it never moves the window. The library's
 * stylesheet opts the same list out of Electron's drag region; `data-window-no-drag` marks
 * anything else.
 */
export const WINDOW_CONTROLS = [
    'a',
    'button',
    'input',
    'label',
    'select',
    'textarea',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="switch"]',
    '[role="slider"]',
    '[role="tab"]',
    '[role="combobox"]',
    '[role="menuitem"]',
    '[contenteditable="true"]',
    '[data-window-no-drag]',
] as const

const CONTROLS = WINDOW_CONTROLS.join(', ')

/** The pointer button that moves a window; another one is the page's or the window menu's. */
const PRIMARY = 0

/**
 * What a press on `target` does to the window: `drag` or `zoom` (the second press of a double
 * click) when it lands in a `data-window-drag` strip outside its controls, nothing otherwise.
 */
export function windowPress({ button, detail, target }: { button: number; detail: number; target: unknown }): 'drag' | 'zoom' | undefined {
    if (button !== PRIMARY || !isElement(target)) return undefined
    const strip = target.closest('[data-window-drag]')
    if (strip === null) return undefined
    const control = target.closest(CONTROLS)
    if (control !== null && strip.contains(control)) return undefined
    return detail === 2 ? 'zoom' : 'drag'
}

/** Whether a press landed on an element, read by its `closest`: a text node or the window never counts. */
function isElement(target: unknown): target is Pick<Element, 'closest'> {
    return typeof target === 'object' && target !== null && typeof (target as Element).closest === 'function'
}

/**
 * The mouse-down handler a frame puts on its root, which every strip inside it is delegated to:
 * a press calls `onWindowDrag`, a double press `onWindowZoom`. Undefined when the app gave neither.
 */
export function windowPressHandler(desktop: DesktopWindow | undefined): ((event: MouseEvent) => void) | undefined {
    if (desktop?.onWindowDrag === undefined && desktop?.onWindowZoom === undefined) return undefined
    return (event) => {
        const press = windowPress({ button: event.button, detail: event.detail, target: event.target })
        if (press === 'zoom') desktop.onWindowZoom?.()
        else if (press === 'drag') desktop.onWindowDrag?.()
    }
}

/** Whether the frame leaves room for the window's own buttons. */
export function hasTrafficLights(desktop: DesktopWindow | undefined): boolean {
    const lights = desktop?.trafficLights
    return lights === true || (typeof lights === 'number' && lights > 0)
}

/** The style that sets the room for the window's buttons when the app gave it in pixels. */
export function trafficLightsStyle(desktop: DesktopWindow | undefined): CSSProperties | undefined {
    const lights = desktop?.trafficLights
    return typeof lights === 'number' && lights > 0 ? ({ '--spacing-traffic-lights': `${String(lights)}px` } as CSSProperties) : undefined
}

/** The desktop shell a page runs in, read from the globals each one puts on the window. */
export type DesktopShell = 'electron' | 'tauri'

/** Which desktop shell a user agent and the window's globals describe, or undefined for a browser. */
export function desktopShellOf(userAgent: string, globals: object): DesktopShell | undefined {
    if ('__TAURI_INTERNALS__' in globals || '__TAURI__' in globals) return 'tauri'
    return /\belectron\//i.test(userAgent) ? 'electron' : undefined
}

/** The desktop shell this page runs in, or undefined in a browser. */
export function desktopShell(): DesktopShell | undefined {
    if (typeof window === 'undefined') return undefined
    return desktopShellOf(navigator.userAgent, window)
}

/** Whether this page runs in a desktop shell (Electron or Tauri) rather than a browser. */
export function isDesktopShell(): boolean {
    return desktopShell() !== undefined
}
