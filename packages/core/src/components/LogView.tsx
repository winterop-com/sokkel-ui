import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { literalRanges } from '../lib/search'
import { Highlight } from './Highlight'

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

/** The words a log says, each with an English default. */
export interface LogViewWords {
    /** Said while the log has no lines. */
    empty: string
}

const WORDS: LogViewWords = { empty: 'Nothing logged yet.' }

export interface LogViewProps {
    lines: readonly LogLine[]
    follow?: boolean
    wrap?: boolean
    query?: string
    numbered?: boolean
    /** Rounds the log's corners; off for a log set edge to edge. */
    framed?: boolean
    /** Makes each line's source a button that hands it here, as a step's name opens that step. */
    onSource?: (source: string, line: LogLine) => void
    /** What the log shows while it has no lines, in place of `words.empty`. */
    empty?: ReactNode
    className?: string
    words?: Partial<LogViewWords>
}

/**
 * A log on the terminal ground: time, level, source and text in columns, levels inked, lines
 * numbered. `follow` keeps the newest line in view as lines arrive, until the reader scrolls up;
 * `query` marks its matches. Long lines wrap when `wrap` is set and scroll sideways otherwise;
 * wrapped in a narrow log, as on a phone, a line's time, level and source stand over its text.
 * It is set in the terminal face, `--typeface-terminal`, whose Nerd Font icons a line can carry.
 * `framed={false}` drops its rounded corners, for a log set edge to edge in a dock or a panel.
 * `onSource` makes each line's source a button, so a step's name opens that step. With no lines it
 * says `words.empty`, or shows `empty` in its place.
 */
export function LogView({
    lines,
    follow = false,
    wrap = false,
    query = '',
    numbered = true,
    framed = true,
    onSource,
    empty,
    className,
    words: given,
}: LogViewProps) {
    const words = { ...WORDS, ...given }
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
                'min-h-0 overflow-auto bg-terminal py-2 font-mono text-xs leading-5 text-terminal-foreground outline-none [--typeface-mono:var(--typeface-terminal)] focus-visible:ring-2 focus-visible:ring-ring',
                framed && 'rounded-surface',
                wrap && '@container',
                className,
            )}
        >
            {lines.length === 0 && <div className="px-3 text-terminal-muted">{empty ?? words.empty}</div>}
            {/* Wrapped in a narrow log, each line's time, level and source fold onto a line of their own over its text. */}
            <table className={cn('border-separate border-spacing-0', wrap ? 'w-full @max-lg:block' : 'min-w-full')}>
                <tbody className={cn(wrap && '@max-lg:block')}>
                    {lines.map((line, index) => (
                        <tr
                            key={index}
                            className={cn(
                                'align-top hover:bg-terminal-bar [&>td:first-child]:pl-3',
                                wrap && '@max-lg:flex @max-lg:flex-wrap @max-lg:pb-1',
                            )}
                        >
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
                            {line.source !== undefined && (
                                <td className="pr-3 whitespace-nowrap text-terminal-accent">
                                    {onSource === undefined ? (
                                        line.source
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => onSource(line.source as string, line)}
                                            className="cursor-pointer rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            {line.source}
                                        </button>
                                    )}
                                </td>
                            )}
                            <td
                                className={cn(
                                    'w-full pr-3',
                                    wrap ? '[overflow-wrap:anywhere] whitespace-pre-wrap @max-lg:basis-full' : 'whitespace-pre',
                                    wrap && (numbered ? '@max-lg:pl-10' : '@max-lg:pl-3'),
                                    line.level === 'error' && 'text-terminal-critical',
                                )}
                            >
                                <Highlight text={line.text} ranges={literalRanges(line.text, query)} tone="terminal" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
