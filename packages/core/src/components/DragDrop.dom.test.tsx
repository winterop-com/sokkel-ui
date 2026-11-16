// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { BoardItem } from './board/Board'
import { DragDrop, useDragItem } from './DragDrop'
import { SortableGroup, SortableItem } from './Sortable'

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

function draw(element: ReactElement) {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() => made.render(element))
    return host
}

const key = (target: Element, name: string) =>
    act(() => {
        target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }))
    })

describe('a thing that drags as a whole', () => {
    it('in a sortable group runs its own key handler as well as the drag', () => {
        const pressed = vi.fn()
        const moved = vi.fn()
        const at = draw(
            <SortableGroup ids={['fetch', 'transform']} onMove={moved} label={(id) => id}>
                <SortableItem id="fetch" handle="item" onKeyDown={(event) => pressed(event.key)}>
                    fetch
                </SortableItem>
                <SortableItem id="transform" handle="item">
                    transform
                </SortableItem>
            </SortableGroup>,
        )
        const item = [...at.querySelectorAll('[role="button"]')].find((element) => element.textContent === 'fetch')
        if (item === undefined) throw new Error('no item')
        key(item, 'ArrowDown')
        expect(pressed).toHaveBeenCalledWith('ArrowDown')
        expect(moved).toHaveBeenCalledWith(0, 1)
    })

    it('as a board card keeps its own handlers, outside a board too', () => {
        const pressed = vi.fn()
        const at = draw(
            <BoardItem id="nightly-export" label="nightly-export" onKeyDown={(event) => pressed(event.key)}>
                nightly-export
            </BoardItem>,
        )
        const card = at.querySelector('[data-board-card]')
        if (card === null) throw new Error('no card')
        key(card, 'Enter')
        expect(pressed).toHaveBeenCalledWith('Enter')
    })
})

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
