import { contextBridge, ipcRenderer } from 'electron'

/** The window's full screen as the main process last told it, and the page's listeners for it. */
let fullscreen = false
const listeners = new Set<(on: boolean) => void>()

ipcRenderer.on('tidevann:fullscreen', (_event, on: boolean) => {
    fullscreen = on
    for (const listener of listeners) listener(on)
})

/** What the page reads of its window: whether it is in full screen, and a call each time that changes. */
contextBridge.exposeInMainWorld('tidevannWindow', {
    fullscreen: () => fullscreen,
    onFullscreen: (listener: (on: boolean) => void) => {
        listeners.add(listener)
        return () => {
            listeners.delete(listener)
        }
    },
})

/** The readings of this machine's connections the main process sends, and the page's listeners for them. */
const readers = new Set<(reading: unknown) => void>()

ipcRenderer.on('network:reading', (_event, reading: unknown) => {
    for (const reader of readers) reader(reading)
})

/**
 * The network watch's bridge: whether GeoLite2 is there and where addresses are, read in the main
 * process, and this machine's connections, read there on an interval once the page asks.
 */
contextBridge.exposeInMainWorld('tidevannNetwork', {
    geolite: () => ipcRenderer.invoke('network:geolite') as Promise<unknown>,
    locate: (addresses: readonly string[]) => ipcRenderer.invoke('network:locate', [...addresses]) as Promise<unknown>,
    start: (interval: number) => ipcRenderer.send('network:start', interval),
    stop: () => ipcRenderer.send('network:stop'),
    onReading: (listener: (reading: unknown) => void) => {
        readers.add(listener)
        return () => {
            readers.delete(listener)
        }
    },
})
