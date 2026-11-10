import { history, redo, undo } from '@codemirror/commands'
import { Annotation, EditorSelection, EditorState, Transaction, type ChangeSet } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'

/** Marks a transaction a shared document hands a view, so the view does not hand it back. */
const fromDocument = Annotation.define<boolean>()

/**
 * One document edited in several editors at once, as a pane and the window it pops out into: an
 * edit in any of them shows in all, one undo history serves them all, and each keeps its own caret
 * and selection. A new editor opens at the caret the last one used left, so a pane opened again in
 * a window goes on where it was.
 */
export interface SharedDocument {
    /** The document's text now. */
    readonly text: string
    /** The text's length, without reading the text out. */
    readonly length: number
    /** Replaces the whole text, such as with a file loaded again; it cannot be undone. */
    setText: (text: string) => void
    /** Called with the text after every change; returns the way to stop. */
    subscribe: (listener: (text: string) => void) => () => void
    /** Undoes the last edit made in any of its editors; false when there is none. */
    undo: () => boolean
    /** Does again the last edit undone; false when there is none. */
    redo: () => boolean
}

/** What `CodeEditor` uses to join a view to a shared document. */
export interface SharedDocumentLink {
    /** The selection a new view opens with. */
    selection: () => EditorSelection
    /** Joins a view, so edits made elsewhere reach it. */
    attach: (view: EditorView) => () => void
    /** Hands the document what a view did; edits that came from the document are left out. */
    forward: (transactions: readonly Transaction[], view: EditorView) => void
    /** Runs undo or redo for a view, which takes the selection the history restores. */
    history: (which: 'undo' | 'redo', view: EditorView | null) => boolean
}

const links = new WeakMap<SharedDocument, SharedDocumentLink>()

/** The link `CodeEditor` joins a view through. */
export function sharedLink(doc: SharedDocument): SharedDocumentLink {
    const link = links.get(doc)
    if (link === undefined) throw new Error('Not a shared document: make one with createSharedDocument or useSharedDocument.')
    return link
}

/**
 * A document several `CodeEditor`s edit as one (`doc`). The text and the history live here, in a
 * CodeMirror state no view draws; each view keeps its own selection and scroll.
 */
export function createSharedDocument(text = ''): SharedDocument {
    let state = EditorState.create({ doc: text, extensions: [history(), EditorState.allowMultipleSelections.of(true)] })
    let selection = EditorSelection.single(0)
    const views = new Set<EditorView>()
    const listeners = new Set<(text: string) => void>()

    const tell = () => {
        const now = state.doc.toString()
        for (const listener of listeners) listener(now)
    }

    /** Hands changes to every view but `except`, and maps the remembered caret through them. */
    const spread = (changes: ChangeSet, except: EditorView | null, restored?: EditorSelection) => {
        selection = restored ?? selection.map(changes)
        for (const view of views) {
            if (view === except) continue
            view.dispatch({ changes, annotations: [fromDocument.of(true), Transaction.addToHistory.of(false)] })
        }
    }

    const runHistory = (which: 'undo' | 'redo', view: EditorView | null): boolean => {
        let done: Transaction | null = null
        const ran = (which === 'undo' ? undo : redo)({
            state,
            dispatch: (transaction) => {
                done = transaction
            },
        })
        if (!ran || done === null) return false
        const transaction: Transaction = done
        state = transaction.state
        spread(transaction.changes, view, transaction.selection)
        if (view !== null)
            view.dispatch({
                changes: transaction.changes,
                selection: transaction.selection,
                scrollIntoView: true,
                userEvent: which,
                annotations: [fromDocument.of(true), Transaction.addToHistory.of(false)],
            })
        tell()
        return true
    }

    const link: SharedDocumentLink = {
        selection: () => selection,
        attach: (view) => {
            views.add(view)
            return () => {
                views.delete(view)
            }
        },
        forward: (transactions, view) => {
            let changed = false
            for (const transaction of transactions) {
                if (transaction.annotation(fromDocument) === true) continue
                if (transaction.selection !== undefined) selection = transaction.selection
                if (!transaction.docChanged) continue
                // The history records the caret the edit was made from, so undo puts it back there.
                state = state.update({
                    selection: transaction.startState.selection,
                    annotations: Transaction.addToHistory.of(false),
                }).state
                const userEvent = transaction.annotation(Transaction.userEvent)
                state = state.update({
                    changes: transaction.changes,
                    selection: transaction.selection,
                    annotations: [
                        Transaction.time.of(transaction.annotation(Transaction.time) ?? Date.now()),
                        ...(userEvent === undefined ? [] : [Transaction.userEvent.of(userEvent)]),
                        ...(transaction.annotation(Transaction.addToHistory) === false ? [Transaction.addToHistory.of(false)] : []),
                    ],
                }).state
                spread(transaction.changes, view, transaction.selection ?? transaction.startState.selection.map(transaction.changes))
                changed = true
            }
            if (changed) tell()
        },
        history: runHistory,
    }

    const doc: SharedDocument = {
        get text() {
            return state.doc.toString()
        },
        get length() {
            return state.doc.length
        },
        setText: (next) => {
            if (next === state.doc.toString()) return
            const changes = state.changes({ from: 0, to: state.doc.length, insert: next })
            state = state.update({ changes, annotations: Transaction.addToHistory.of(false) }).state
            spread(changes, null)
            tell()
        },
        subscribe: (listener) => {
            listeners.add(listener)
            return () => {
                listeners.delete(listener)
            }
        },
        undo: () => runHistory('undo', null),
        redo: () => runHistory('redo', null),
    }
    links.set(doc, link)
    return doc
}

/** A shared document made once for the component, starting with `text`. */
export function useSharedDocument(text = ''): SharedDocument {
    return useState(() => createSharedDocument(text))[0]
}

/** The text of a shared document, drawn again as any of its editors changes it. */
export function useSharedText(doc: SharedDocument): string {
    return useSyncExternalStore(doc.subscribe, () => doc.text)
}

/** A shared document held in step with a value kept outside it: the working of `useControlledDocument`. */
export interface DocumentControl {
    /** Puts a value from outside in the document when it differs, telling no listener of `listen`. */
    apply: (value: string) => void
    /** Calls `onChange` with the text after each edit made in a view; returns the way to stop. */
    listen: (onChange: (text: string) => void) => () => void
}

/** Holds `doc` in step with a value kept outside it, never handing the outside's own text back. */
export function controlDocument(doc: SharedDocument): DocumentControl {
    let applying = false
    return {
        apply: (value) => {
            if (value === doc.text) return
            applying = true
            try {
                doc.setText(value)
            } finally {
                applying = false
            }
        },
        listen: (onChange) =>
            doc.subscribe((text) => {
                if (!applying) onChange(text)
            }),
    }
}

/**
 * A shared document held by a controlled `value` and `onChange`, for editors in a pane and its
 * window over a value the app keeps: a `value` that differs from the text replaces it without
 * calling `onChange`, and an edit in any of the editors calls `onChange` once with the new text.
 */
export function useControlledDocument(value: string, onChange: (text: string) => void): SharedDocument {
    const doc = useSharedDocument(value)
    const [control] = useState(() => controlDocument(doc))
    useEffect(() => control.listen(onChange), [control, onChange])
    useLayoutEffect(() => control.apply(value), [control, value])
    return doc
}
