// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { BlockPicker } from './BlockPicker'
import type { PipelineBlock } from './blocks'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const BLOCKS: PipelineBlock[] = ['fetch', 'transform', 'validate', 'upload', 'notify'].map((kind) => ({ kind, group: 'steps' }))
const GROUPS = [{ id: 'steps', label: 'Steps' }]

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    vi.restoreAllMocks()
})

function mount(onPick: (block: PipelineBlock) => void) {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root?.render(<BlockPicker blocks={BLOCKS} groups={GROUPS} onPick={onPick} />))
    const input = host.querySelector('input')
    if (input === null) throw new Error('no search')
    return input
}

const press = (input: HTMLInputElement, key: string, isComposing = false) =>
    act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key, isComposing, bubbles: true, cancelable: true }))
    })

describe('the block picker', () => {
    it('scrolls the list to the block the arrow keys move to', () => {
        const scrolled: string[] = []
        vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
            scrolled.push(this.textContent ?? '')
        })
        const input = mount(() => undefined)
        press(input, 'ArrowDown')
        press(input, 'ArrowDown')
        expect(scrolled.at(-1)).toContain('validate')
    })

    it('leaves Enter to the input method while a word is composed', () => {
        const onPick = vi.fn()
        const input = mount(onPick)
        press(input, 'Enter', true)
        expect(onPick).not.toHaveBeenCalled()
        press(input, 'Enter')
        expect(onPick).toHaveBeenCalledWith(BLOCKS[0])
    })
})
