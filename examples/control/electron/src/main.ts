import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { app, BrowserWindow, ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from 'electron'

import { isOwnPage, keepToTheApp } from '../../../shared/electron'
import { createControlProxy, type ProxyAnswer } from '../../web/server/proxy.ts'
import { createValve } from '../../web/server/relay.ts'

/** The built web example, loaded from disk; its asset paths are relative, so file:// serves them. */
const page = join(import.meta.dirname, '..', '..', 'web', 'dist', 'index.html')
const pageUrl = pathToFileURL(page).href

/** The one proxy to the public sources, shared by every window. */
const proxy = createControlProxy()

/** Whether a message came from the app's own page, the only one the proxy answers. */
const fromApp = (event: IpcMainEvent | IpcMainInvokeEvent) => event.senderFrame !== null && isOwnPage(event.senderFrame.url, pageUrl)

/** The entries of `value` that are text, when it is an object. */
function texts(value: unknown): Record<string, string> {
    const kept: Record<string, string> = {}
    if (typeof value !== 'object' || value === null) return kept
    for (const [name, text] of Object.entries(value)) if (typeof text === 'string') kept[name] = text
    return kept
}

/** The windows listening to the AIS stream, each with what ends its subscription. */
const listening = new Map<number, () => void>()
/** Each listening window's valve, which holds batches back while the page has not taken the last ones. */
const valves = new Map<number, ReturnType<typeof createValve>>()
/** The windows whose closing already ends their subscription. */
const watched = new Set<number>()

function stopVessels(contents: WebContents): void {
    listening.get(contents.id)?.()
    valves.delete(contents.id)
    listening.delete(contents.id)
}

/** Subscribes a window to the AIS stream, sending it each message until it stops, reloads or closes. */
function startVessels(contents: WebContents): void {
    if (listening.has(contents.id)) return
    const id = contents.id
    // The page says when it has taken a message; while it has not, batches of lines are dropped and not queued.
    const valve = createValve()
    valves.set(id, valve)
    listening.set(
        id,
        proxy.vessels((message) => {
            if (contents.isDestroyed() || !valve.pass(message)) return
            contents.send('control:vessels', message)
        }),
    )
    if (!watched.has(id)) {
        watched.add(id)
        contents.once('destroyed', () => {
            watched.delete(id)
            listening.get(id)?.()
            listening.delete(id)
        })
    }
}

ipcMain.handle('control:get', (event, route: unknown, params: unknown, headers: unknown): Promise<ProxyAnswer> | undefined =>
    fromApp(event) && typeof route === 'string' ? proxy.get(route, texts(params), texts(headers)) : undefined,
)
ipcMain.on('control:vessels:start', (event) => {
    if (fromApp(event)) startVessels(event.sender)
})
ipcMain.on('control:vessels:taken', (event) => {
    if (fromApp(event)) valves.get(event.sender.id)?.taken()
})
ipcMain.on('control:vessels:stop', (event) => {
    if (fromApp(event)) stopVessels(event.sender)
})
ipcMain.on('control:open-wall', (event) => {
    if (fromApp(event)) openWall()
})

/** What every window of the app is given: full screen told to the page, and the window kept to the app. */
function wire(window: BrowserWindow): void {
    const tellFullscreen = () => window.webContents.send('tidevann:fullscreen', window.isFullScreen())
    window.on('enter-full-screen', tellFullscreen)
    window.on('leave-full-screen', tellFullscreen)
    window.webContents.on('did-finish-load', tellFullscreen)
    // A reload starts the page afresh: the stream it asked for stops until it asks again.
    window.webContents.on('did-start-navigation', (details) => {
        if (details.isMainFrame && !details.isSameDocument) stopVessels(window.webContents)
    })
    // Web and mail links open in the system browser, the window stays on the app, and the page is granted only what it uses.
    keepToTheApp(window.webContents, pageUrl, (url) => shell.openExternal(url))
}

/** The preload tells the page when the window enters or leaves full screen, and bridges the proxy. */
const webPreferences = () => ({ contextIsolation: true, sandbox: true, preload: join(import.meta.dirname, 'preload.cjs') })

function open(): void {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 360,
        title: 'Control site',
        // The page draws the title strip itself; macOS keeps its window buttons over it.
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        // Linux and Windows keep the menu bar out of sight over the page's own strip; Alt shows it.
        autoHideMenuBar: true,
        // The buttons centered on the page's 46px top strip, as the Tauri shell has them.
        trafficLightPosition: { x: 12, y: 16 },
        webPreferences: webPreferences(),
    })
    wire(window)
    void window.loadFile(page)
}

/** The wall's window, while one is open. */
let wall: BrowserWindow | undefined

/** Opens the status wall in a plain window of its own, on the same page at `#/wall`, or shows the one already open. */
function openWall(): void {
    if (wall !== undefined && !wall.isDestroyed()) {
        if (wall.isMinimized()) wall.restore()
        wall.focus()
        return
    }
    const window = new BrowserWindow({
        width: 1600,
        height: 900,
        minWidth: 360,
        title: 'Control site wall',
        webPreferences: webPreferences(),
    })
    wall = window
    window.on('closed', () => {
        if (wall === window) wall = undefined
    })
    // The wall keeps the title it was opened with, whatever the page names itself.
    window.on('page-title-updated', (event) => event.preventDefault())
    wire(window)
    void window.loadFile(page, { hash: '/wall' })
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

app.on('will-quit', () => proxy.close())
