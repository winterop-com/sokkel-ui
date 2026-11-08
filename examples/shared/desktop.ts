import { desktopShell, type DesktopWindow } from '@winterop-com/sokkel-ui/lib/desktop'

/** What Tauri v2 puts on every window, enough to call its window plugin without its API package. */
interface TauriInternals {
    invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>
    metadata?: { currentWindow?: { label?: string } }
}

/**
 * The window the app stands in when a desktop shell hides its title bar (Electron's `hiddenInset`,
 * Tauri's `Overlay`), or undefined in a browser. macOS draws its window buttons over the page, so
 * the frame leaves them room there.
 */
export function desktopWindow(): DesktopWindow | undefined {
    const shell = desktopShell()
    const mac = navigator.userAgent.includes('Mac')
    if (shell === 'electron') return { trafficLights: mac }
    if (shell !== 'tauri') return undefined
    const tauri = (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__
    const label = tauri?.metadata?.currentWindow?.label ?? 'main'
    const call = (command: string, args: Record<string, unknown> = {}) => {
        void tauri?.invoke(`plugin:window|${command}`, { label, ...args }).catch(() => undefined)
    }
    return {
        trafficLights: mac,
        // WKWebView ignores `app-region`, so the strip asks the window to start its own drag.
        onWindowDrag: () => call('start_dragging'),
        onWindowZoom: () => call('toggle_maximize'),
        setFullscreen: (on) => call('set_fullscreen', { value: on }),
    }
}
