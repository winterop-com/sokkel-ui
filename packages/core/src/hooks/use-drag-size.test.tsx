// @vitest-environment happy-dom
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { useDragSize } from './use-drag-size'

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

const set = vi.fn()
const clamp = (size: number) => size

function Panel() {
    const element = useRef<HTMLDivElement>(null)
    const { dragging, begin } = useDragSize('x', () => 200, 1, set, clamp, element)
    return (
        <div ref={element} data-dragging={dragging || undefined}>
            <span role="separator" onPointerDown={begin} />
        </div>
    )
}

const pointer = (type: string, clientX: number) => new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, clientX })

describe('a resize drag', () => {
    it('ends when the browser cancels it', async () => {
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        act(() => made.render(<Panel />))
        const handle = host.querySelector('[role="separator"]')
        const panel = host.firstElementChild as HTMLElement
        act(() => handle?.dispatchEvent(pointer('pointerdown', 0)))
        expect(panel.dataset.dragging).toBe('true')
        act(() => document.dispatchEvent(pointer('pointermove', 40)))
        act(() => document.dispatchEvent(pointer('pointercancel', 40)))
        expect(panel.dataset.dragging).toBeUndefined()
        expect(document.body.style.cursor).toBe('')
        expect(set).toHaveBeenLastCalledWith(240)
        // Moves after the cancel size nothing.
        set.mockClear()
        act(() => document.dispatchEvent(pointer('pointermove', 120)))
        await act(async () => new Promise((done) => setTimeout(done, 40)))
        expect(set).not.toHaveBeenCalled()
        expect(panel.style.width).toBe('240px')
    })
})
