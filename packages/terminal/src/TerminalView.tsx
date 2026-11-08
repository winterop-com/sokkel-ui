import '@xterm/xterm/css/xterm.css'

import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal as Xterm } from '@xterm/xterm'
import { ArrowDown, Check, Copy, Eraser } from 'lucide-react'
import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'

import { readTerminalLook, useLookKey } from './look'

/** A terminal's size in character cells. */
export interface TerminalSize {
    cols: number
    rows: number
}

/** What an app does to a terminal from outside: write the bytes its connection brings, and the rest. */
export interface TerminalHandle {
    /** Writes output, with its escape sequences, as a program writes to its terminal. */
    write: (data: string | Uint8Array) => void
    /** Clears the scrollback and the screen but the cursor's line, as Ctrl+L does in a shell. */
    clear: () => void
    /** Clears everything and puts the terminal back as it started. */
    reset: () => void
    focus: () => void
    /** The text in the scrollback and on the screen, a line wrapped to the width joined back into one. */
    text: () => string
    size: () => TerminalSize
}

export interface TerminalViewWords {
    copy: string
    copied: string
    clear: string
    latest: string
}

const WORDS: TerminalViewWords = { copy: 'Copy', copied: 'Copied', clear: 'Clear', latest: 'Jump to latest' }

export interface TerminalViewProps {
    ref?: Ref<TerminalHandle>
    /** Keystrokes and paste, as the bytes to send to the program on the other end. */
    onData?: (data: string) => void
    /** The size in cells, once it is first known and whenever the box it fills changes. */
    onResize?: (size: TerminalSize) => void
    /** The title a program set with an escape sequence. */
    onTitleChange?: (title: string) => void
    /** A link in the output was opened; without it the link opens in a new tab. */
    onLink?: (uri: string, event: MouseEvent) => void
    /** What runs here, in a title bar with copy: a host, a job, a shell. Without it, and without `actions` or `onClear`, there is no bar. */
    title?: ReactNode
    /** More controls in the title bar. */
    actions?: ReactNode
    /** Shows a clear button in the title bar, which clears the screen and then calls this. */
    onClear?: () => void
    /** Takes no keystrokes and draws no cursor of its own; output only. */
    readOnly?: boolean
    cursorBlink?: boolean
    /** Lines kept above the screen. */
    scrollback?: number
    /** A fixed number of rows, so the terminal is as tall as they are; without it, it fills the height it is given. */
    rows?: number
    autoFocus?: boolean
    className?: string
    words?: TerminalViewWords
}

/** The buffer's text, each line wrapped to the width joined back to the line it continues. */
function bufferText(term: Xterm): string {
    const buffer = term.buffer.active
    const lines: string[] = []
    for (let index = 0; index < buffer.length; index++) {
        const line = buffer.getLine(index)
        if (line === undefined) continue
        const text = line.translateToString(true)
        if (line.isWrapped && lines.length > 0) lines[lines.length - 1] += text
        else lines.push(text)
    }
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    return lines.join('\n')
}

/**
 * An interactive terminal, drawn by xterm.js on the terminal ground in the theme's colors and mono
 * typeface. It fills its box and reports its size in cells as the box changes, sends keystrokes and
 * paste through `onData`, and takes output through its handle's `write`; the connection to the
 * program on the other end stays the app's. Full emulation, so a program that moves the cursor or
 * takes the whole screen draws as it would in any terminal, with a scrollback, selection and copy.
 * Scrolled up while output arrives, the view stays put and a button brings it back.
 */
