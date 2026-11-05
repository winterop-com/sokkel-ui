import { useEffect, useState, type RefObject } from 'react'

import { cn } from '../lib/cn'

/** One entry of a table of contents: the heading's id, its text, and its level. */
export interface ContentsEntry {
    id: string
    label: string
    level: number
}

/** The nearest ancestor that scrolls, or null when the window does. */
function scroller(element: HTMLElement): HTMLElement | null {
    for (let node = element.parentElement; node !== null; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY
        if (overflow === 'auto' || overflow === 'scroll') return node
    }
    return null
}

/**
 * The id of the heading a reader is in: the last of `ids` whose heading has reached the top of
 * the scrolling box (within `offset` pixels), or the first while none has. It follows the nearest
 * scrolling ancestor of `container`, and the window when nothing nearer scrolls.
 */
export function useActiveHeading(container: RefObject<HTMLElement | null>, ids: readonly string[], offset = 96): string | undefined {
    const [active, setActive] = useState<string | undefined>(ids[0])
    const key = ids.join('\n')
    useEffect(() => {
        const host = container.current
        if (host === null) return
        const box = scroller(host)
        const target: HTMLElement | Window = box ?? window
        const update = () => {
            const top = box === null ? 0 : box.getBoundingClientRect().top
            let current = ids[0]
            for (const id of ids) {
                const heading = host.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
                if (heading !== null && heading.getBoundingClientRect().top - top <= offset) current = id
            }
            // At the bottom of the page the last heading may never reach the top; it is the one in view.
            if (box !== null && box.scrollTop > 0 && box.scrollTop + box.clientHeight >= box.scrollHeight - 2) current = ids[ids.length - 1]
            setActive(current)
        }
        update()
        target.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        return () => {
            target.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
        }
        // `key` stands for `ids`, which a caller usually rebuilds on every render.
    }, [container, key, offset])
    return active
}

/**
 * An "on this page" list beside a long page: its headings, the deeper ones indented, the one the
 * reader is in marked with a bar. A press scrolls its heading into view; `onJump` replaces that.
 * `useActiveHeading` says which entry is current as the page scrolls.
 */
export function TableOfContents({
    entries,
    active,
    onJump,
    className,
    words = { title: 'On this page' },
}: {
    entries: readonly ContentsEntry[]
    /** The id of the heading the reader is in. */
    active?: string
    onJump?: (id: string) => void
    className?: string
    words?: { title: string }
}) {
    if (entries.length === 0) return null
    const top = Math.min(...entries.map((entry) => entry.level))
    return (
        <nav aria-label={words.title} className={cn('flex flex-col gap-2 text-sm', className)}>
            <h2 className="text-xs font-medium tracking-wide text-faint uppercase">{words.title}</h2>
            <ol className="flex flex-col border-l border-border">
                {entries.map((entry) => {
                    const on = entry.id === active
                    return (
                        <li key={entry.id}>
                            <a
                                href={`#${entry.id}`}
                                aria-current={on ? 'location' : undefined}
                                onClick={(event) => {
                                    event.preventDefault()
                                    if (onJump !== undefined) onJump(entry.id)
                                    else document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }}
                                style={{ paddingLeft: `calc(${entry.level - top} * 0.75rem + 0.75rem)` }}
                                className={cn(
                                    '-ml-px block truncate border-l-2 py-1 pr-2 leading-snug outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    on
                                        ? 'border-primary font-medium text-foreground'
                                        : 'border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground',
                                )}
                            >
                                {entry.label}
                            </a>
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
