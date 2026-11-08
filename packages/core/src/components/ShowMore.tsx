import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface ShowMoreWords {
    more: string
    less: string
}

const WORDS: ShowMoreWords = { more: 'Show more', less: 'Show less' }

/**
 * A block of text held to a few lines, with Show more under it to read the rest and Show less to
 * fold it again: a description, a prompt, a long note. The control shows only when the text runs
 * past its lines, and is looked for again whenever the block's width changes.
 *
 * `head` is a line over the text, such as a count of views and an age or the settings a prompt ran
 * with; `actions` sit at the block's right end, such as an edit button. `variant="well"` draws it
 * on the muted ground in a rounded box, as a description under a video sits. Open is held by the
 * block unless the app passes `open` and hears `onOpenChange`.
 */
export function ShowMore({
    lines = 2,
    head,
    actions,
    variant = 'plain',
    open: openValue,
    defaultOpen = false,
    onOpenChange,
    children,
    className,
    words: given,
}: {
    /** How many lines show while it is folded. */
    lines?: number
    head?: ReactNode
    actions?: ReactNode
    variant?: 'plain' | 'well'
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    children: ReactNode
    className?: string
    words?: Partial<ShowMoreWords>
}) {
    const words = { ...WORDS, ...given }
    const [own, setOwn] = useState(defaultOpen)
    const open = openValue ?? own
    const [overflows, setOverflows] = useState(false)
    const text = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        const node = text.current
        if (node === null || open) return
        const measure = () => setOverflows(node.scrollHeight > node.clientHeight + 1)
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(node)
        return () => observer.disconnect()
    }, [open, lines, children])

    const toggle = () => {
        if (openValue === undefined) setOwn(!open)
        onOpenChange?.(!open)
    }

    return (
        <div
            data-slot="show-more"
            className={cn('flex min-w-0 items-start gap-3 text-sm', variant === 'well' && 'rounded-surface bg-muted p-3', className)}
        >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                {head !== undefined && <div className="min-w-0">{head}</div>}
                <div
                    ref={text}
                    className={cn('leading-relaxed text-pretty wrap-break-word', !open && 'line-clamp-(--show-more-lines)')}
                    style={{ '--show-more-lines': lines } as CSSProperties}
                >
                    {children}
                </div>
                {(open || overflows) && (
                    <button
                        type="button"
                        aria-expanded={open}
                        onClick={toggle}
                        className="self-start rounded-mini text-sm font-medium outline-none hover:underline hover:underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                        {open ? words.less : words.more}
                    </button>
                )}
            </div>
            {actions !== undefined && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
    )
}
