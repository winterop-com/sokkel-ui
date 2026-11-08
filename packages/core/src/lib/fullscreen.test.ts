import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = (event: { key?: string; defaultPrevented?: boolean }) => void

/** A page as far as full screen touches it: its root, the browser's full screen and the events. */
function fakePage({ browser = true }: { browser?: boolean } = {}) {
    const listeners = new Map<string, Set<Listener>>()
    const fire = (type: string, event: { key?: string; defaultPrevented?: boolean } = {}) => {
        for (const listener of listeners.get(type) ?? []) listener(event)
    }
    const page = {
        fullscreenElement: null as FakeElement | null,
        documentElement: undefined as unknown as FakeElement,
        addEventListener: (type: string, listener: Listener) => {
            const set = listeners.get(type) ?? new Set()
            set.add(listener)
            listeners.set(type, set)
        },
        removeEventListener: (type: string, listener: Listener) => void listeners.get(type)?.delete(listener),
        exitFullscreen: vi.fn(() => {
            page.fullscreenElement = null
            fire('fullscreenchange')
            return Promise.resolve()
        }),
        fire,
        listening: (type: string) => listeners.get(type)?.size ?? 0,
        element: () => new FakeElement(page, browser),
    }
    page.documentElement = page.element()
    return page
}

type Page = ReturnType<typeof fakePage>

/** An element with the browser's full screen (unless the browser has none) and a popover's top layer. */
class FakeElement {
    attributes = new Map<string, string>()
    layered = false
    requestFullscreen?: () => Promise<void>
    constructor(page: Page, browser: boolean) {
        if (browser)
            this.requestFullscreen = vi.fn(() => {
                page.fullscreenElement = this
                page.fire('fullscreenchange')
                return Promise.resolve()
            })
    }
    setAttribute(name: string, value: string) {
        this.attributes.set(name, value)
    }
    removeAttribute(name: string) {
        this.attributes.delete(name)
    }
    hasAttribute(name: string) {
        return this.attributes.has(name)
    }
    getAttribute(name: string) {
        return this.attributes.get(name) ?? null
    }
    showPopover() {
        this.layered = true
    }
    hidePopover() {
        this.layered = false
    }
}

/** The helper fresh for each test, its state held at module level. */
let lib: typeof import('./fullscreen')
let page: Page

const as = (element: FakeElement) => element as unknown as Element

function setUp(options?: { browser?: boolean }) {
    page = fakePage(options)
    vi.stubGlobal('document', page)
}

