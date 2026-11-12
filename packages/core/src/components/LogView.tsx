import { ArrowDown } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

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
    /** False keeps this line's source plain where `onSource` makes the others buttons. */
    sourceLink?: boolean
    /** A mark before the text, such as the fan-out item the line belongs to. */
    item?: string
    text: string
    /** Extras after the text in muted ink: `key=value` pairs, or one string as it is. */
    fields?: string | Readonly<Record<string, string | number | boolean>>
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
    /** The button that scrolls back to the newest line once the reader has scrolled away from it. */
    jump: string
}

const WORDS: LogViewWords = { empty: 'Nothing logged yet.', jump: 'Jump to newest' }

/** A line's extras as written: `key=value` pairs joined by spaces. */
function fieldsText(fields: NonNullable<LogLine['fields']>): string {
    return typeof fields === 'string'
        ? fields
        : Object.entries(fields)
              .map(([key, value]) => `${key}=${String(value)}`)
              .join(' ')
}

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
    /** Called as a following log is left by the reader scrolling up, and as it is caught up again. */
    onFollowChange?: (following: boolean) => void
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
 * `onSource` makes each line's source a button, so a step's name opens that step, save a line
 * with `sourceLink: false`. With no lines it says `words.empty`, or shows `empty` in its place. A
 * following log the reader scrolls up from shows `words.jump`, which brings the newest line back;
 * `onFollowChange` tells the app as it is left and caught up. A line's `item` marks the text, and its
 * `fields` follow it in muted ink. Every line keeps the columns any line has, so they stay aligned.
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
    onFollowChange,
    className,
    words: given,
}: LogViewProps) {
    const words = { ...WORDS, ...given }
    const scroller = useRef<HTMLDivElement>(null)
    const pinned = useRef(true)
    const [away, setAway] = useState(false)
    const told = useRef(onFollowChange)
    told.current = onFollowChange
    useEffect(() => {
        const element = scroller.current
        if (follow && pinned.current && element !== null) element.scrollTop = element.scrollHeight
    }, [follow, lines.length])
    const columns = {
        at: lines.some((line) => line.at !== undefined),
        level: lines.some((line) => line.level !== undefined),
        source: lines.some((line) => line.source !== undefined),
    }
    const toEnd = () => {
        const element = scroller.current
        if (element === null) return
        element.scrollTop = element.scrollHeight
        pinned.current = true
        setAway(false)
        told.current?.(true)
    }
    return (
        <div className={cn('relative flex min-h-0 flex-col', className)}>
            <div
                ref={scroller}
                tabIndex={0}
                onScroll={(event) => {
                    const element = event.currentTarget
                    const atEnd = element.scrollHeight - element.scrollTop - element.clientHeight < 8
                    if (atEnd === pinned.current) return
                    pinned.current = atEnd
                    if (follow) {
                        setAway(!atEnd)
                        told.current?.(atEnd)
                    }
                }}
                className={cn(
                    'min-h-0 flex-1 overflow-auto bg-terminal py-2 font-mono text-xs leading-5 text-terminal-foreground outline-none [--typeface-mono:var(--typeface-terminal)] focus-visible:ring-2 focus-visible:ring-ring',
                    framed && 'rounded-surface',
                    wrap && '@container',
                )}
            >
                {lines.length === 0 && <div className="px-3 text-terminal-muted">{empty ?? words.empty}</div>}
                {/* Wrapped in a narrow log, each line's time, level and source fold onto a line of their own over its text. */}
                <table className={cn('border-separate border-spacing-0', wrap ? 'w-full @max-lg:block' : 'min-w-full')}>
                    <tbody className={cn(wrap && '@max-lg:block')}>
                        {lines.map((line, index) => (
                            <tr
                                key={index}
                                data-slot="log-line"
                                data-level={line.level}
                                className={cn(
                                    'align-top hover:bg-terminal-bar [&>td:first-child]:pl-3',
                                    wrap && '@max-lg:flex @max-lg:flex-wrap @max-lg:pb-1',
                                )}
                            >
                                {numbered && (
                                    <td
                                        data-slot="log-number"
                                        className="w-10 pr-3 pl-3 text-right text-terminal-faint tabular-nums select-none"
                                    >
                                        {index + 1}
                                    </td>
                                )}
                                {columns.at && (
                                    <td data-slot="log-at" className="pr-3 whitespace-nowrap text-terminal-muted tabular-nums">
                                        {line.at}
                                    </td>
                                )}
                                {columns.level && (
                                    <td
                                        data-slot="log-level"
                                        className={cn(
                                            'w-14 pr-3 whitespace-nowrap uppercase',
                                            line.level !== undefined && LEVEL[line.level],
                                        )}
                                    >
                                        {line.level === 'warning' ? 'warn' : line.level}
                                    </td>
                                )}
                                {columns.source && (
                                    <td data-slot="log-source" className="pr-3 whitespace-nowrap text-terminal-accent">
                                        {line.source === undefined ? null : onSource === undefined || line.sourceLink === false ? (
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
                                    data-slot="log-text"
                                    className={cn(
                                        'w-full pr-3',
                                        wrap ? '[overflow-wrap:anywhere] whitespace-pre-wrap @max-lg:basis-full' : 'whitespace-pre',
                                        wrap && (numbered ? '@max-lg:pl-10' : '@max-lg:pl-3'),
                                        line.level === 'error' && 'text-terminal-critical',
                                    )}
                                >
                                    {line.item !== undefined && (
                                        <span data-slot="log-item" className="mr-2 text-terminal-accent">
                                            [{line.item}]
                                        </span>
                                    )}
                                    <Highlight text={line.text} ranges={literalRanges(line.text, query)} tone="terminal" />
                                    {line.fields !== undefined && (
                                        <span data-slot="log-fields" className="ml-2 text-terminal-faint">
                                            {fieldsText(line.fields)}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {follow && away && (
                <button
                    type="button"
                    onClick={toEnd}
                    className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-terminal-bar px-3 py-1 font-sans text-xs text-terminal-foreground shadow-md outline-none hover:bg-terminal-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowDown className="size-3.5" aria-hidden />
                    {words.jump}
                </button>
            )}
        </div>
    )
}
