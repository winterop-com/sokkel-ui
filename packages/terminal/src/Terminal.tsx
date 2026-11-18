import { useEffect, useRef, type ReactNode } from 'react'

import { useWords, type WordMessages, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'

import { sessionWrite, type SessionWritten, type TerminalEntry } from './session'
import { TERMINAL_VIEW_PART, TERMINAL_VIEW_WORDS, TerminalView, type TerminalHandle } from './TerminalView'

export type { TerminalEntry } from './session'

export interface TerminalWords {
    copy: string
    copied: string
    clear: string
    latest: string
    exited: (code: number) => string
}

export const TERMINAL_WORDS: TerminalWords = {
    ...TERMINAL_VIEW_WORDS,
    exited: (code) => `exited with ${code}`,
}

/** Where a catalog holds a terminal's words, and the arguments its phrases name; the view's are the view's own. */
export const TERMINAL_PART: WordsPart<TerminalWords> = {
    id: 'terminal',
    words: TERMINAL_WORDS,
    args: { exited: 'code' },
    from: [TERMINAL_VIEW_PART],
}

/** A terminal's phrases as ICU messages in English, for the catalog. */
export const TERMINAL_MESSAGES: WordMessages<TerminalWords> = { exited: 'exited with {code}' }

// xterm draws no cursor until the terminal is focused, typed into or switches screens, so showing it
// also switches to the normal screen, where a read-only terminal already is.
const SHOW_CURSOR = '\u001b[?1047l\u001b[?25h'
const HIDE_CURSOR = '\u001b[?25l'

export interface TerminalProps {
    entries: readonly TerminalEntry[]
    /** What runs here, in the title bar: a host, a job, a shell. */
    title?: ReactNode
    prompt?: string
    streaming?: boolean
    onClear?: () => void
    /** More controls in the title bar. */
    actions?: ReactNode
    /** A fixed number of rows, so the terminal is as tall as they are; without it, it fills the height it is given. */
    rows?: number
    className?: string
    words?: Partial<TerminalWords>
}

/**
 * A terminal that shows commands and what they wrote: a title bar with copy and clear, then each
 * command after its prompt and its output with escape codes drawn as colors, on the same engine as
 * `TerminalView`. While `streaming`, output may arrive a piece at a time: only what was added is
 * written, the view follows the newest line unless the reader has scrolled up, when a button brings
 * it back, and a cursor stands after the last character. A carriage return redraws its line, as a
 * progress bar does. An entry kept as the same object is not read again, so a chunk streamed into a
 * long session costs only the entry it changed.
 */
export function Terminal({
    entries,
    title,
    prompt = '$',
    streaming = false,
    onClear,
    actions,
    rows,
    className,
    words: given,
}: TerminalProps) {
    const view = useRef<TerminalHandle>(null)
    const written = useRef<SessionWritten | undefined>(undefined)
    const words = useWords(TERMINAL_PART, given)
    const exited = words.exited

    // The view disposes its engine when its effects are cleaned up and makes an empty one when they
    // run again, so nothing counts as written until the text is written to the new one.
    useEffect(
        () => () => {
            written.current = undefined
        },
        [],
    )

    useEffect(() => {
        const handle = view.current
        if (handle === null) return
        const before = written.current
        const next = sessionWrite(before, entries, prompt, exited)
        if (next.reset) handle.reset()
        if (next.reset || before === undefined || !before.texts.some((text) => text !== ''))
            handle.write(streaming ? SHOW_CURSOR : HIDE_CURSOR)
        if (next.data !== '') handle.write(next.data)
        written.current = next.written
        // The cursor is written with the text that changes it; `streaming` alone follows below.
        // oxlint-disable-next-line react/exhaustive-deps
    }, [entries, prompt, exited])

    const firstStreaming = useRef(true)
    useEffect(() => {
        if (firstStreaming.current) {
            firstStreaming.current = false
            return
        }
        view.current?.write(streaming ? SHOW_CURSOR : HIDE_CURSOR)
    }, [streaming])

    return (
        <TerminalView
            ref={view}
            readOnly
            cursorBlink={false}
            title={title ?? ''}
            actions={actions}
            onClear={onClear}
            rows={rows}
            className={className}
            words={words}
        />
    )
}
