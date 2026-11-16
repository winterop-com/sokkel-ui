// @vitest-environment happy-dom
import { EditorView } from '@codemirror/view'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { CodeEditor } from './CodeEditor'

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
    vi.useRealTimers()
})

describe('the schema a document names', () => {
    it('is resolved at the start, and then once typing in its address pauses', async () => {
        vi.useFakeTimers()
        const resolveSchema = vi.fn(() => undefined)
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        const start = '{"$schema": "https://example.org/a"}'
        await act(async () => made.render(<CodeEditor label="Job" language="json" value={start} resolveSchema={resolveSchema} />))
        expect(resolveSchema.mock.calls).toEqual([['https://example.org/a']])
        const editor = host.querySelector<HTMLElement>('.cm-editor')
        const view = editor === null ? null : EditorView.findFromDOM(editor)
        expect(view).not.toBeNull()
        const at = start.indexOf('/a') + 2
        for (const [index, char] of [...'bcde'].entries()) {
            act(() => view?.dispatch({ changes: { from: at + index, insert: char } }))
            await act(async () => vi.advanceTimersByTime(100))
        }
        expect(resolveSchema).toHaveBeenCalledTimes(1)
        await act(async () => vi.advanceTimersByTime(1000))
        expect(resolveSchema.mock.calls).toEqual([['https://example.org/a'], ['https://example.org/abcde']])
    })
})
