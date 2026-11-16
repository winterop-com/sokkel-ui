/**
 * What every example's Electron shell does to keep its window to the app: links that leave the app
 * open in the system browser only when they are web or mail links, the window never navigates away
 * from the app's own page, and the page is granted only full screen and writing to the clipboard.
 * The shell passes Electron's objects in, so this file needs no Electron of its own.
 */

/** The schemes a link may hand to the system: the web and mail, never `file:` or an app's own handler. */
const OUTSIDE = new Set(['https:', 'http:', 'mailto:'])

/** What the page may be granted; every other request is refused. */
const GRANTED = new Set(['fullscreen', 'clipboard-sanitized-write'])

interface Contents {
    setWindowOpenHandler(handler: (details: { url: string }) => { action: 'deny' }): void
    on(event: 'will-navigate' | 'will-redirect', listener: (event: { preventDefault(): void }, url: string) => void): void
    session: {
        setPermissionRequestHandler(handler: (contents: unknown, permission: string, callback: (granted: boolean) => void) => void): void
    }
}

/** Whether `url` is a link the system may open: a web or mail address, read as a URL. */
export function opensOutside(url: string): boolean {
    try {
        return OUTSIDE.has(new URL(url).protocol)
    } catch {
        return false
    }
}

/** Whether `url` is the app's own page at `page` (a file URL), whatever its hash or query. */
export function isOwnPage(url: string, page: string): boolean {
    try {
        const at = new URL(url)
        const own = new URL(page)
        return at.protocol === own.protocol && at.host === own.host && at.pathname === own.pathname
    } catch {
        return false
    }
}

/**
 * Keeps a window's contents to the app at `page`, the file URL it loads: a new window opens in the
 * system browser through `openExternal` when it is a web or mail link and nowhere otherwise, a
 * navigation away from the page is stopped (and opened the same way), and only full screen and the
 * clipboard are granted.
 */
export function keepToTheApp(contents: Contents, page: string, openExternal: (url: string) => Promise<void>): void {
    const outside = (url: string) => {
        if (opensOutside(url)) void openExternal(url).catch(() => undefined)
    }
    contents.setWindowOpenHandler(({ url }) => {
        outside(url)
        return { action: 'deny' }
    })
    const stay = (event: { preventDefault(): void }, url: string) => {
        if (isOwnPage(url, page)) return
        event.preventDefault()
        outside(url)
    }
    contents.on('will-navigate', stay)
    contents.on('will-redirect', stay)
    contents.session.setPermissionRequestHandler((_contents, permission, callback) => callback(GRANTED.has(permission)))
}
