import { useState } from 'react'

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
    /** Starts with the question showing, for a static view of it. */
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

/**
 * The question a guarded dialog asks before it closes with changes. Render it inside the dialog
 * it guards, so it opens on top of it, and pass it the guard from `useUnsavedGuard`.
 */
export function UnsavedChangesDialog({ guard, words: given }: { guard: UnsavedGuard; words?: Partial<UnsavedChangesWords> }) {
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
