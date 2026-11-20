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

/** The live feed, read by the main process, since adsb.lol lets no page read it directly. */
contextBridge.exposeInMainWorld('tidevannFlights', {
    point: (lat: number, lon: number, radius: number): Promise<unknown> => ipcRenderer.invoke('tidevann:flights:point', lat, lon, radius),
})
