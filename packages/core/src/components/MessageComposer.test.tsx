// @vitest-environment happy-dom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { MessageComposer, type MessageComposerProps } from './MessageComposer'

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

/** A composer holding its own text, as an app does, with the given props over it. */
function Held({ initial, ...props }: Partial<MessageComposerProps> & { initial: string }) {
    const [value, setValue] = useState(initial)
    return <MessageComposer value={value} onChange={setValue} onSend={() => {}} {...props} />
}

function mount(props: Partial<MessageComposerProps> & { initial?: string } = {}) {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() => made.render(<Held initial="" {...props} />))
    return host
}

const area = (at: HTMLElement) => at.querySelector('textarea') as HTMLTextAreaElement

function press(target: HTMLElement, init: KeyboardEventInit & { keyCode?: number }) {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
    if (init.keyCode !== undefined) Object.defineProperty(event, 'keyCode', { value: init.keyCode })
    act(() => {
        target.dispatchEvent(event)
    })
    return event
}

describe('MessageComposer', () => {
    it('sends on Enter and keeps Shift+Enter for a new line', () => {
        const onSend = vi.fn()
        const at = mount({ initial: 'nightly-export failed', onSend })
        const shifted = press(area(at), { key: 'Enter', shiftKey: true })
        expect(onSend).not.toHaveBeenCalled()
        expect(shifted.defaultPrevented).toBe(false)
        const plain = press(area(at), { key: 'Enter' })
        expect(onSend).toHaveBeenCalledTimes(1)
        expect(plain.defaultPrevented).toBe(true)
    })

    it('sends nothing for a blank message, and does not break the line either', () => {
        const onSend = vi.fn()
        const at = mount({ initial: '   \n ', onSend })
        const event = press(area(at), { key: 'Enter' })
        expect(onSend).not.toHaveBeenCalled()
        expect(event.defaultPrevented).toBe(true)
    })

    it('leaves an Enter that ends a word being composed to the input method', () => {
        const onSend = vi.fn()
        const at = mount({ initial: 'ada', onSend })
        press(area(at), { key: 'Enter', isComposing: true })
        press(area(at), { key: 'Enter', keyCode: 229 })
        expect(onSend).not.toHaveBeenCalled()
    })

    it('sends from its Send button, which is off while the message is blank', () => {
        const onSend = vi.fn()
        const at = mount({ initial: '', onSend })
        const button = at.querySelector<HTMLButtonElement>('button[aria-label="Send"]')
        expect(button).not.toBeNull()
        expect(button?.disabled).toBe(true)
        const text = area(at)
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(text), 'value')?.set
        act(() => {
            setter?.call(text, 'sync-inventory is done')
            text.dispatchEvent(new Event('input', { bubbles: true }))
        })
        const ready = at.querySelector<HTMLButtonElement>('button[aria-label="Send"]')
        expect(ready?.disabled).toBe(false)
        act(() => ready?.click())
        expect(onSend).toHaveBeenCalledTimes(1)
    })

    it('wraps the selection in the mark of a formatting button', () => {
        const at = mount({ initial: 'run the export' })
        const text = area(at)
        act(() => {
            text.focus()
            text.setSelectionRange(4, 7)
        })
        act(() => at.querySelector<HTMLButtonElement>('button[aria-label="Bold"]')?.click())
        expect(area(at).value).toBe('run **the** export')
    })

    it('says its words in the words it is given', () => {
        const at = mount({ initial: '', words: { placeholder: 'Skriv', send: 'Send nå' } })
        expect(area(at).placeholder).toBe('Skriv')
        expect(at.querySelector('button[aria-label="Send nå"]')).not.toBeNull()
    })
})
