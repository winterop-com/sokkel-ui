import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { desktopShellOf, hasTrafficLights, trafficLightsStyle, WINDOW_CONTROLS, windowPress, windowPressHandler } from './desktop'

/** An element as far as the press reads it: what `closest` finds for the strip and for a control. */
function pressed({ strip, control }: { strip: boolean; control?: 'inside' | 'outside' }) {
    const region = { contains: (other: unknown) => other === inside }
    const inside = {}
    const outside = {}
    return {
        closest: (selector: string) => {
            if (selector === '[data-window-drag]') return strip ? region : null
            if (control === undefined) return null
            return control === 'inside' ? inside : outside
        },
    }
}

describe('windowPress', () => {
    it('drags the window from the strip, and zooms it on the second press of a double click', () => {
        expect(windowPress({ button: 0, detail: 1, target: pressed({ strip: true }) })).toBe('drag')
        expect(windowPress({ button: 0, detail: 2, target: pressed({ strip: true }) })).toBe('zoom')
    })

    it('leaves a press on a control in the strip to the control', () => {
        expect(windowPress({ button: 0, detail: 1, target: pressed({ strip: true, control: 'inside' }) })).toBeUndefined()
    })

    it('still drags when the strip itself stands inside something pressable', () => {
        expect(windowPress({ button: 0, detail: 1, target: pressed({ strip: true, control: 'outside' }) })).toBe('drag')
    })

    it('does nothing outside the strip, for another button, or for what is not an element', () => {
        expect(windowPress({ button: 0, detail: 1, target: pressed({ strip: false }) })).toBeUndefined()
        expect(windowPress({ button: 2, detail: 1, target: pressed({ strip: true }) })).toBeUndefined()
        expect(windowPress({ button: 0, detail: 1, target: null })).toBeUndefined()
    })
})

describe('windowPressHandler', () => {
    it('is none without a callback, so a frame in Electron or a browser listens to nothing', () => {
        expect(windowPressHandler(undefined)).toBeUndefined()
        expect(windowPressHandler({ trafficLights: true })).toBeUndefined()
    })

    it("calls the app's drag and zoom", () => {
        const desktop = { onWindowDrag: vi.fn(), onWindowZoom: vi.fn() }
        const handle = windowPressHandler(desktop)
        const event = (detail: number) =>
            ({ button: 0, detail, target: pressed({ strip: true }) }) as unknown as Parameters<NonNullable<typeof handle>>[0]
        handle?.(event(1))
        handle?.(event(2))
        expect(desktop.onWindowDrag).toHaveBeenCalledTimes(1)
        expect(desktop.onWindowZoom).toHaveBeenCalledTimes(1)
    })
})

describe('traffic lights', () => {
    it('leave room only when asked, in the token or in pixels', () => {
        expect(hasTrafficLights(undefined)).toBe(false)
        expect(hasTrafficLights({})).toBe(false)
        expect(hasTrafficLights({ trafficLights: false })).toBe(false)
        expect(hasTrafficLights({ trafficLights: true })).toBe(true)
        expect(hasTrafficLights({ trafficLights: 92 })).toBe(true)
        expect(trafficLightsStyle({ trafficLights: true })).toBeUndefined()
        expect(trafficLightsStyle({ trafficLights: 92 })).toEqual({ '--spacing-traffic-lights': '92px' })
    })
})

describe('desktopShellOf', () => {
    it("reads Tauri from its globals and Electron from its user agent's name", () => {
        expect(desktopShellOf('Mozilla/5.0 AppleWebKit/605.1.15', { __TAURI_INTERNALS__: {} })).toBe('tauri')
        expect(desktopShellOf('Mozilla/5.0 Chrome/140.0 Electron/38.1.0 Safari/537.36', {})).toBe('electron')
        expect(desktopShellOf('Mozilla/5.0 Chrome/140.0 Safari/537.36', {})).toBeUndefined()
    })
})

describe('the stylesheet', () => {
    it('opts every control in WINDOW_CONTROLS out of the drag region', () => {
        const css = readFileSync(join(import.meta.dirname, '../styles/index.css'), 'utf8').replaceAll("'", '"')
        const rule = css.slice(css.indexOf('[data-window-drag]\n'), css.indexOf('no-drag;'))
        for (const control of WINDOW_CONTROLS) expect(rule).toContain(control)
    })
})
