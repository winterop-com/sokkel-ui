import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { app, BrowserWindow, ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from 'electron'

import { isOwnPage, keepToTheApp } from '../../../shared/electron'
import { MOST_ADDRESSES, openGeolite } from '../../web/server/geolite.ts'
import { readConnections } from './connections'

/** The built web example, loaded from disk; its asset paths are relative, so file:// serves them. */
const page = join(import.meta.dirname, '..', '..', 'web', 'dist', 'index.html')
const pageUrl = pathToFileURL(page).href

/** Where `scripts/geolite.sh` puts the GeoLite2 City file, or the file `TIDEVANN_GEOLITE` names. */
const geolite = openGeolite(process.env.TIDEVANN_GEOLITE ?? join(import.meta.dirname, '..', '..', 'geolite', 'GeoLite2-City.mmdb'))

/** How often the page may ask for a reading, in milliseconds. */
const FASTEST = 1000
const SLOWEST = 60_000

/** Whether a message came from the app's own page, the only one the network watch answers. */
const fromApp = (event: IpcMainEvent | IpcMainInvokeEvent) => event.senderFrame !== null && isOwnPage(event.senderFrame.url, pageUrl)

/** The readings running, one for each window that asked. */
const readings = new Map<number, { timer: ReturnType<typeof setInterval>; busy: boolean }>()
/** The windows whose closing already stops their readings. */
const watched = new Set<number>()

function stopReading(contents: WebContents): void {
    const running = readings.get(contents.id)
    if (running === undefined) return
    clearInterval(running.timer)
    readings.delete(contents.id)
}

/** Reads this machine's connections every `interval`, placing their remote ends, and sends each reading to the window. */
function startReading(contents: WebContents, interval: number): void {
    stopReading(contents)
    const running = { timer: setInterval(() => void read(), interval), busy: false }
    readings.set(contents.id, running)
    const read = async () => {
        // A reading still running is let finish rather than started again.
        if (running.busy) return
        running.busy = true
        const at = Date.now()
        let reading
        try {
            const { tool, records } = await readConnections()
            const remotes = [...new Set(records.map((record) => record.remoteAddress))].slice(0, MOST_ADDRESSES)
            reading = { at, tool, records, places: geolite.locate(remotes) }
        } catch (error) {
            reading = {
                at,
                records: [],
                places: {},
                problem: error instanceof Error ? error.message : 'The connections could not be read.',
            }
        }
        running.busy = false
        if (!contents.isDestroyed() && readings.get(contents.id) === running) contents.send('network:reading', reading)
    }
    void read()
    if (!watched.has(contents.id)) {
        watched.add(contents.id)
        const id = contents.id
        contents.once('destroyed', () => {
            watched.delete(id)
            const left = readings.get(id)
            if (left !== undefined) clearInterval(left.timer)
            readings.delete(id)
        })
    }
}

ipcMain.handle('network:geolite', (event) => (fromApp(event) ? geolite.status() : undefined))
ipcMain.handle('network:locate', (event, addresses: unknown) =>
    fromApp(event) && Array.isArray(addresses) ? geolite.locate(addresses.slice(0, MOST_ADDRESSES)) : {},
)
ipcMain.on('network:start', (event, interval: unknown) => {
    if (!fromApp(event)) return
    const every = typeof interval === 'number' && Number.isFinite(interval) ? Math.min(SLOWEST, Math.max(FASTEST, interval)) : 5000
    startReading(event.sender, every)
})
ipcMain.on('network:stop', (event) => {
    if (fromApp(event)) stopReading(event.sender)
})

function open(): void {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 360,
        title: 'Network watch',
        // The page draws the title strip itself; macOS keeps its window buttons over it.
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        // Linux and Windows keep the menu bar out of sight over the page's own strip; Alt shows it.
        autoHideMenuBar: true,
        // The buttons centered on the page's 46px top strip, as the Tauri shell has them.
        trafficLightPosition: { x: 12, y: 16 },
        // The preload tells the page when the window enters or leaves full screen, and bridges the network watch.
        webPreferences: { contextIsolation: true, sandbox: true, preload: join(import.meta.dirname, 'preload.cjs') },
    })
    const tellFullscreen = () => window.webContents.send('tidevann:fullscreen', window.isFullScreen())
    window.on('enter-full-screen', tellFullscreen)
    window.on('leave-full-screen', tellFullscreen)
    window.webContents.on('did-finish-load', tellFullscreen)
    // A reload starts the page afresh: the readings it asked for stop until it asks again.
    window.webContents.on('did-start-navigation', (details) => {
        if (details.isMainFrame && !details.isSameDocument) stopReading(window.webContents)
    })
    // Web and mail links open in the system browser, the window stays on the app, and the page is granted only what it uses.
    keepToTheApp(window.webContents, pageUrl, (url) => shell.openExternal(url))
    void window.loadFile(page)
}

void app.whenReady().then(() => {
    open()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) open()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
