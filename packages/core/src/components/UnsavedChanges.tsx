import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { ConfirmDialog } from './DialogShell'

/** What a guarded dialog wires up: its own `onOpenChange`, and the confirm's state. */
export interface UnsavedGuard {
    /** Pass as the guarded dialog's `onOpenChange`: closing with changes asks first. */
    onOpenChange: (open: boolean) => void
    /** Asks to close, as Cancel or a close button would. */
    requestClose: () => void
    /** Whether the discard question is showing. */
    asking: boolean
    /** Back to the form, with the changes. */
    keep: () => void
    /** Drops the changes and closes. */
    discard: () => void
}

/**
 * Holds a dialog open while its form has changes: closing it by Cancel, Escape or the backdrop
 * asks whether to discard them instead. `onClose` closes the dialog and drops the changes.
 */
export function useUnsavedGuard({
    dirty,
    onClose,
    defaultAsking = false,
}: {
    dirty: boolean
    onClose: () => void
    /** Starts with the question showing, for a still view of it. */
    defaultAsking?: boolean
}): UnsavedGuard {
    const [asking, setAsking] = useState(defaultAsking)
    const requestClose = () => {
        if (dirty) setAsking(true)
        else onClose()
    }
    return {
        onOpenChange: (open) => {
            if (!open) requestClose()
        },
        requestClose,
        asking,
        keep: () => setAsking(false),
        discard: () => {
            setAsking(false)
            onClose()
        },
    }
}

export interface UnsavedChangesWords {
    question: string
    detail: string
    keep: string
    discard: string
}

const WORDS: UnsavedChangesWords = {
    question: 'Discard your changes?',
    detail: 'What you changed in this form has not been saved.',
    keep: 'Keep editing',
    discard: 'Discard',
}

export interface UnsavedChangesDialogProps {
    guard: UnsavedGuard
    words?: Partial<UnsavedChangesWords>
}

/**
 * The question a guarded dialog asks before it closes with changes. Render it inside the dialog
 * it guards, so it opens on top of it, and pass it the guard from `useUnsavedGuard`.
 */
export function UnsavedChangesDialog({ guard, words: given }: UnsavedChangesDialogProps) {
    const words = { ...WORDS, ...given }
    return (
        <ConfirmDialog
            open={guard.asking}
            onOpenChange={(open) => {
                if (!open) guard.keep()
            }}
            question={words.question}
            detail={words.detail}
            confirm={{ label: words.discard, destructive: true, onConfirm: guard.discard }}
            words={{ cancel: words.keep }}
        />
    )
}

/** What the question asks before the app leaves a page with unsaved changes. */
export const LEAVE_WORDS: UnsavedChangesWords = {
    question: 'Leave without saving?',
    detail: 'What you changed on this page has not been saved.',
    keep: 'Stay',
    discard: 'Leave',
}

/** The leave question outside React: open while an ask waits for its answer. */
export interface LeaveQuestion {
    /** Answers true at once when nothing is unsaved; otherwise opens the question and answers with the choice. */
    ask: (dirty: boolean) => Promise<boolean>
    /** Closes the question with the choice: true to leave, false to stay. */
    answer: (leave: boolean) => void
    /** Answers an ask still waiting with stay, closing nothing, as when the page goes. */
    drop: () => void
    readonly asking: boolean
}

/**
 * The leave question's state: `ask` opens it and answers once the person chooses, a second ask
 * while it is open waiting for the same answer; `answer` closes it, and `onAskingChange` hears
 * each opening and closing.
 */
export function leaveQuestion(onAskingChange: (asking: boolean) => void): LeaveQuestion {
    let pending: { promise: Promise<boolean>; resolve: (leave: boolean) => void } | undefined
    return {
        ask: (dirty) => {
            if (!dirty) return Promise.resolve(true)
            if (pending !== undefined) return pending.promise
            let resolve: (leave: boolean) => void = () => undefined
            const promise = new Promise<boolean>((done) => {
                resolve = done
            })
            pending = { promise, resolve }
            onAskingChange(true)
            return promise
        },
        answer: (leave) => {
            const waiting = pending
            pending = undefined
            onAskingChange(false)
            waiting?.resolve(leave)
        },
        drop: () => {
            const waiting = pending
            pending = undefined
            waiting?.resolve(false)
        },
        get asking() {
            return pending !== undefined
        },
    }
}

export interface UnsavedChangesOptions {
    /** The question's words; it asks to leave without saving by default. */
    words?: Partial<UnsavedChangesWords>
    /** Starts with the question showing, for a still view of it. */
    defaultAsking?: boolean
}

/** What `useUnsavedChanges` gives a page. */
export interface UnsavedChanges {
    /**
     * Asks before the app leaves the page: answers true at once when nothing is unsaved, and
     * otherwise once the person has chosen, true to leave and false to stay. Call it from the
     * router's blocker, or before any move of the app's own, and go on only on true.
     */
    confirmLeave: () => Promise<boolean>
    /** Whether the question is showing. */
    asking: boolean
    /** The question, drawn with `ConfirmDialog`; render it once in the page. */
    dialog: ReactNode
}

/**
 * Guards a page while it holds unsaved changes. Closing the tab or reloading asks through the
 * browser's own warning (`beforeunload`) while `dirty` is true. The library has no router, so a
 * move inside the app asks through `confirmLeave`, which the app calls from its router's blocker
 * and which opens the library's `ConfirmDialog`: Stay keeps the page and its changes, Leave goes on
 * without them. The browser's warning has no words of its own; `words` are the dialog's.
 */
export function useUnsavedChanges(dirty: boolean, { words: given, defaultAsking = false }: UnsavedChangesOptions = {}): UnsavedChanges {
    const words = { ...LEAVE_WORDS, ...given }
    const [asking, setAsking] = useState(defaultAsking)
    const [question] = useState(() => leaveQuestion(setAsking))
    const latest = useRef(dirty)
    useLayoutEffect(() => {
        latest.current = dirty
    })
    useEffect(() => {
        if (!dirty) return
        const warn = (event: BeforeUnloadEvent) => event.preventDefault()
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [dirty])
    useEffect(() => () => question.drop(), [question])
    const [confirmLeave] = useState(() => () => question.ask(latest.current))
    return {
        confirmLeave,
        asking,
        dialog: (
            <ConfirmDialog
                open={asking}
                onOpenChange={(open) => {
                    if (!open) question.answer(false)
                }}
                question={words.question}
                detail={words.detail}
                confirm={{ label: words.discard, destructive: true, onConfirm: () => question.answer(true) }}
                words={{ cancel: words.keep }}
            />
        ),
    }
}