export function TerminalView({
    ref,
    onData,
    onResize,
    onTitleChange,
    onLink,
    title,
    actions,
    onClear,
    readOnly = false,
    cursorBlink = true,
    scrollback = 5000,
    rows,
    autoFocus = false,
    className,
    words = WORDS,
}: TerminalViewProps) {
    const frame = useRef<HTMLDivElement>(null)
    const host = useRef<HTMLDivElement>(null)
    const term = useRef<Xterm | null>(null)
    const fit = useRef<FitAddon | null>(null)
    /** Output written before the terminal exists, written to it once it does. */
    const pending = useRef<(string | Uint8Array)[]>([])
    /** Writes the terminal has not yet parsed, and whether it has opened; the frame says it is settling until both are done. */
    const busy = useRef({ writes: 0, open: false })
    const [away, setAway] = useState(false)
    const [copied, setCopied] = useState(false)
    const lookKey = useLookKey()

    const handlers = useRef({ onData, onResize, onTitleChange, onLink })
    handlers.current = { onData, onResize, onTitleChange, onLink }
    const fixedRows = useRef(rows)
    fixedRows.current = rows

    const settle = () => {
        const element = frame.current
        if (element === null) return
        if (busy.current.open && busy.current.writes === 0) element.removeAttribute('data-settling')
        else element.setAttribute('data-settling', '')
    }

    const write = (data: string | Uint8Array) => {
        const current = term.current
        if (current === null) {
            pending.current.push(data)
            return
        }
        busy.current.writes += 1
        settle()
        current.write(data, () => {
            busy.current.writes -= 1
            settle()
        })
    }

    const fitNow = () => {
        const current = term.current
        const addon = fit.current
        if (current === null || addon === null || current.element === undefined) return
        if (fixedRows.current === undefined) {
            addon.fit()
            return
        }
        const proposed = addon.proposeDimensions()
        const cols = proposed === undefined || Number.isNaN(proposed.cols) ? current.cols : proposed.cols
        if (cols !== current.cols || fixedRows.current !== current.rows) current.resize(cols, fixedRows.current)
    }

    useImperativeHandle(
        ref,
        () => ({
            write,
            clear: () => term.current?.clear(),
            reset: () => {
                pending.current = []
                term.current?.reset()
            },
            focus: () => term.current?.focus(),
            text: () => (term.current === null ? '' : bufferText(term.current)),
            size: () => ({ cols: term.current?.cols ?? 0, rows: term.current?.rows ?? 0 }),
        }),
        // The handle reads the terminal through refs, so one handle serves the component's whole life.
        // oxlint-disable-next-line react/exhaustive-deps
        [],
    )

    useEffect(() => {
        const element = host.current
        if (element === null) return
        const look = readTerminalLook(element)
        const current = new Xterm({
            ...look,
            cursorBlink,
            cursorInactiveStyle: readOnly ? 'block' : 'outline',
            disableStdin: readOnly,
            scrollback,
            ...(fixedRows.current === undefined ? {} : { rows: fixedRows.current }),
            allowProposedApi: false,
        })
        const addon = new FitAddon()
        current.loadAddon(addon)
        current.loadAddon(
            new WebLinksAddon((event, uri) => {
                if (handlers.current.onLink !== undefined) handlers.current.onLink(uri, event)
                else window.open(uri, '_blank', 'noopener')
            }),
        )
        term.current = current
        fit.current = addon
        busy.current = { writes: 0, open: false }
        settle()

        const checkAway = () => {
            const buffer = current.buffer.active
            setAway(buffer.viewportY < buffer.baseY)
        }
        const subscriptions = [
            current.onData((data) => handlers.current.onData?.(data)),
            current.onResize((size) => handlers.current.onResize?.({ cols: size.cols, rows: size.rows })),
            current.onTitleChange((text) => handlers.current.onTitleChange?.(text)),
            current.onScroll(checkAway),
            current.onWriteParsed(checkAway),
        ]
        for (const data of pending.current) write(data)
        pending.current = []

        let alive = true
        let frameId = 0
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(frameId)
            frameId = requestAnimationFrame(fitNow)
        })
        // xterm measures a cell once, when it opens, so it opens once the typeface has loaded.
        void document.fonts
            .load(`${look.fontSize}px ${look.fontFamily}`)
            .catch(() => undefined)
            .then(() => {
                if (!alive) return
                current.open(element)
                const before = { cols: current.cols, rows: current.rows }
                fitNow()
                // A fit that kept xterm's starting size fires no resize, so the first size is reported here.
                if (current.cols === before.cols && current.rows === before.rows) {
                    handlers.current.onResize?.({ cols: current.cols, rows: current.rows })
                }
                observer.observe(element)
                if (autoFocus) current.focus()
                busy.current.open = true
                settle()
            })

        return () => {
            alive = false
            cancelAnimationFrame(frameId)
            observer.disconnect()
            for (const subscription of subscriptions) subscription.dispose()
            current.dispose()
            term.current = null
            fit.current = null
        }
        // The terminal is made once; its options follow below without making it again.
        // oxlint-disable-next-line react/exhaustive-deps
    }, [])

    useEffect(() => {
        const current = term.current
        if (current === null) return
        current.options.cursorBlink = cursorBlink
        current.options.disableStdin = readOnly
        current.options.cursorInactiveStyle = readOnly ? 'block' : 'outline'
        current.options.scrollback = scrollback
        fitNow()
        // oxlint-disable-next-line react/exhaustive-deps
    }, [cursorBlink, readOnly, scrollback, rows])

    // The theme, scheme or typeface changed: read the look again and measure the cells anew.
    const firstLook = useRef(true)
    useEffect(() => {
        if (firstLook.current) {
            firstLook.current = false
            return
        }
        const element = host.current
        const current = term.current
        if (element === null || current === null) return
        const look = readTerminalLook(element)
        let alive = true
        void document.fonts
            .load(`${look.fontSize}px ${look.fontFamily}`)
            .catch(() => undefined)
            .then(() => {
                if (!alive) return
                current.options.theme = look.theme
                current.options.fontFamily = look.fontFamily
                current.options.fontSize = look.fontSize
                current.options.lineHeight = look.lineHeight
                fitNow()
            })
        return () => {
            alive = false
        }
        // oxlint-disable-next-line react/exhaustive-deps
    }, [lookKey])

    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 1500)
        return () => clearTimeout(timer)
    }, [copied])

    const copy = () => {
        const current = term.current
        if (current === null) return
        const text = current.hasSelection() ? current.getSelection() : bufferText(current)
        navigator.clipboard.writeText(text).then(
            () => setCopied(true),
            () => undefined,
        )
    }

    const bar = title !== undefined || actions !== undefined || onClear !== undefined
    const tool =
        'flex size-6 items-center justify-center rounded-sm text-terminal-muted outline-none hover:bg-terminal-foreground/10 hover:text-terminal-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring'

    return (
        <div
            ref={frame}
            data-settling=""
            className={cn(
                'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-terminal-bar bg-terminal font-mono text-xs leading-5',
                rows === undefined && 'h-full',
                className,
            )}
        >
            {bar && (
                <div className="flex h-8 shrink-0 items-center gap-2 border-b border-terminal-foreground/10 bg-terminal-bar px-3">
                    <span className="min-w-0 flex-1 truncate text-terminal-muted">{title}</span>
                    {actions}
                    <button
                        type="button"
                        aria-label={copied ? words.copied : words.copy}
                        title={copied ? words.copied : words.copy}
                        className={tool}
                        onClick={copy}
                    >
                        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                    </button>
                    {onClear !== undefined && (
                        <button
                            type="button"
                            aria-label={words.clear}
                            title={words.clear}
                            className={tool}
                            onClick={() => {
                                term.current?.clear()
                                onClear()
                            }}
                        >
                            <Eraser className="size-3.5" aria-hidden />
                        </button>
                    )}
                </div>
            )}
            <div className={cn('relative min-h-0 py-2 pl-3', rows === undefined && 'flex-1')}>
                <div ref={host} className={cn('w-full', rows === undefined && 'h-full')} />
                {away && (
                    <button
                        type="button"
                        onClick={() => {
                            term.current?.scrollToBottom()
                            setAway(false)
                        }}
                        className="absolute right-5 bottom-3 z-10 flex items-center gap-1 rounded-md border border-terminal-foreground/15 bg-terminal-bar px-2 py-1 font-sans text-xs text-terminal-foreground shadow-pop hover:bg-terminal-foreground/10"
                    >
                        <ArrowDown className="size-3.5" aria-hidden />
                        {words.latest}
                    </button>
                )}
            </div>
        </div>
    )
}
