'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { DialogShell } from './DialogShell'
import { ProblemLine } from './ProseText'
import { SecretField } from './SecretField'
import { TextField } from './TextField'
import { useWords, type WordsPart } from '../lib/words'

/** The words a prompt dialog says. */
export interface PromptDialogWords {
    submit: string
    /** Submit's word while an async `onSubmit` runs. */
    submitting: string
    cancel: string
    /** Why Submit is shut while the field is empty. */
    empty: string
    /** Said when `onSubmit` fails with nothing to say of its own. */
    failed: string
}

export const PROMPT_DIALOG_WORDS: PromptDialogWords = {
    submit: 'Submit',
    submitting: 'Submitting',
    cancel: 'Cancel',
    empty: 'Fill in the field first.',
    failed: 'Could not submit. Try again.',
}

/** Where a catalog holds a prompt dialog's words. */
export const PROMPT_DIALOG_PART: WordsPart<PromptDialogWords> = { id: 'promptDialog', words: PROMPT_DIALOG_WORDS }

export interface PromptDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** What is asked: "New project", "API token for api". */
    title: ReactNode
    /** One line under the title on what the value is for. */
    description?: ReactNode
    /** The field's label. */
    label: string
    /** A short note beside the label: a unit, a format. */
    hint?: string
    /** A sentence under the input. */
    help?: string
    placeholder?: string
    /** What the field holds each time the dialog opens; empty by default. */
    defaultValue?: string
    /** The value is a secret: the library's `SecretField`, masked with Show and Hide. */
    secret?: boolean
    /** The value set in the code face, for codes, keys and addresses; a secret always is. */
    mono?: boolean
    /** An empty value may be submitted; by default Submit is shut while the field is empty. */
    allowEmpty?: boolean
    /** Why the value is refused, or nothing: the issue under the field, shown once something is typed or Submit is pressed, and Submit shut while there is one. */
    validate?: (value: string) => string | null | undefined
    /**
     * Takes the value. The dialog closes once it returns, or once its promise settles; while the
     * promise runs the dialog is busy, and when it rejects the dialog stays open and says why above
     * the verbs, the error's message or `words.failed`.
     */
    onSubmit: (value: string) => void | Promise<void>
    /** Held busy from outside, as while the app's own request for the value runs. */
    busy?: boolean
    /** A failure said from outside, above the verbs, in place of the one the dialog keeps. */
    error?: ReactNode
    words?: Partial<PromptDialogWords>
}

/** What a failed submit says: an error's message, a string as it is, else nothing of its own. */
function sayFailure(failure: unknown): string | undefined {
    if (failure instanceof Error && failure.message !== '') return failure.message
    if (typeof failure === 'string' && failure !== '') return failure
    return undefined
}

/**
 * A dialog that asks for one value: a title, an optional line under it, one field (a `TextField`,
 * or with `secret` a `SecretField`), and Cancel and Submit. Enter in the field submits. `validate`
 * gives the issue under the field as fields show issues, and shuts Submit with it as the reason;
 * an empty field shuts it too unless `allowEmpty`. While an async `onSubmit` runs the dialog is
 * busy (`DialogShell`'s busy confirm); when it fails, the dialog stays open and says why above the
 * verbs in a `ProblemLine`. The field starts from `defaultValue` each time the dialog opens.
 */
export function PromptDialog({
    open,
    onOpenChange,
    title,
    description,
    label,
    hint,
    help,
    placeholder,
    defaultValue = '',
    secret = false,
    mono = false,
    allowEmpty = false,
    validate,
    onSubmit,
    busy: held = false,
    error,
    words: given,
}: PromptDialogProps) {
    const words = useWords(PROMPT_DIALOG_PART, given)
    const id = useId()
    const [value, setValue] = useState(defaultValue)
    const [tried, setTried] = useState(false)
    const [sending, setSending] = useState(false)
    const [failure, setFailure] = useState<string | null>(null)
    // Each opening is a round: a submit that settles after its round has closed changes nothing.
    const round = useRef(0)
    useEffect(() => {
        if (!open) return
        round.current += 1
        setValue(defaultValue)
        setTried(false)
        setSending(false)
        setFailure(null)
    }, [open])

    const busy = held || sending
    const issue = validate !== undefined && (tried || value !== '') ? (validate(value) ?? null) : null
    const why = value === '' && !allowEmpty ? words.empty : (issue ?? undefined)

    const submit = () => {
        setTried(true)
        if (busy || why !== undefined) return
        const mine = round.current
        setFailure(null)
        let answer: void | Promise<void>
        try {
            answer = onSubmit(value)
        } catch (thrown) {
            setFailure(sayFailure(thrown) ?? words.failed)
            return
        }
        if (answer === undefined) {
            onOpenChange(false)
            return
        }
        setSending(true)
        Promise.resolve(answer).then(
            () => {
                if (round.current !== mine) return
                setSending(false)
                onOpenChange(false)
            },
            (thrown: unknown) => {
                if (round.current !== mine) return
                setSending(false)
                setFailure(sayFailure(thrown) ?? words.failed)
            },
        )
    }

    const said = error ?? failure
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            width="sm"
            phone="fit"
            title={title}
            description={description}
            confirm={{ label: words.submit, busyLabel: words.submitting, busy, why, onConfirm: submit }}
            status={said === null || said === undefined ? undefined : <ProblemLine>{said}</ProblemLine>}
            words={{ cancel: words.cancel }}
        >
            <div
                onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
                    if (!(event.target instanceof HTMLInputElement)) return
                    event.preventDefault()
                    submit()
                }}
            >
                {secret ? (
                    <SecretField
                        id={id}
                        label={label}
                        hint={hint}
                        help={help}
                        placeholder={placeholder}
                        value={value === '' ? undefined : value}
                        onChange={(next) => setValue(next ?? '')}
                        error={issue}
                        readOnly={busy}
                    />
                ) : (
                    <TextField
                        id={id}
                        label={label}
                        hint={hint}
                        help={help}
                        placeholder={placeholder}
                        value={value}
                        onChange={setValue}
                        error={issue}
                        mono={mono}
                        readOnly={busy}
                    />
                )}
            </div>
        </DialogShell>
    )
}
