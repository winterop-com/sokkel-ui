import { PencilIcon } from 'lucide-react'
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import {
    AT_REST,
    draftOf,
    EDIT_WORDS,
    editCycle,
    failureOf,
    readDraft,
    shownValue,
    type EditedValue,
    type EditMove,
    type EditOption,
    type EditorKind,
    type EditValue,
    type EditWords,
} from '../lib/edit'
import { InlineEditor } from './inline-edit-parts'

export type { EditedValue, EditOption, EditorKind, EditValue, EditWords }

/** The words an inline edit says, in English unless an app passes its own. */
export interface InlineEditWords extends EditWords {
    /** What pressing the value does, said to a screen reader after it. */
    edit: string
    /** Drawn for a value that is empty, unless `placeholder` says otherwise. */
    empty: string
}

const WORDS: InlineEditWords = { ...EDIT_WORDS, edit: 'Edit', empty: 'Empty' }

export interface InlineEditProps<K extends EditorKind = 'text'> {
    /** The value's name, which names the editor: Schedule, Retries, Owner. */
    label: string
    /**
     * Which control edits the value: a line of text (the default), several lines, a number, a date
     * (`YYYY-MM-DD`), a time of day (`HH:mm`; the number, the date and the time null when emptied),
     * or one of `options`.
     */
    editor?: K
    /** The choices a `select` offers. */
    options?: readonly EditOption[]
    /** The value shown; given none, the part holds its own from `defaultValue` and keeps what saves. */
    value?: EditedValue<K>
    defaultValue?: EditedValue<K>
    /**
     * Saves a value. A promise holds the editor pending until it settles; a rejection keeps the
     * editor open on the typed value, its message said by the mark at the editor's end.
     */
    onSave: (value: EditedValue<K>) => void | Promise<void>
    /** Checks a value before it is saved: a message refuses it, as a rejection would. */
    validate?: (value: EditedValue<K>) => string | null | undefined
    /** How the value is drawn at rest; its text, its figures or its option's label by default. */
    display?: (value: EditedValue<K>) => ReactNode
    /** `field` (the default) a field's value in body text; `title` a page title in its type. */
    variant?: 'field' | 'title'
    /** What leaving the editor does: saves what is typed (the default) or drops it. */
    blur?: 'save' | 'cancel'
    /** Shows the value read only, with no way to edit it. */
    disabled?: boolean
    /** Drawn for an empty value, and in an empty editor. */
    placeholder?: string
    /** The day a date editor's calendar starts its weeks on: 1 for Monday (the default), 0 for Sunday. */
    weekStartsOn?: 0 | 1
    /**
     * Opens with the editor showing, as a story draws a state still: `true`, or what is typed
     * with a save running or refused.
     */
    defaultEditing?: boolean | { draft?: string; saving?: boolean; error?: string }
    words?: Partial<InlineEditWords>
    className?: string
}

/**
 * A value shown as text that turns into an editor on a press, Enter or F2, and back once saved.
 * Enter saves a line of text, a number, a date, a time or a choice; a text of several lines keeps Enter for a new
 * line and saves on ⌘ or Ctrl with Enter or with its Save button. Escape drops what was typed, and
 * leaving the editor saves it (or drops it, with `blur="cancel"`). An unchanged value closes with
 * no save.
 *
 * The app's `onSave` runs the save: while its promise runs the editor holds the typed value with
 * a spinner, and a rejection keeps the editor open on it with a critical edge and the rejection's
 * message in the mark at its end, opened at once. Typing clears the refusal; leaving an unchanged
 * refused value does not save it again. A number, a date or a time is typed into `NumberField`,
 * `DateField` or `TimeField` drawn bare, the date with its calendar and the time with its list of
 * times; text none of them can read, or a value
 * `validate` refuses, is refused the same way before the app is asked.
 *
 * `variant="field"` sizes the value and its editor alike, so nothing moves as it opens;
 * `variant="title"` draws both in a page title's type, for `PageHeader`'s `title`. A disabled
 * value is read only.
 */
