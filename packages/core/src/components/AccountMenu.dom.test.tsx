// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { AccountMenu } from './AccountMenu'

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

async function open(onAppearance: () => void) {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    await act(async () => {
        made.render(<AccountMenu name="ada" onSettings={() => undefined} onAppearance={onAppearance} defaultOpen />)
    })
    await vi.waitFor(() => expect(document.body.querySelector('[role="menu"]')).not.toBeNull())
    return [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')]
}

describe('AccountMenu', () => {
    it('opens the appearance settings from Appearance and offers no scheme of its own', async () => {
        const onAppearance = vi.fn()
        const rows = await open(onAppearance)
        expect(rows.map((row) => row.textContent)).toEqual(['Settings', 'Appearance'])
        expect(document.body.querySelector('[role="menuitemradio"]')).toBeNull()
        await act(async () => rows[1]?.click())
        expect(onAppearance).toHaveBeenCalledOnce()
    })
})
