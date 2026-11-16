// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Composer } from './Composer'
import { MessageComposer } from './MessageComposer'

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
    vi.unstubAllGlobals()
})

/** A screen that answers the media queries as a phone does (`touch`) or as a desktop does. */
function screen(touch: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: touch && /pointer: coarse/.test(query),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    }))
}

/** Presses Enter in the composer's text, and says whether it was kept from breaking the line. */
function pressEnter(element: ReactElement): boolean {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() => made.render(element))
    const area = host.querySelector('textarea')
    if (area === null) throw new Error('no text')
    const press = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    act(() => {
        area.dispatchEvent(press)
    })
    return press.defaultPrevented
}

const composers = {
    Composer: (onSend: () => void) => <Composer value="Did nightly-export finish?" onChange={() => undefined} onSend={onSend} />,
    MessageComposer: (onSend: () => void) => (
        <MessageComposer value="Did nightly-export finish?" onChange={() => undefined} onSend={onSend} />
    ),
}

describe.each(Object.entries(composers))('%s Enter', (_, draw) => {
    it('sends on a desktop', () => {
        screen(false)
        const onSend = vi.fn()
        expect(pressEnter(draw(onSend))).toBe(true)
        expect(onSend).toHaveBeenCalledTimes(1)
    })

    it('breaks the line on a touch screen, leaving sending to the button', () => {
        screen(true)
        const onSend = vi.fn()
        expect(pressEnter(draw(onSend))).toBe(false)
        expect(onSend).not.toHaveBeenCalled()
    })
})
