import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { app, BrowserWindow, ipcMain, shell } from 'electron'

import { keepToTheApp } from '../../../shared/electron'

/** The built web example, loaded from disk; its asset paths are relative, so file:// serves them. */
const page = join(import.meta.dirname, '..', '..', 'web', 'dist', 'index.html')
const pageUrl = pathToFileURL(page).href

/** adsb.lol's readsb v2 API: the only host the live feed reads, and the widest circle it answers for, in nautical miles. */
const API = 'https://api.adsb.lol/v2/point'
const MAX_RADIUS = 250
/** The fewest milliseconds between two reads, whatever the page asks: the API's fair use. */
const LEAST_APART = 10_000

let lastRead = 0

/**
 * Reads the aircraft within `radius` nautical miles of a point for the page. adsb.lol answers
 * without CORS headers, so the page cannot read it itself; the main process can. Only the page this
 * shell opened may ask, only for this one endpoint, and never more than once in ten seconds.
 */
async function point(lat: unknown, lon: unknown, radius: unknown) {
    if (typeof lat !== 'number' || typeof lon !== 'number' || typeof radius !== 'number')
        return { ok: false, error: 'The live feed was asked for a place it cannot read.' }
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !Number.isFinite(radius))
        return { ok: false, error: 'The live feed was asked for a place it cannot read.' }
    const wait = lastRead + LEAST_APART - Date.now()
    if (wait > 0)
        return {
            ok: false,
            error: `The live feed was read less than ten seconds ago; it is read again in ${String(Math.ceil(wait / 1000))} s.`,
        }
    lastRead = Date.now()
    const miles = Math.max(1, Math.min(MAX_RADIUS, Math.round(radius)))
    const url = `${API}/${lat.toFixed(4)}/${lon.toFixed(4)}/${String(miles)}`
    try {
        const answer = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { accept: 'application/json' } })
        const left = Number(answer.headers.get('x-ratelimit-remaining')?.split(',')[0])
        const remaining = Number.isFinite(left) ? left : undefined
        if (answer.status === 429) return { ok: false, error: 'adsb.lol says this user has made too many reads today.' }
        if (!answer.ok) return { ok: false, error: `adsb.lol answered ${String(answer.status)} ${answer.statusText}.` }
        return { ok: true, body: (await answer.json()) as unknown, remaining }
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'TimeoutError'
        return { ok: false, error: timedOut ? 'adsb.lol did not answer within 15 seconds.' : 'adsb.lol could not be reached.' }
    }
}

function open(): void {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 360,
        title: 'Flight watch',
        // The page draws the title strip itself; macOS keeps its window buttons over it.
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        // The buttons centered on the page's 46px top strip, as the Tauri shell has them.
        trafficLightPosition: { x: 12, y: 16 },
        // The preload tells the page when the window enters or leaves full screen, and carries its reads of the live feed.
        webPreferences: { contextIsolation: true, sandbox: true, preload: join(import.meta.dirname, 'preload.cjs') },
    })
    const tellFullscreen = () => window.webContents.send('tidevann:fullscreen', window.isFullScreen())
    window.on('enter-full-screen', tellFullscreen)
    window.on('leave-full-screen', tellFullscreen)
    window.webContents.on('did-finish-load', tellFullscreen)
    // Web and mail links open in the system browser, the window stays on the app, and the page is granted only what it uses.
    keepToTheApp(window.webContents, pageUrl, (url) => shell.openExternal(url))
    void window.loadFile(page)
}

void app.whenReady().then(() => {
    ipcMain.handle('tidevann:flights:point', (event, lat: unknown, lon: unknown, radius: unknown) => {
        if (event.senderFrame?.url.split('#')[0] !== pageUrl) return { ok: false, error: 'Only the watch may read the live feed.' }
        return point(lat, lon, radius)
    })
    open()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) open()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
