// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Chip } from './Chip'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
})

describe('Chip', () => {
    it('draws a menu item with href as a link, and one without as a menu item', async () => {
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        await act(async () =>
            made.render(
                <Chip
                    defaultOpen
                    menu={[
                        { label: 'juniper', href: '#/tags/juniper' },
                        { label: 'larkspur', onSelect: () => undefined },
                    ]}
                >
                    +2
                </Chip>,
            ),
        )
        for (let round = 0; round < 4; round++) await act(async () => new Promise((done) => setTimeout(done, 20)))
        const rows = [...document.querySelectorAll('[data-slot="dropdown-menu-item"]')]
        expect(rows.map((row) => row.tagName)).toEqual(['A', 'DIV'])
        expect(rows[0].getAttribute('href')).toBe('#/tags/juniper')
        expect(rows[0].getAttribute('role')).toBe('menuitem')
    })
})