beforeEach(async () => {
    vi.resetModules()
    lib = await import('./fullscreen')
    setUp()
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('in a browser', () => {
    it("asks the element for the browser's full screen and follows it", () => {
        const element = page.element()
        const heard = vi.fn()
        lib.subscribeFullscreen(heard)
        expect(lib.enterFullscreen(as(element))).toBe(true)
        expect(element.requestFullscreen).toHaveBeenCalledOnce()
        expect(lib.fullscreenElement()).toBe(element)
        expect(lib.isFullscreen()).toBe(true)
        expect(heard).toHaveBeenCalledOnce()
        expect(element.hasAttribute(lib.FULLSCREEN_ATTRIBUTE)).toBe(false)
    })

    it('leaves only for the element in full screen, or for any without one named', () => {
        const element = page.element()
        lib.enterFullscreen(as(element))
        lib.exitFullscreen(as(page.element()))
        expect(page.exitFullscreen).not.toHaveBeenCalled()
        lib.exitFullscreen(as(element))
        expect(page.exitFullscreen).toHaveBeenCalledOnce()
        expect(lib.fullscreenElement()).toBeNull()
        lib.enterFullscreen(as(element))
        lib.exitFullscreen()
        expect(page.exitFullscreen).toHaveBeenCalledTimes(2)
    })

    it('stops telling a listener once it stops', () => {
        const heard = vi.fn()
        const stop = lib.subscribeFullscreen(heard)
        stop()
        lib.enterFullscreen(as(page.element()))
        expect(heard).not.toHaveBeenCalled()
        expect(page.listening('fullscreenchange')).toBe(0)
    })

    it('covers the window where the browser has no full screen for the element, unless asked not to', () => {
        setUp({ browser: false })
        const element = page.element()
        expect(lib.enterFullscreen(as(element), { cover: false })).toBe(false)
        expect(lib.fullscreenElement()).toBeNull()
        expect(lib.enterFullscreen(as(element))).toBe(true)
        expect(lib.fullscreenElement()).toBe(element)
        expect(element.getAttribute(lib.FULLSCREEN_ATTRIBUTE)).toBe('window')
        expect(element.layered).toBe(true)
        // Only the desktop's own full screen counts as the window's.
        expect(lib.isFullscreen()).toBe(false)
        lib.exitFullscreen(as(element))
        expect(element.hasAttribute(lib.FULLSCREEN_ATTRIBUTE)).toBe(false)
        expect(element.layered).toBe(false)
    })

    it('covers the window where the browser refuses', async () => {
        const element = page.element()
        element.requestFullscreen = vi.fn(() => Promise.reject(new Error('refused')))
        lib.enterFullscreen(as(element))
        await Promise.resolve()
        await Promise.resolve()
        expect(lib.fullscreenElement()).toBe(element)
        expect(element.getAttribute(lib.FULLSCREEN_ATTRIBUTE)).toBe('window')
    })
})

describe('through a desktop shell', () => {
    it("puts the window in its own full screen in place of the browser's, the element covering it", () => {
        const window = vi.fn()
        lib.setDesktopFullscreen(window)
        const element = page.element()
        const heard = vi.fn()
        lib.subscribeFullscreen(heard)
        expect(lib.enterFullscreen(as(element))).toBe(true)
        expect(window).toHaveBeenCalledWith(true)
        expect(element.requestFullscreen).not.toHaveBeenCalled()
        expect(lib.fullscreenElement()).toBe(element)
        expect(lib.isFullscreen()).toBe(true)
        expect(element.getAttribute(lib.FULLSCREEN_ATTRIBUTE)).toBe('window')
        expect(element.getAttribute('popover')).toBe('manual')
        expect(element.layered).toBe(true)
        expect(heard).toHaveBeenCalledOnce()

        lib.exitFullscreen(as(element))
        expect(window).toHaveBeenLastCalledWith(false)
        expect(page.exitFullscreen).not.toHaveBeenCalled()
        expect(lib.fullscreenElement()).toBeNull()
        expect(lib.isFullscreen()).toBe(false)
        expect(element.attributes.size).toBe(0)
        expect(element.layered).toBe(false)
        expect(heard).toHaveBeenCalledTimes(2)
    })

    it('leaves on Escape, as the browser does, unless something answered the key first', () => {
        const window = vi.fn()
        lib.setDesktopFullscreen(window)
        lib.enterFullscreen(as(page.element()))
        page.fire('keydown', { key: 'Escape', defaultPrevented: true })
        page.fire('keydown', { key: 'Enter' })
        expect(lib.fullscreenElement()).not.toBeNull()
        page.fire('keydown', { key: 'Escape' })
        expect(lib.fullscreenElement()).toBeNull()
        expect(window).toHaveBeenLastCalledWith(false)
        expect(page.listening('keydown')).toBe(0)
    })

    it('lets the element go when the window leaves its full screen by its own way', () => {
        const window = vi.fn()
        lib.setDesktopFullscreen(window)
        const element = page.element()
        lib.enterFullscreen(as(element))
        lib.reportDesktopFullscreen(true)
        const heard = vi.fn()
        lib.subscribeFullscreen(heard)
        lib.reportDesktopFullscreen(false)
        expect(heard).toHaveBeenCalledOnce()
        expect(lib.fullscreenElement()).toBeNull()
        expect(element.attributes.size).toBe(0)
        // The window is out already: nothing asks it again.
        expect(window).toHaveBeenCalledTimes(1)
    })

    it('leaves a window the person put in full screen there when the part leaves', () => {
        const window = vi.fn()
        lib.setDesktopFullscreen(window)
        lib.reportDesktopFullscreen(true)
        expect(lib.isFullscreen()).toBe(true)
        const element = page.element()
        lib.enterFullscreen(as(element))
        lib.exitFullscreen(as(element))
        expect(window).not.toHaveBeenCalled()
        expect(lib.fullscreenElement()).toBeNull()
        expect(lib.isFullscreen()).toBe(true)
    })

    it("puts the whole page in the window's full screen without covering anything", () => {
        const window = vi.fn()
        lib.setDesktopFullscreen(window)
        lib.enterFullscreen(as(page.documentElement))
        expect(window).toHaveBeenCalledWith(true)
        expect(page.documentElement.attributes.size).toBe(0)
        expect(page.listening('keydown')).toBe(0)
        lib.exitFullscreen(as(page.documentElement))
        expect(window).toHaveBeenLastCalledWith(false)
    })

    it('lets the first element go when another takes the window', () => {
        lib.setDesktopFullscreen(vi.fn())
        const first = page.element()
        const second = page.element()
        lib.enterFullscreen(as(first))
        lib.enterFullscreen(as(second))
        expect(lib.fullscreenElement()).toBe(second)
        expect(first.attributes.size).toBe(0)
        expect(second.getAttribute(lib.FULLSCREEN_ATTRIBUTE)).toBe('window')
        expect(page.listening('keydown')).toBe(1)
    })

    it('carries on where the call throws or rejects', async () => {
        lib.setDesktopFullscreen(() => {
            throw new Error('no window')
        })
        const element = page.element()
        expect(() => lib.enterFullscreen(as(element))).not.toThrow()
        expect(lib.fullscreenElement()).toBe(element)
        lib.exitFullscreen()
        lib.setDesktopFullscreen(() => Promise.reject(new Error('no window')))
        expect(() => lib.enterFullscreen(as(element))).not.toThrow()
        await Promise.resolve()
        expect(lib.fullscreenElement()).toBe(element)
    })

    it("takes back only the call it handed over, and uses the browser's again once none is left", () => {
        const first = vi.fn()
        const second = vi.fn()
        const undoFirst = lib.setDesktopFullscreen(first)
        const undoSecond = lib.setDesktopFullscreen(second)
        undoFirst()
        const element = page.element()
        lib.enterFullscreen(as(element))
        expect(second).toHaveBeenCalledWith(true)
        expect(first).not.toHaveBeenCalled()
        lib.exitFullscreen()
        undoSecond()
        lib.enterFullscreen(as(element))
        expect(element.requestFullscreen).toHaveBeenCalledOnce()
    })
})
