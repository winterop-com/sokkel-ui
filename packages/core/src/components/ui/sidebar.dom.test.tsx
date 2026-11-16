// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { isApple } from '../../lib/keys'
import { SidebarProvider, useSidebar } from './sidebar'

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

function State() {
    return <output>{useSidebar().state}</output>
}

function mount() {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() =>
        made.render(
            <SidebarProvider>
                <input aria-label="Name" />
                <State />
            </SidebarProvider>,
        ),
    )
    return host
}

const press = (target: EventTarget) =>
    act(() => {
        target.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'b',
                code: 'KeyB',
                ctrlKey: !isApple(),
                metaKey: isApple(),
                bubbles: true,
                cancelable: true,
            }),
        )
    })

describe('SidebarProvider', () => {
    it('folds on Mod+B through the shortcut registry, but not while typing in a field', () => {
        const page = mount()
        const state = () => page.querySelector('output')?.textContent
        const input = page.querySelector('input')
        if (input === null) throw new Error('no input')
        input.focus()
        press(input)
        expect(state()).toBe('expanded')
        input.blur()
        press(document.body)
        expect(state()).toBe('collapsed')
    })

    it('keeps no cookie', () => {
        const page = mount()
        press(document.body)
        expect(page.querySelector('output')?.textContent).toBe('collapsed')
        expect(document.cookie).not.toContain('sidebar_state')
    })
})
