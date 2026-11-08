import { join } from 'node:path'

import { app, BrowserWindow, shell } from 'electron'

/** The built web example, loaded from disk; its asset paths are relative, so file:// serves them. */
const page = join(import.meta.dirname, '..', '..', 'web', 'dist', 'index.html')

function open(): void {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 360,
        title: 'Tasks',
        // The page draws the title strip itself; macOS keeps its window buttons over it.
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: { contextIsolation: true, sandbox: true },
    })
    // Links that leave the app open in the system browser, not in a second app window.
    window.webContents.setWindowOpenHandler(({ url }) => {
        void shell.openExternal(url)
        return { action: 'deny' }
    })
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
