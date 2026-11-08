import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'

export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

/** One line of a log. */
export interface LogLine {
    /** When it was written, already formatted: `14:02:11.204`. */
    at?: string
    level?: LogLevel
    /** Where it came from: a step, a service, a logger. */
    source?: string
    text: string
}

const LEVEL: Record<LogLevel, string> = {
    debug: 'text-terminal-faint',
    info: 'text-terminal-muted',
    warning: 'text-terminal-warning',
    error: 'text-terminal-critical',
}

/** The text with every case-insensitive match of the query marked. */
function marked(text: string, query: string): ReactNode {
    if (query === '') return text
    const lower = text.toLowerCase()
    const needle = query.toLowerCase()
    const parts: ReactNode[] = []
    let from = 0
    for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
        if (at > from) parts.push(text.slice(from, at))
        parts.push(
            <mark key={at} className="rounded-sm bg-terminal-accent/30 text-terminal-foreground">
                {text.slice(at, at + needle.length)}
            </mark>,
        )
        from = at + needle.length
    }
    parts.push(text.slice(from))
    return parts
}

/**
 * A log on the terminal ground: time, level, source and text in columns, levels inked, lines
 * numbered. `follow` keeps the newest line in view as lines arrive, until the reader scrolls up;
 * `query` marks its matches. Long lines wrap when `wrap` is set and scroll sideways otherwise.
 * It is set in the terminal face, `--typeface-terminal`, whose Nerd Font icons a line can carry.
 */
export function LogView({
    lines,
    follow = false,
    wrap = false,
    query = '',
    numbered = true,
    className,
}: {
    lines: readonly LogLine[]
    follow?: boolean
    wrap?: boolean
    query?: string
    numbered?: boolean
    className?: string
}) {
    const scroller = useRef<HTMLDivElement>(null)
    const pinned = useRef(true)
    useEffect(() => {
        const element = scroller.current
        if (follow && pinned.current && element !== null) element.scrollTop = element.scrollHeight
    }, [follow, lines.length])
    return (
        <div
            ref={scroller}
            tabIndex={0}
            onScroll={(event) => {
                const element = event.currentTarget
                pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 8
            }}
            className={cn(
                'min-h-0 overflow-auto rounded-lg bg-terminal py-2 font-mono text-xs leading-5 text-terminal-foreground outline-none [--typeface-mono:var(--typeface-terminal)] focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
        >
            <table className={cn('border-separate border-spacing-0', wrap ? 'w-full' : 'min-w-full')}>
                <tbody>
                    {lines.map((line, index) => (
                        <tr key={index} className="align-top hover:bg-terminal-bar">
                            {numbered && (
                                <td className="w-10 pr-3 pl-3 text-right text-terminal-faint tabular-nums select-none">{index + 1}</td>
                            )}
                            {line.at !== undefined && (
                                <td className="pr-3 whitespace-nowrap text-terminal-muted tabular-nums">{line.at}</td>
                            )}
                            {line.level !== undefined && (
                                <td className={cn('w-14 pr-3 whitespace-nowrap uppercase', LEVEL[line.level])}>
                                    {line.level === 'warning' ? 'warn' : line.level}
                                </td>
                            )}
                            {line.source !== undefined && <td className="pr-3 whitespace-nowrap text-terminal-accent">{line.source}</td>}
                            <td
                                className={cn(
                                    'w-full pr-3',
                                    wrap ? '[overflow-wrap:anywhere] whitespace-pre-wrap' : 'whitespace-pre',
                                    line.level === 'error' && 'text-terminal-critical',
                                )}
                            >
                                {marked(line.text, query)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
