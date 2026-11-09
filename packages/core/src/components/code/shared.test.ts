import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'

import { createSharedDocument, sharedLink, type SharedDocument } from './shared'

/** A stand-in for an editor view: its own state, joined to the document as `CodeEditor` joins one. */
function viewOf(doc: SharedDocument) {
    const link = sharedLink(doc)
    const view = {
        state: EditorState.create({ doc: doc.text, selection: link.selection() }),
        dispatch(spec: TransactionSpec) {
            const transaction = view.state.update(spec)
            view.state = transaction.state
            link.forward([transaction], view as unknown as EditorView)
        },
        undo: () => link.history('undo', view as unknown as EditorView),
        redo: () => link.history('redo', view as unknown as EditorView),
        close: () => {},
    }
    view.close = link.attach(view as unknown as EditorView)
    return view
}

const type = (view: ReturnType<typeof viewOf>, at: number, text: string) =>
    view.dispatch({ changes: { from: at, insert: text }, selection: EditorSelection.cursor(at + text.length), userEvent: 'input.type' })

describe('a shared document', () => {
    it('shows an edit in one editor in the other, each keeping its own caret', () => {
        const doc = createSharedDocument('job: sync-inventory\n')
        const pane = viewOf(doc)
        const window = viewOf(doc)
        window.dispatch({ selection: EditorSelection.cursor(5) })
        type(pane, 0, '# harbor\n')
        expect(window.state.doc.toString()).toBe('# harbor\njob: sync-inventory\n')
        expect(doc.text).toBe(window.state.doc.toString())
        // The window's caret moves with the text put in before it.
        expect(window.state.selection.main.head).toBe(14)
        expect(pane.state.selection.main.head).toBe(9)
    })

    it('undoes an edit from either editor in both, the caret going back where the edit began', () => {
        const doc = createSharedDocument('steps: []\n')
        const pane = viewOf(doc)
        const window = viewOf(doc)
        pane.dispatch({ selection: EditorSelection.cursor(10) })
        type(pane, 10, 'schedule: nightly\n')
        expect(window.state.doc.toString()).toBe('steps: []\nschedule: nightly\n')
        expect(window.undo()).toBe(true)
        expect(pane.state.doc.toString()).toBe('steps: []\n')
        expect(window.state.doc.toString()).toBe('steps: []\n')
        expect(window.state.selection.main.head).toBe(10)
        expect(pane.redo()).toBe(true)
        expect(window.state.doc.toString()).toBe('steps: []\nschedule: nightly\n')
        expect(doc.undo()).toBe(true)
        expect(doc.undo()).toBe(false)
    })

    it('opens a new editor at the caret the last one left', () => {
        const doc = createSharedDocument('service: worker\n')
        const pane = viewOf(doc)
        pane.dispatch({ selection: EditorSelection.cursor(9) })
        pane.close()
        const window = viewOf(doc)
        expect(window.state.selection.main.head).toBe(9)
        expect(window.undo()).toBe(false)
    })

    it('replaces its text from outside without an undo step, and tells who listens', () => {
        const doc = createSharedDocument('a')
        const pane = viewOf(doc)
        const heard: string[] = []
        const stop = doc.subscribe((text) => heard.push(text))
        doc.setText('project: larkspur')
        type(pane, 17, '\n')
        stop()
        type(pane, 18, 'x')
        expect(pane.state.doc.toString()).toBe('project: larkspur\nx')
        expect(heard).toEqual(['project: larkspur', 'project: larkspur\n'])
        expect(doc.undo()).toBe(true)
        expect(doc.undo()).toBe(false)
        expect(pane.state.doc.toString()).toBe('project: larkspur')
    })
})
