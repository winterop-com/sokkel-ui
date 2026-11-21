// @vitest-environment happy-dom
import { Bell, Crosshair, List } from 'lucide-react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { SidePanel, type SidePanelTab } from './SidePanel'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined
let room = 0
const needs = 300
const Real = globalThis.ResizeObserver
const realClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
const realScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth')

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    // The room the tabs have, and the width the tabs with their labels take.
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get(this: HTMLElement) {
            return this.dataset.slot === 'side-panel-tabs' ? room : 0
        },
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
        configurable: true,
        get(this: HTMLElement) {
            return this.dataset.slot === 'side-panel-tabs-measure' ? needs : 0
        },
    })
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    globalThis.ResizeObserver = Real
    if (realClient !== undefined) Object.defineProperty(HTMLElement.prototype, 'clientWidth', realClient)
    if (realScroll !== undefined) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', realScroll)
})

const TABS: SidePanelTab[] = [
    { id: 'pick', label: 'Pick', icon: Crosshair, content: <p>nightly-export</p> },
    { id: 'tracks', label: 'Tracks', icon: List, content: <p>harbor</p> },
    { id: 'alerts', label: 'Alerts (3)', icon: Bell, content: <p>failed</p> },
]

function draw(tabs: SidePanelTab[]): HTMLElement {
    host = document.createElement('div')
    document.body.append(host)
    const at = createRoot(host)
    root = at
    act(() => at.render(<SidePanel tabs={tabs} />))
    return host
}

const shown = (element: HTMLElement) =>
    [...element.querySelectorAll('[role=tab]')].map((tab) =>
        tab.textContent === '' ? `[${tab.getAttribute('aria-label') ?? ''}]` : tab.textContent,
    )

describe('SidePanel tabs in a narrow header', () => {
    it('show their labels while they fit', () => {
        room = 400
        expect(shown(draw(TABS))).toEqual(['Pick', 'Tracks', 'Alerts (3)'])
    })

    it('stand as their icons, named, when their labels would run under the header toggle', () => {
        room = 200
        const element = draw(TABS)
        expect(shown(element)).toEqual(['[Pick]', '[Tracks]', '[Alerts (3)]'])
        expect(element.querySelectorAll('[role=tab] svg')).toHaveLength(3)
    })

    it('keep their labels where a tab has no icon to stand for it, and scroll rather than run under the toggle', () => {
        room = 200
        const element = draw([...TABS, { id: 'log', label: 'Log', content: <p>fetch</p> }])
        expect(shown(element)).toEqual(['Pick', 'Tracks', 'Alerts (3)', 'Log'])
        expect(element.querySelector('[role=tablist]')?.className).toContain('overflow-x-auto')
    })
})
