// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Composer, type ComposerProps } from './Composer'

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

function mount(props: Partial<ComposerProps>) {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() => made.render(<Composer value="" onChange={() => undefined} onSend={() => undefined} {...props} />))
    const box = host.firstElementChild
    if (box === null) throw new Error('no composer')
    return box
}

/** A drag event carrying files from the desktop, as the browser sends it. */
function drag(target: Element, type: string, files: File[] = []) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files, dropEffect: 'none' } })
    act(() => {
        target.dispatchEvent(event)
    })
}

const report = new File(['id,state'], 'runs.csv', { type: 'text/csv' })
const chart = new File(['png'], 'chart.png', { type: 'image/png' })

describe('Composer files', () => {
    it('stays marked for a drop while the drag crosses into its children', () => {
        const box = mount({ onAttach: () => undefined })
        const text = box.querySelector('textarea')
        if (text === null) throw new Error('no text')
        drag(box, 'dragenter')
        drag(box, 'dragover')
        drag(text, 'dragenter')
        drag(box, 'dragleave')
        expect(box.textContent).toContain('Drop files to attach them')
        drag(text, 'dragleave')
        expect(box.textContent).not.toContain('Drop files to attach them')
    })

    it('hands on only the dropped files accept takes, and the rest to onRefuse', () => {
        const onAttach = vi.fn()
        const onRefuse = vi.fn()
        const box = mount({ onAttach, onRefuse, accept: 'image/*' })
        drag(box, 'dragenter')
        drag(box, 'drop', [report, chart])
        expect(onAttach).toHaveBeenCalledWith([chart])
        expect(onRefuse).toHaveBeenCalledWith([report])
    })

    it('hands on only the pasted files accept takes', () => {
        const onAttach = vi.fn()
        const box = mount({ onAttach, accept: '.png' })
        const text = box.querySelector('textarea')
        if (text === null) throw new Error('no text')
        const paste = new Event('paste', { bubbles: true, cancelable: true })
        const items = [report, chart].map((file) => ({ kind: 'file', getAsFile: () => file }))
        Object.defineProperty(paste, 'clipboardData', { value: { items, types: ['Files'] } })
        act(() => {
            text.dispatchEvent(paste)
        })
        expect(onAttach).toHaveBeenCalledWith([chart])
    })

    it('takes no drop while it has nowhere to put files', () => {
        const box = mount({})
        const event = new Event('drop', { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files: [report] } })
        act(() => {
            box.dispatchEvent(event)
        })
        expect(event.defaultPrevented).toBe(false)
    })
})
