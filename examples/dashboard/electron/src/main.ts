import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { app, BrowserWindow, shell } from 'electron'

import { keepToTheApp } from '../../../shared/electron'

/** The built web example, loaded from disk; its asset paths are relative, so file:// serves them. */
const page = join(import.meta.dirname, '..', '..', 'web', 'dist', 'index.html')

function open(): void {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 360,
        title: 'Dashboard',
        // The page draws the title strip itself; macOS keeps its window buttons over it.
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        // Linux and Windows keep the menu bar out of sight over the page's own strip; Alt shows it.
        autoHideMenuBar: true,
        // The buttons centered on the page's 46px top strip, as the Tauri shell has them.
        trafficLightPosition: { x: 12, y: 16 },
        // The preload tells the page when the window enters or leaves full screen, where macOS hides its buttons.
        webPreferences: { contextIsolation: true, sandbox: true, preload: join(import.meta.dirname, 'preload.cjs') },
    })
    const tellFullscreen = () => window.webContents.send('tidevann:fullscreen', window.isFullScreen())
    window.on('enter-full-screen', tellFullscreen)
    window.on('leave-full-screen', tellFullscreen)
    window.webContents.on('did-finish-load', tellFullscreen)
    // Web and mail links open in the system browser, the window stays on the app, and the page is granted only what it uses.
    keepToTheApp(window.webContents, pathToFileURL(page).href, (url) => shell.openExternal(url))
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
