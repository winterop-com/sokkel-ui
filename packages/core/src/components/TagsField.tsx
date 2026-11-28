import { useId, useRef, useState, type KeyboardEvent } from 'react'

import { cn } from '../lib/cn'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { Chip } from './Chip'
import { describedBy, Field, FIELD_PART, FIELD_WORDS, type FieldProps, type FieldWords } from './Field'

export interface TagsFieldWords extends FieldWords {
    /** A tag's remove button, by the tag. */
    remove: (tag: string) => string
    /** Said when a tag typed is in already, by the tag. */
    duplicate: (tag: string) => string
    /** Said when the field holds as many tags as it takes, by how many. */
    full: (max: number) => string
    /** The list of suggestions under the input. */
    suggestions: string
}

export const TAGS_FIELD_WORDS: TagsFieldWords = {
    ...FIELD_WORDS,
    remove: (tag) => `Remove ${tag}`,
    duplicate: (tag) => `${tag} is in already`,
    full: (max) => `Up to ${max.toLocaleString('en-US')} tags`,
    suggestions: 'Suggestions',
}

/** Where a catalog holds a tags field's words, and the arguments its phrases name. */
export const TAGS_FIELD_PART: WordsPart<TagsFieldWords> = {
    id: 'tagsField',
    words: TAGS_FIELD_WORDS,
    args: { remove: 'tag', duplicate: 'tag', full: 'max' },
    from: [FIELD_PART],
}

/** A tags field's phrases as ICU messages in English, for the catalog. */
export const TAGS_FIELD_MESSAGES: WordMessages<TagsFieldWords> = {
    remove: 'Remove {tag}',
    duplicate: '{tag} is in already',
    full: 'Up to {max, number} tags',
}

export interface TagsFieldProps extends Omit<FieldProps, 'children' | 'words'> {
    /** The tags, held from outside with `onValueChange`. */
    value?: readonly string[]
    /** The tags it starts with when `value` is not given. */
    defaultValue?: readonly string[]
    onValueChange?: (tags: string[]) => void
    /** Tags offered under the input as it is typed in, those that hold what is typed and are not in already. */
    suggestions?: readonly string[]
    /** The most tags it takes. */
    max?: number
    /** Turns what is typed into a tag, such as to trim or lower its case; the text trimmed by default. */
    normalize?: (text: string) => string
    placeholder?: string
    disabled?: boolean
    words?: Partial<TagsFieldWords>
}

/** How many suggestions the list shows at most. */
const SHOWN = 6

/**
 * Several short values typed into one field, each a chip: Enter or a comma turns what is typed into
 * a tag, Backspace in an empty input takes the last one off, and each chip has its own remove
 * button. As the viewer types, the suggestions that hold the text are offered under the input; the
 * arrow keys move through them and Enter takes the one marked. A tag in already, or one past `max`,
 * is not added, and the field says why.
 */
