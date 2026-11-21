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

/** The AIS messages the main process sends, and the page's subscriptions to them. */
const vesselListeners = new Set<(message: unknown) => void>()

ipcRenderer.on('control:vessels', (_event, message: unknown) => {
    for (const listener of vesselListeners) listener(message)
    // Tells the main process the message was taken, so it sends the next batch and queues none behind a busy page.
    ipcRenderer.send('control:vessels:taken')
})

/**
 * The control site's bridge to the proxy in the main process: one route's answer, the AIS stream
 * (started with the first listener and stopped after the last leaves), and the wall in a window of
 * its own.
 */
contextBridge.exposeInMainWorld('tidevannControl', {
    get: (route: string, params?: Record<string, string>, headers?: Record<string, string>) =>
        ipcRenderer.invoke('control:get', route, { ...params }, { ...headers }) as Promise<unknown>,
    vessels: (listener: (message: unknown) => void) => {
        // Each subscription is its own entry, so one function may listen twice.
        const entry = (message: unknown) => listener(message)
        vesselListeners.add(entry)
        if (vesselListeners.size === 1) ipcRenderer.send('control:vessels:start')
        return () => {
            if (vesselListeners.delete(entry) && vesselListeners.size === 0) ipcRenderer.send('control:vessels:stop')
        }
    },
    openWall: () => ipcRenderer.send('control:open-wall'),
})
