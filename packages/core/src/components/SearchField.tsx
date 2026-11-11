import { Search, X } from 'lucide-react'
import { useRef, type AriaAttributes, type ComponentProps, type Ref } from 'react'

import { useShortcuts } from '../hooks/use-shortcuts'
import { cn } from '../lib/cn'
import { Input } from './ui/input'

/** The words a search field says. */
export interface SearchFieldWords {
    clear: string
}

const WORDS: SearchFieldWords = {
    clear: 'Clear the search',
}

/** A `data-*` attribute, passed through to the text input as it is. */
export type SearchFieldDataAttributes = { [name: `data-${string}`]: string | number | boolean | undefined }

/** More for the text input: its id, role and handlers, and any `aria-*` or `data-*` attribute. */
export type SearchFieldInputProps = Pick<
    ComponentProps<'input'>,
    'id' | 'role' | 'autoComplete' | 'onClick' | 'onFocus' | 'onBlur' | 'onKeyDown'
> &
    AriaAttributes &
    SearchFieldDataAttributes

export interface SearchFieldProps {
    value: string
    onChange: (value: string) => void
    /** The hint in the empty field; "Search" by default, the page around it naming what is searched. */
    placeholder?: string
    /**
     * The field's name for assistive technology and in the shortcuts dialog, such as "Search jobs"
     * where the placeholder stays "Search"; the placeholder when not given.
     */
    label?: string
    /** Refuses typing, the clear button and the `/` key, and dims the field. */
    disabled?: boolean
    /**
     * Whether `/` focuses this field, bound through `useShortcuts` to this field's own input (no
     * selector looks for it) and listed in the shortcuts dialog by `label`. Only one field on a
     * page should take it; an app that answers `/` itself turns it off.
     */
    shortcut?: boolean
    className?: string
    words?: Partial<SearchFieldWords>
    /** The text input itself, for a part built on the field that moves focus to it. */
    inputRef?: Ref<HTMLInputElement>
    /**
     * More for the text input, for a part built on the field, such as a search whose results open
     * under it: its role and state, handlers, and any `aria-*` or `data-*` attribute, such as a
     * mark an app finds the box by. A key handler that calls `preventDefault` keeps the field's own
     * Escape from running.
     */
    inputProps?: SearchFieldInputProps
}

/**
 * The one search box: a glyph, the text, a clear button once there is text, and the `/` key that
 * focuses it from anywhere on the page. Escape clears it, then leaves it.
 *
 * `label` names the field where the placeholder is only "Search", as for a field whose page
 * already says what it searches. The `/` key is a binding on the field's own input, so it needs no
 * mark on the box; an app that finds the box itself can find `[data-slot=search-field] input`, or
 * mark the input with a `data-*` attribute through `inputProps`.
 *
 * A single border recolors on focus; there is no ring outside it, so a focused field shows one
 * outline, not two.
 */
export function SearchField({
    value,
    onChange,
    placeholder = 'Search',
    label,
    disabled = false,
    shortcut = true,
    className,
    words: given,
    inputRef,
    inputProps,
}: SearchFieldProps) {
    const words = { ...WORDS, ...given }
    const name = label ?? placeholder
    const input = useRef<HTMLInputElement | null>(null)
    const { onKeyDown, ...rest } = inputProps ?? {}

    useShortcuts(shortcut ? [{ id: 'search', key: '/', label: name, disabled, run: () => input.current?.focus() }] : [], [
        shortcut,
        name,
        disabled,
    ])

    return (
        <label
            data-slot="search-field"
            data-disabled={disabled || undefined}
            className={cn(
                'flex h-(--density-control) min-w-0 items-center gap-2 rounded-control border border-input bg-field px-2.5 text-sm transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring max-md:min-h-finger data-disabled:cursor-not-allowed data-disabled:opacity-50',
                className,
            )}
        >
            <Search className="size-4 shrink-0 text-faint" aria-hidden />
            <Input
                bare
                aria-label={name}
                {...rest}
                ref={(node) => {
                    input.current = node
                    if (typeof inputRef === 'function') inputRef(node)
                    else if (inputRef) inputRef.current = node
                }}
                type="search"
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 placeholder:text-faint disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden"
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    onKeyDown?.(event)
                    if (event.defaultPrevented || event.key !== 'Escape') return
                    if (value === '') event.currentTarget.blur()
                    else onChange('')
                }}
            />
            {value !== '' && !disabled ? (
                <button
                    type="button"
                    aria-label={words.clear}
                    title={words.clear}
                    className="flex size-5 items-center justify-center rounded-sm text-faint hover:text-foreground"
                    onClick={() => {
                        onChange('')
                        input.current?.focus()
                    }}
                >
                    <X className="size-3.5" aria-hidden />
                </button>
            ) : (
                shortcut && !disabled && <kbd className="font-mono text-xs text-faint">/</kbd>
            )}
        </label>
    )
}