export function InlineEdit<K extends EditorKind = 'text'>(props: InlineEditProps<K>) {
    const { label, variant = 'field', blur = 'save', disabled = false, placeholder, defaultEditing = false, className } = props
    const kind: EditorKind = props.editor ?? 'text'
    const words = { ...WORDS, ...props.words }
    const options = kind === 'select' ? props.options : undefined
    // One kind's value is the editor's value as the cycle handles it.
    const save = props.onSave as (value: EditValue) => void | Promise<void>
    const validate = props.validate as ((value: EditValue) => string | null | undefined) | undefined
    const display = props.display as ((value: EditValue) => ReactNode) | undefined

    const [own, setOwn] = useState<EditValue>(props.defaultValue ?? (kind === 'number' || kind === 'date' || kind === 'time' ? null : ''))
    const value: EditValue = props.value !== undefined ? props.value : own
    const still = typeof defaultEditing === 'object' ? defaultEditing : undefined
    const [state, dispatch] = useReducer(
        editCycle,
        defaultEditing === false || disabled
            ? AT_REST
            : { editing: true, draft: still?.draft ?? draftOf(value), saving: still?.saving === true, error: still?.error ?? null },
    )
    // The draft the last refusal was about, so leaving it unchanged does not save it again.
    const refused = useRef<string | null>(state.error === null ? null : state.draft)
    const attempt = useRef(0)
    const button = useRef<HTMLButtonElement>(null)
    const refocus = useRef(false)

    // Closed by a key, the value takes the focus back, unless the person has moved it elsewhere meanwhile.
    useEffect(() => {
        if (state.editing || !refocus.current) return
        refocus.current = false
        const now = document.activeElement
        if (now === null || now === document.body) button.current?.focus()
    }, [state.editing])

    const start = () => {
        if (!disabled) dispatch({ type: 'start', draft: draftOf(value) })
    }

    const commit = (draft: string, leaving: boolean) => {
        if (state.saving) return
        if (draft === draftOf(value) && state.error === null) return dispatch({ type: 'cancel' })
        if (leaving && state.error !== null && draft === refused.current) return
        const read = readDraft(draft, kind, words)
        const refusal = 'error' in read ? read.error : (validate?.(read.value) ?? null)
        if (refusal !== null && refusal !== '') {
            refused.current = draft
            return dispatch({ type: 'failed', error: refusal })
        }
        const next = 'value' in read ? read.value : null
        dispatch({ type: 'save' })
        const mine = ++attempt.current
        // A save that throws at once is a refusal like one that rejects later.
        Promise.resolve()
            .then(() => save(next))
            .then(
                () => {
                    if (mine !== attempt.current) return
                    if (props.value === undefined) setOwn(next)
                    dispatch({ type: 'saved' })
                },
                (error: unknown) => {
                    if (mine !== attempt.current) return
                    refused.current = draft
                    dispatch({ type: 'failed', error: failureOf(error, words) })
                },
            )
    }

    const onMove = (move: EditMove) => {
        refocus.current = true
        if (move === 'cancel') dispatch({ type: 'cancel' })
        else commit(state.draft, false)
    }

    const title = variant === 'title'
    if (state.editing && !disabled) {
        return (
            <InlineEditor
                kind={kind}
                look={variant}
                label={label}
                draft={state.draft}
                onDraftChange={(draft) => dispatch({ type: 'change', draft })}
                options={options}
                saving={state.saving}
                error={state.error}
                selectAll
                placeholder={placeholder}
                weekStartsOn={props.weekStartsOn}
                onMove={onMove}
                onChoose={(choice) => {
                    refocus.current = true
                    dispatch({ type: 'change', draft: choice })
                    commit(choice, false)
                }}
                onLeave={() => {
                    refocus.current = false
                    if (state.saving) return
                    if (blur === 'cancel') dispatch({ type: 'cancel' })
                    else commit(state.draft, true)
                }}
                onRefuse={(message, leaving) => {
                    if (leaving && blur === 'cancel') return dispatch({ type: 'cancel' })
                    refused.current = state.draft
                    dispatch({ type: 'failed', error: message })
                }}
                words={words}
                className={className}
            />
        )
    }

    const empty = value === null || value === ''
    const shown = empty ? (placeholder ?? words.empty) : display !== undefined ? display(value) : shownValue(value, kind, options)
    const text = (
        <span
            className={cn(
                'min-w-0 flex-1',
                kind === 'multiline' ? 'break-words whitespace-pre-wrap' : title ? 'break-words' : 'truncate',
                (kind === 'number' || kind === 'time') && 'tabular-nums',
                empty && 'text-muted-foreground',
            )}
        >
            {shown}
        </span>
    )
    // A field is boxed as its editor is; a title has no box, only the rule its editor draws under it, so it stays in its place.
    const look = cn(
        'flex min-w-0 items-center gap-2 text-left',
        title
            ? 'w-fit max-w-full border-b-2 border-transparent py-0.5 font-heading text-page-title text-page-title-ink'
            : 'min-h-(--density-control) w-full rounded-control border border-transparent px-2.5 py-1 text-sm',
        kind === 'multiline' && 'items-start',
        className,
    )
    if (disabled) {
        return (
            <span data-slot="inline-edit" className={look}>
                {text}
            </span>
        )
    }
    return (
        <button
            ref={button}
            type="button"
            data-slot="inline-edit"
            onClick={start}
            onKeyDown={(event) => {
                if (event.key !== 'F2') return
                event.preventDefault()
                start()
            }}
            className={cn(
                look,
                'group/inline-edit cursor-text outline-none hover:border-input focus-visible:border-ring',
                !title && 'hover:bg-hover focus-visible:ring-1 focus-visible:ring-ring',
            )}
        >
            {text}
            <PencilIcon
                aria-hidden
                className={cn(
                    'shrink-0 text-muted-foreground opacity-0 group-hover/inline-edit:opacity-100 pointer-coarse:opacity-100',
                    title ? 'size-4' : 'size-3.5',
                    kind === 'multiline' && 'mt-0.5',
                )}
            />
            <span className="sr-only">
                {words.edit} {label}
            </span>
        </button>
    )
}
