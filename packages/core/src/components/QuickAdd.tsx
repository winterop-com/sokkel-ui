import { CornerDownLeft, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'

import { cn } from '../lib/cn'
import { failureOf } from '../lib/edit'
import { ISSUE_WORDS, IssueMark, type IssueWords } from './IssueMark'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'

/** The words a quick add says, in English unless an app passes its own. */
export interface QuickAddWords extends IssueWords {
    /** The button at the field's end that adds what is typed, for a screen without Enter at hand. */
    add: string
    /** The spinner's name while an add runs. */
    adding: string
    /** What a refused add says when the app's error carries no message. */
    failed: string
}

const WORDS: QuickAddWords = { add: 'Add', adding: 'Adding', failed: 'Could not add', ...ISSUE_WORDS }

export interface QuickAddProps {
    /**
     * Adds what is typed, trimmed. A promise holds the field pending until it settles, the text kept
     * read only with a spinner; once it resolves the field empties for the next one, and a rejection
     * keeps the text with the rejection's message in the mark at the field's end.
     */
    onAdd: (text: string) => void | Promise<void>
    /** Checks the text before it is added: a message refuses it, as a rejection would. */
    validate?: (text: string) => string | null | undefined
    /** The field's placeholder and its name to a screen reader. */
    placeholder?: string
    /** The glyph at the field's start; a plus by default. */
    icon?: ReactNode
    disabled?: boolean
    /** The text, held from outside with `onValueChange`; else the field holds its own from `defaultValue`. */
    value?: string
    defaultValue?: string
    onValueChange?: (text: string) => void
    /** Opens in a state, as a story draws one still: an add running, or refused with a message. */
    defaultState?: { adding?: boolean; error?: string }
    /** The text input itself, so a command elsewhere can move the focus to it. */
    inputRef?: Ref<HTMLInputElement>
    words?: Partial<QuickAddWords>
    className?: string
}

/**
 * The field at the top of a list that adds a row: type, press Enter, and the field empties for
 * the next one. While the app's `onAdd` promise runs, the text stays, read only, with a spinner;
 * a rejection keeps it with the reason in the issue mark at the field's end, opened at once, and
 * typing clears it. Escape empties the field, then leaves it. A button at the end adds what is
 * typed without Enter.
 *
 * It is drawn as `SearchField` is, a glyph before the text, so the two sit side by side in a
 * toolbar as one family.
 */
export function QuickAdd({
    onAdd,
    validate,
    placeholder = 'Add',
    icon,
    disabled = false,
    value,
    defaultValue = '',
    onValueChange,
    defaultState,
    inputRef,
    words: given,
    className,
}: QuickAddProps) {
    const words = { ...WORDS, ...given }
    const [own, setOwn] = useState(defaultValue)
    const text = value ?? own
    const [adding, setAdding] = useState(defaultState?.adding === true)
    const [error, setError] = useState<string | null>(defaultState?.error ?? null)
    // A refusal opens its mark at once, so it is read without a second press; typing closes it.
    const [markOpen, setMarkOpen] = useState(error !== null)
    useEffect(() => setMarkOpen(error !== null), [error])
    const attempt = useRef(0)

    const setText = (next: string) => {
        if (value === undefined) setOwn(next)
        onValueChange?.(next)
    }

    const add = () => {
        const wanted = text.trim()
        if (wanted === '' || adding || disabled) return
        const refusal = validate?.(wanted) ?? null
        if (refusal !== null && refusal !== '') return setError(refusal)
        setError(null)
        const mine = ++attempt.current
        let result: void | Promise<void>
        try {
            result = onAdd(wanted)
        } catch (thrown) {
            return setError(failureOf(thrown, words))
        }
        const pending = result as PromiseLike<void> | undefined
        if (typeof pending?.then !== 'function') return setText('')
        setAdding(true)
        Promise.resolve(pending).then(
            () => {
                if (mine !== attempt.current) return
                setAdding(false)
                setText('')
            },
            (thrown: unknown) => {
                if (mine !== attempt.current) return
                setAdding(false)
                setError(failureOf(thrown, words))
            },
        )
    }

    return (
        <label
            data-slot="quick-add"
            aria-busy={adding || undefined}
            className={cn(
                'relative flex h-(--density-control) min-w-0 items-center gap-2 rounded-control border border-input bg-field px-2.5 text-sm transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
                error !== null && 'border-critical/80 pr-9 focus-within:border-critical focus-within:ring-critical/25',
                className,
            )}
        >
            {icon ?? <Plus className="size-4 shrink-0 text-faint" aria-hidden />}
            <Input
                bare
                ref={inputRef}
                value={text}
                placeholder={placeholder}
                aria-label={placeholder}
                aria-invalid={error !== null || undefined}
                readOnly={adding}
                disabled={disabled}
                autoComplete="off"
                className="flex-1 placeholder:text-faint"
                onChange={(event) => {
                    setError(null)
                    setText(event.target.value)
                }}
                onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return
                    if (event.key === 'Enter') {
                        event.preventDefault()
                        add()
                    } else if (event.key === 'Escape' && !adding) {
                        if (text === '') return event.currentTarget.blur()
                        event.preventDefault()
                        setError(null)
                        setText('')
                    }
                }}
            />
            {adding ? (
                <Spinner className="size-3.5 shrink-0 text-muted-foreground" aria-label={words.adding} />
            ) : error !== null ? (
                <IssueMark issues={[{ tone: 'critical', text: error }]} open={markOpen} onOpenChange={setMarkOpen} words={words} />
            ) : (
                text.trim() !== '' && (
                    <button
                        type="button"
                        aria-label={words.add}
                        title={words.add}
                        disabled={disabled}
                        className="flex size-5 items-center justify-center rounded-sm text-faint hover:text-foreground"
                        onClick={add}
                    >
                        <CornerDownLeft className="size-3.5" aria-hidden />
                    </button>
                )
            )}
        </label>
    )
}
