import { ArrowDown, Check, Copy, Eraser } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { parseAnsi } from './ansi'
import { screenLines, stripAnsi } from './screen'

/** One thing run in a terminal: the command typed and what it wrote. */
export interface TerminalEntry {
    id: string
    command?: string
    /** What the command wrote, with ANSI escape codes, newlines and carriage returns as written. */
    output?: string
    /** How the command ended, drawn after its output: 0 is success. */
    exitCode?: number
}

export interface TerminalWords {
    copy: string
    copied: string
    clear: string
    latest: string
    exited: (code: number) => string
}

const WORDS: TerminalWords = {
    copy: 'Copy',
    copied: 'Copied',
    clear: 'Clear',
    latest: 'Jump to latest',
    exited: (code) => `exited with ${code}`,
}

/** One line of output, its escape codes drawn as colors and weights. */
function AnsiLine({ text }: { text: string }) {
    const spans = useMemo(() => parseAnsi(text), [text])
    if (spans.length === 0) return <>{' '}</>
    return (
        <>
            {spans.map((span, index) => (
                <span
                    key={index}
                    style={{ color: span.style.color }}
                    className={cn(
                        span.style.bold && 'font-semibold',
                        span.style.dim && 'opacity-60',
                        span.style.italic && 'italic',
                        span.style.underline && 'underline',
                    )}
                >
                    {span.text}
                </span>
            ))}
        </>
    )
}

function Entry({
    entry,
    prompt,
    words,
    last,
    streaming,
}: {
    entry: TerminalEntry
    prompt: string
    words: TerminalWords
    last: boolean
    streaming: boolean
}) {
    const lines = useMemo(() => (entry.output === undefined || entry.output === '' ? [] : screenLines(entry.output)), [entry.output])
    const cursor = last && streaming
    return (
        <div className="flex flex-col">
            {entry.command !== undefined && (
                <div className="flex gap-2">
                    <span className="shrink-0 text-terminal-accent select-none">{prompt}</span>
                    <span className="min-w-0 text-terminal-foreground">{entry.command}</span>
                </div>
            )}
            {lines.map((line, index) => (
                <div key={index} className="min-h-5 [overflow-wrap:anywhere] whitespace-pre-wrap text-terminal-foreground">
                    <AnsiLine text={line} />
                    {cursor && index === lines.length - 1 && <Cursor />}
                </div>
            ))}
            {cursor && lines.length === 0 && (
                <div className="min-h-5">
                    <Cursor />
                </div>
            )}
            {entry.exitCode !== undefined && entry.exitCode !== 0 && (
                <div className="text-terminal-critical">{words.exited(entry.exitCode)}</div>
            )}
        </div>
    )
}

function Cursor() {
    return (
        <span
            aria-hidden
            className="ml-px inline-block h-4 w-2 translate-y-0.5 animate-[terminal-blink_1s_steps(1)_infinite] bg-terminal-foreground/80"
        />
    )
}

/**
 * A terminal: a title bar with copy and clear, then commands and what they wrote on the terminal
 * ground, escape codes drawn as colors. While `streaming`, output may arrive a piece at a time: the
 * view follows the newest line unless the reader has scrolled up, when a button brings it back,
 * and a cursor blinks after the last character. A carriage return redraws its line, as a progress
 * bar does.
 */
export function Terminal({
    entries,
    title,
    prompt = '$',
    streaming = false,
    onClear,
    actions,
    className,
    words = WORDS,
}: {
    entries: readonly TerminalEntry[]
    /** What runs here, in the title bar: a host, a job, a shell. */
    title?: ReactNode
    prompt?: string
    streaming?: boolean
    onClear?: () => void
    /** More controls in the title bar. */
    actions?: ReactNode
    className?: string
    words?: TerminalWords
}) {
    const scroller = useRef<HTMLDivElement>(null)
    const pinned = useRef(true)
    const [away, setAway] = useState(false)
    const [copied, setCopied] = useState(false)
    const size = entries.reduce((total, entry) => total + (entry.output?.length ?? 0) + (entry.command?.length ?? 0), 0)

    useEffect(() => {
        const element = scroller.current
        if (element !== null && pinned.current) element.scrollTop = element.scrollHeight
    }, [size, entries.length])

    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 1500)
        return () => clearTimeout(timer)
    }, [copied])

    const text = () =>
        entries
            .map((entry) =>
                [
                    entry.command !== undefined ? `${prompt} ${entry.command}` : null,
                    entry.output !== undefined ? screenLines(entry.output).map(stripAnsi).join('\n') : null,
                ]
                    .filter((part) => part !== null)
                    .join('\n'),
            )
            .join('\n')
    const tool =
        'flex size-6 items-center justify-center rounded-sm text-terminal-muted outline-none hover:bg-terminal-foreground/10 hover:text-terminal-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring'

    return (
        <div
            className={cn(
                'flex min-h-0 flex-col overflow-hidden rounded-lg border border-terminal-bar bg-terminal font-mono text-xs leading-5',
                className,
            )}
        >
            <div className="flex h-8 shrink-0 items-center gap-2 border-b border-terminal-foreground/10 bg-terminal-bar px-3">
                <span className="min-w-0 flex-1 truncate text-terminal-muted">{title}</span>
                {actions}
                <button
                    type="button"
                    aria-label={copied ? words.copied : words.copy}
                    title={copied ? words.copied : words.copy}
                    className={tool}
                    onClick={() =>
                        navigator.clipboard.writeText(text()).then(
                            () => setCopied(true),
                            () => undefined,
                        )
                    }
                >
                    {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                </button>
                {onClear !== undefined && (
                    <button type="button" aria-label={words.clear} title={words.clear} className={tool} onClick={onClear}>
                        <Eraser className="size-3.5" aria-hidden />
                    </button>
                )}
            </div>
            <div className="relative min-h-0 flex-1">
                <div
                    ref={scroller}
                    role="log"
                    aria-live={streaming ? 'polite' : undefined}
                    tabIndex={0}
                    onScroll={(event) => {
                        const element = event.currentTarget
                        const atEnd = element.scrollHeight - element.scrollTop - element.clientHeight < 8
                        pinned.current = atEnd
                        setAway(!atEnd)
                    }}
                    className="h-full overflow-y-auto px-3 py-2 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                >
                    <div className="flex flex-col gap-2">
                        {entries.map((entry, index) => (
                            <Entry
                                key={entry.id}
                                entry={entry}
                                prompt={prompt}
                                words={words}
                                last={index === entries.length - 1}
                                streaming={streaming}
                            />
                        ))}
                    </div>
                </div>
                {away && (
                    <button
                        type="button"
                        onClick={() => {
                            const element = scroller.current
                            if (element === null) return
                            pinned.current = true
                            setAway(false)
                            element.scrollTop = element.scrollHeight
                        }}
                        className="absolute right-3 bottom-3 flex items-center gap-1 rounded-md border border-terminal-foreground/15 bg-terminal-bar px-2 py-1 font-sans text-xs text-terminal-foreground shadow-pop hover:bg-terminal-foreground/10"
                    >
                        <ArrowDown className="size-3.5" aria-hidden />
                        {words.latest}
                    </button>
                )}
            </div>
        </div>
    )
}
