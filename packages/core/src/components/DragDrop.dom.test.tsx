// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { DragDrop, useDragItem } from './DragDrop'

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
    document.body.style.removeProperty('cursor')
})

function Job() {
    const { ref, handle } = useDragItem({ id: 'nightly-export', data: { kind: 'jobs', label: 'nightly-export' } })
    return (
        <div ref={ref}>
            <button type="button" {...handle}>
                nightly-export
            </button>
        </div>
    )
}

describe('a drag and drop', () => {
    it('gives the page its cursor back when it goes mid-drag', async () => {
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        act(() =>
            made.render(
                <DragDrop>
                    <Job />
                </DragDrop>,
            ),
        )
        const grip = host.querySelector('button')
        if (grip === null) throw new Error('no grip')
        await act(async () => {
            grip.focus()
            grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }))
            await new Promise((done) => setTimeout(done, 20))
        })
        expect(document.body.style.cursor).toBe('grabbing')
        act(() => made.unmount())
        root = undefined
        expect(document.body.style.cursor).toBe('')
    })
})
