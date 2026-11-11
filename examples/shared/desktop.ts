import { desktopShell, type DesktopWindow } from '@winterop-com/sokkel-ui/lib/desktop'
import { useMemo, useSyncExternalStore } from 'react'

/** What Tauri v2 puts on every window, enough to call its window plugin without its API package. */
interface TauriInternals {
    invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>
    metadata?: { currentWindow?: { label?: string } }
}

/** What the Electron shell's preload hands the page: the window's own full screen, as it changes. */
interface ElectronWindow {
    fullscreen: () => boolean
    onFullscreen: (listener: (on: boolean) => void) => () => void
}

const electronWindow = () => (window as unknown as { tidevannWindow?: ElectronWindow }).tidevannWindow
const tauriInternals = () => (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__
const tauriLabel = () => tauriInternals()?.metadata?.currentWindow?.label ?? 'main'

/** Whether Tauri's window is in full screen, asked again on every resize, as entering and leaving it resizes the page. */
let tauriFullscreen = false

function followTauriFullscreen(listener: () => void): () => void {
    const tauri = tauriInternals()
    if (tauri === undefined) return () => undefined
    let live = true
    const ask = () => {
        void tauri.invoke('plugin:window|is_fullscreen', { label: tauriLabel() }).then(
            (on) => {
                if (!live || on === tauriFullscreen) return
                tauriFullscreen = on === true
                listener()
            },
            () => undefined,
        )
    }
    ask()
    window.addEventListener('resize', ask)
    return () => {
        live = false
        window.removeEventListener('resize', ask)
    }
}

const followFullscreen = (listener: () => void) => electronWindow()?.onFullscreen(() => listener()) ?? followTauriFullscreen(listener)
const inFullscreen = () => electronWindow()?.fullscreen() ?? tauriFullscreen

/**
 * `desktopWindow()` followed as the window enters and leaves the system's full screen (its green
 * button or ⌃⌘F), which the Electron shell's preload reports and Tauri's window is asked on each
 * resize, so the room for the window's buttons goes while macOS hides them.
 */
export function useDesktopWindow(): DesktopWindow | undefined {
    const base = useMemo(desktopWindow, [])
    const fullscreen = useSyncExternalStore(followFullscreen, inFullscreen, () => false)
    return useMemo(() => (base === undefined ? base : { ...base, fullscreen }), [base, fullscreen])
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
    const tauri = tauriInternals()
    const label = tauriLabel()
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
