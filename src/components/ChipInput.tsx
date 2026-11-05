import { X } from 'lucide-react'
import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'

import { cn } from '../lib/cn'

export interface ChipInputWords {
    remove: (value: string) => string
    invalid: (count: number) => string
}

const WORDS: ChipInputWords = {
    remove: (value) => `Remove ${value}`,
    invalid: (count) => (count === 1 ? '1 entry is not valid' : `${String(count)} entries are not valid`),
}

/** Splits typed or pasted text into entries at commas, semicolons, spaces and line breaks. */
export function splitEntries(text: string): string[] {
    return text
        .split(/[\s,;]+/)
        .map((part) => part.trim())
        .filter((part) => part !== '')
}

/**
 * A field that turns what is typed into chips: several email addresses, tags, hosts. An entry
 * becomes a chip at Enter, a comma, a space or when the field loses focus, and a pasted list
 * becomes one chip per entry. Backspace in an empty field takes the last chip back into the text;
 * the chips' remove marks are for a pointer and take no focus.
 * An entry `validate` refuses stays as a chip, drawn in the critical ink, and the field is marked
 * invalid until it is removed. A value already present is not added twice.
 */
export function ChipInput({
    id,
    values,
    onChange,
    validate,
    placeholder,
    defaultText = '',
    mono = false,
    describedBy,
    className,
    words: given,
}: {
    id?: string
    values: readonly string[]
    onChange: (values: string[]) => void
    /** Whether an entry is acceptable; every entry is when omitted. */
    validate?: (value: string) => boolean
    placeholder?: string
    /** Text already typed but not yet a chip. */
    defaultText?: string
    /** Draws the chips in the code face, for hosts or keys. */
    mono?: boolean
    describedBy?: string
    className?: string
    words?: Partial<ChipInputWords>
}) {
    const words = { ...WORDS, ...given }
    const [text, setText] = useState(defaultText)
    const input = useRef<HTMLInputElement>(null)
    const bad = values.filter((value) => validate !== undefined && !validate(value))
    const add = (entries: string[]) => {
        const next = [...values]
        for (const entry of entries) if (!next.includes(entry)) next.push(entry)
        if (next.length !== values.length) onChange(next)
    }
    const commit = () => {
        const entries = splitEntries(text)
        setText('')
        add(entries)
    }
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',' || event.key === ';' || event.key === ' ') {
            if (text.trim() === '') {
                if (event.key !== 'Enter') event.preventDefault()
                return
            }
            event.preventDefault()
            commit()
        } else if (event.key === 'Backspace' && text === '' && values.length > 0) {
            event.preventDefault()
            setText(values[values.length - 1])
            onChange(values.slice(0, -1))
        }
    }
    const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
        const pasted = splitEntries(event.clipboardData.getData('text'))
        if (pasted.length < 2) return
        event.preventDefault()
        add([...splitEntries(text), ...pasted])
        setText('')
    }
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <div
                className={cn(
                    'flex min-h-8 cursor-text flex-wrap items-center gap-1 rounded-lg border border-input bg-field px-1 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
                    bad.length > 0 && 'border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40',
                )}
                onClick={() => input.current?.focus()}
            >
                {values.map((value) => {
                    const refused = validate !== undefined && !validate(value)
                    return (
                        <span
                            key={value}
                            data-invalid={refused || undefined}
                            className={cn(
                                'flex h-[calc(--spacing(5.25))] max-w-full items-center gap-0.5 rounded-sm pl-1.5 text-xs font-medium whitespace-nowrap',
                                refused
                                    ? 'bg-critical/15 text-critical-ink line-through decoration-critical/60'
                                    : 'bg-muted text-foreground',
                                mono && 'font-mono',
                            )}
                        >
                            <span className="truncate">{value}</span>
                            <span
                                role="button"
                                aria-label={words.remove(value)}
                                title={words.remove(value)}
                                className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm opacity-60 hover:opacity-100"
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onChange(values.filter((one) => one !== value))
                                }}
                            >
                                <X className="size-3" aria-hidden />
                            </span>
                        </span>
                    )
                })}
                <input
                    ref={input}
                    id={id}
                    value={text}
                    placeholder={values.length === 0 ? placeholder : undefined}
                    aria-invalid={bad.length > 0 || undefined}
                    aria-describedby={describedBy}
                    className="h-6 min-w-24 flex-1 bg-transparent px-1.5 outline-none placeholder:text-muted-foreground"
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                    onBlur={commit}
                />
            </div>
            {bad.length > 0 && <p className="text-xs text-critical-ink">{words.invalid(bad.length)}</p>}
        </div>
    )
}
