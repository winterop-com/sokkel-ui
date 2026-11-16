// @vitest-environment happy-dom
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { useHistoryKeys } from './use-graph-history'

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
})

function Editor({ name, undo }: { name: string; undo: () => void }) {
    const scope = useRef<HTMLDivElement | null>(null)
    useHistoryKeys(undo, () => undefined, { scope })
    return (
        <div ref={scope}>
            <button type="button" aria-label={name} />
        </div>
    )
}

describe('useHistoryKeys with a scope', () => {
    it('undoes only the editor the key is pressed in, of two on one page', () => {
        const first = vi.fn()
        const second = vi.fn()
        host = document.createElement('div')
        document.body.append(host)
        root = createRoot(host)
        act(() =>
            root?.render(
                <>
                    <Editor name="harbor" undo={first} />
                    <Editor name="juniper" undo={second} />
                </>,
            ),
        )
        const button = host.querySelector('[aria-label="juniper"]')
        act(() => {
            button?.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }))
        })
        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
    })
})
