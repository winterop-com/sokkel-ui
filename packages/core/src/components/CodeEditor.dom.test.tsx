// @vitest-environment happy-dom
import { EditorView } from '@codemirror/view'
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { CodeEditor, wikiLinkAt } from './CodeEditor'

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

/** Draws an editor and hands back its view. */
async function draw(element: ReactElement): Promise<EditorView> {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    await act(async () => made.render(element))
    const editor = host.querySelector<HTMLElement>('.cm-editor')
    const view = editor === null ? null : EditorView.findFromDOM(editor)
    if (view === null) throw new Error('No editor')
    return view
}

describe('following a link', () => {
    const NOTE = 'Runs after [[Nightly export#Steps|the export]], not `[[in code]]`.'

    it('follows the [[link]] clicked with Mod held, and nothing without the key', async () => {
        const onFollowLink = vi.fn()
        const view = await draw(<CodeEditor label="Note" language="markdown" value={NOTE} onFollowLink={onFollowLink} />)
        const inside = NOTE.indexOf('the export')
        expect(wikiLinkAt(view.state, inside)).toMatchObject({ target: 'Nightly export', heading: 'Steps', label: 'the export' })
        expect(wikiLinkAt(view.state, NOTE.indexOf('in code'))).toBeUndefined()
        expect(view.dom.querySelectorAll('.cm-wikiLink')).toHaveLength(1)
        // happy-dom lays nothing out, so the point under the pointer is told.
        view.posAtCoords = (() => inside) as typeof view.posAtCoords
        const press = (held: boolean) =>
            view.contentDOM.dispatchEvent(
                new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, metaKey: held, ctrlKey: held }),
            )
        act(() => void press(false))
        expect(onFollowLink).not.toHaveBeenCalled()
        act(() => void press(true))
        expect(onFollowLink).toHaveBeenCalledWith(expect.objectContaining({ target: 'Nightly export', heading: 'Steps' }))
    })

    it('marks no link without onFollowLink', async () => {
        const view = await draw(<CodeEditor label="Note" language="markdown" value={NOTE} />)
        expect(wikiLinkAt(view.state, NOTE.indexOf('the export'))).toBeUndefined()
        expect(view.dom.querySelectorAll('.cm-wikiLink')).toHaveLength(0)
    })
})

describe('the caret line', () => {
    it('stays washed out of focus with activeLine always', async () => {
        const view = await draw(<CodeEditor label="Job" value="a\nb" activeLine="always" />)
        expect(view.dom.classList.contains('cm-activeLine-always')).toBe(true)
        expect(view.dom.querySelector('.cm-activeLine')).not.toBeNull()
        await act(async () => root?.render(<CodeEditor label="Job" value="a\nb" />))
        expect(view.dom.classList.contains('cm-activeLine-always')).toBe(false)
    })
})
