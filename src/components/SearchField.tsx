import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { cn } from '../lib/cn'

/**
 * The one search box: a glyph, the text, a clear button once there is text, and the `/` key that
 * focuses it from anywhere on the page. Escape clears it, then leaves it.
 *
 * A single border recolors on focus; there is no ring outside it, so a focused field shows one
 * outline, not two.
 */
export function SearchField({
    value,
    onChange,
    placeholder = 'Search',
    shortcut = true,
    className,
    words = { clear: 'Clear the search' },
}: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    /** Whether `/` focuses this field. Only one field on a page should take it. */
    shortcut?: boolean
    className?: string
    words?: { clear: string }
}) {
    const input = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        if (!shortcut) return
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
            const target = event.target as HTMLElement | null
            if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
            event.preventDefault()
            input.current?.focus()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [shortcut])

    return (
        <label
            data-slot="search-field"
            className={cn(
                'flex h-(--density-control) min-w-0 items-center gap-2 rounded-control border border-input bg-field px-2.5 text-sm transition-colors focus-within:border-ring',
                className,
            )}
        >
            <Search className="size-4 shrink-0 text-faint" aria-hidden />
            <input
                ref={input}
                type="search"
                value={value}
                placeholder={placeholder}
                aria-label={placeholder}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key !== 'Escape') return
                    if (value === '') event.currentTarget.blur()
                    else onChange('')
                }}
            />
            {value !== '' ? (
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
                shortcut && <kbd className="font-mono text-xs text-faint">/</kbd>
            )}
        </label>
    )
}
