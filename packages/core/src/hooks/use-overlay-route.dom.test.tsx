// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { DialogShell } from '../components/DialogShell'
import { layerOpen } from '../lib/shortcuts'
import { useOverlayRoute, type OverlayRoute } from './use-overlay-route'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined
let settings: OverlayRoute | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
    settings = undefined
})

/** An app's Settings on `#/settings`, going back through a history that lands later, as the browser's does. */
function App({ route, back }: { route: readonly string[]; back: (steps: number) => void }) {
    settings = useOverlayRoute(route, 'settings', { back })
    return (
        <DialogShell open={settings.open} onOpenChange={(open) => !open && settings?.close()} title="Settings">
            Theme
        </DialogShell>
    )
}

describe('useOverlayRoute in a page', () => {
    it('stops counting the overlay as open from the moment it closes, before the history lands', () => {
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        const back = vi.fn()
        act(() => made.render(<App route={['jobs']} back={back} />))
        act(() => made.render(<App route={['settings']} back={back} />))
        expect(settings?.open).toBe(true)
        expect(layerOpen()).toBe(true)
        act(() => settings?.close())
        expect(back).toHaveBeenCalledWith(1)
        expect(settings?.open).toBe(false)
        expect(layerOpen()).toBe(false)
        act(() => made.render(<App route={['jobs']} back={back} />))
        expect(settings?.open).toBe(false)
        act(() => made.render(<App route={['settings']} back={back} />))
        expect(settings?.open).toBe(true)
    })
})
