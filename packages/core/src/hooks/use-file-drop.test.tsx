// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { useFileDrop } from './use-file-drop'

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

/** A drop zone whose words are replaced while files are over it. */
function Zone() {
    const { over, handlers } = useFileDrop(() => undefined)
    return (
        <div data-zone="" data-over={over || undefined} {...handlers}>
            {over ? <strong>Drop to upload</strong> : <span data-words="">Drag files here</span>}
        </div>
    )
}

/** A drag event carrying files from the desktop. */
function drag(type: string, target: Element) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files: [], dropEffect: 'none' } })
    act(() => {
        target.dispatchEvent(event)
    })
}

describe('files dragged over a drop zone', () => {
    it('stop being over it once they leave, though the child they entered by is gone', () => {
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        act(() => made.render(<Zone />))
        const zone = host.querySelector('[data-zone]')
        const words = host.querySelector('[data-words]')
        if (zone === null || words === null) throw new Error('no zone')
        drag('dragenter', words)
        expect(zone.hasAttribute('data-over')).toBe(true)
        // The words the pointer entered by are gone, and no leave comes from them.
        expect(words.isConnected).toBe(false)
        drag('dragenter', zone)
        drag('dragleave', zone)
        expect(zone.hasAttribute('data-over')).toBe(false)
    })
})