export function TagsField({
    value,
    defaultValue = [],
    onValueChange,
    suggestions = [],
    max,
    normalize = (text) => text.trim(),
    placeholder,
    disabled = false,
    words: given,
    error,
    issues,
    ...field
}: TagsFieldProps) {
    const words = useWords(TAGS_FIELD_PART, given)
    const [own, setOwn] = useState<readonly string[]>(defaultValue)
    const tags = value ?? own
    const [text, setText] = useState('')
    const [refused, setRefused] = useState<string | null>(null)
    const [marked, setMarked] = useState(-1)
    const input = useRef<HTMLInputElement>(null)
    const list = useId()

    const typed = normalize(text).toLowerCase()
    const offered =
        typed === '' ? [] : suggestions.filter((one) => one.toLowerCase().includes(typed) && !tags.includes(one)).slice(0, SHOWN)
    const full = max !== undefined && tags.length >= max

    const change = (next: string[]) => {
        if (value === undefined) setOwn(next)
        onValueChange?.(next)
    }
    const add = (raw: string) => {
        const tag = normalize(raw)
        if (tag === '') return
        if (tags.includes(tag)) setRefused(words.duplicate(tag))
        else if (full) setRefused(words.full(max))
        else {
            change([...tags, tag])
            setRefused(null)
        }
        setText('')
        setMarked(-1)
    }
    const remove = (tag: string) => {
        change(tags.filter((one) => one !== tag))
        setRefused(null)
        input.current?.focus()
    }

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' && offered.length > 0) {
            event.preventDefault()
            setMarked((at) => (at + 1) % offered.length)
        } else if (event.key === 'ArrowUp' && offered.length > 0) {
            event.preventDefault()
            setMarked((at) => (at <= 0 ? offered.length - 1 : at - 1))
        } else if (event.key === 'Enter' || event.key === ',') {
            if (text.trim() === '' && marked < 0) return
            event.preventDefault()
            add(marked >= 0 && marked < offered.length ? offered[marked] : text)
        } else if (event.key === 'Backspace' && text === '' && tags.length > 0) {
            change(tags.slice(0, -1))
        } else if (event.key === 'Escape' && offered.length > 0) {
            event.preventDefault()
            setText('')
        }
    }

    return (
        <Field {...field} error={error ?? refused} issues={issues} words={words}>
            <div className="relative">
                <div
                    data-slot="tags-frame"
                    onPointerDown={(event) => {
                        if (event.target === event.currentTarget) {
                            event.preventDefault()
                            input.current?.focus()
                        }
                    }}
                    className={cn(
                        'flex min-h-(--density-control) w-full min-w-0 cursor-text flex-wrap items-center gap-1 rounded-control border border-input bg-field px-1.5 py-1 transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring max-md:min-h-finger',
                        disabled && 'cursor-not-allowed opacity-disabled',
                        (error ?? refused) !== null && (error ?? refused) !== undefined && 'border-critical/80',
                    )}
                >
                    {tags.map((tag) => (
                        <Chip key={tag} onRemove={disabled ? undefined : () => remove(tag)} words={{ remove: words.remove }}>
                            {tag}
                        </Chip>
                    ))}
                    <input
                        ref={input}
                        id={field.id}
                        value={text}
                        disabled={disabled}
                        placeholder={tags.length === 0 ? placeholder : undefined}
                        role="combobox"
                        aria-expanded={offered.length > 0}
                        aria-controls={list}
                        aria-autocomplete="list"
                        aria-activedescendant={marked >= 0 && marked < offered.length ? `${list}-${String(marked)}` : undefined}
                        aria-required={field.required || undefined}
                        aria-describedby={describedBy(field.id, field)}
                        onChange={(event) => {
                            const next = event.target.value
                            if (next.includes(',')) {
                                for (const part of next.split(',').slice(0, -1)) add(part)
                                setText(next.split(',').at(-1) ?? '')
                            } else setText(next)
                            setRefused(null)
                            setMarked(-1)
                        }}
                        onKeyDown={onKeyDown}
                        onBlur={() => {
                            if (text.trim() !== '') add(text)
                        }}
                        className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                    />
                </div>
                {offered.length > 0 && (
                    <ul
                        id={list}
                        role="listbox"
                        aria-label={words.suggestions}
                        data-slot="tags-suggestions"
                        className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-control border border-border bg-popover p-1 text-sm text-popover-foreground shadow-pop"
                    >
                        {offered.map((one, index) => (
                            <li
                                key={one}
                                id={`${list}-${String(index)}`}
                                role="option"
                                aria-selected={index === marked}
                                onPointerDown={(event) => {
                                    event.preventDefault()
                                    add(one)
                                }}
                                className={cn('cursor-pointer rounded-mini px-2 py-1', index === marked ? 'bg-hover' : 'hover:bg-hover')}
                            >
                                {one}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Field>
    )
}
