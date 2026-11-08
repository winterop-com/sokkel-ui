import { useEffect, useMemo, useRef, type ReactNode } from 'react'

import { nextWrite, sessionText, type TerminalEntry } from './session'
import { TerminalView, type TerminalHandle } from './TerminalView'

export type { TerminalEntry } from './session'

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

// xterm draws no cursor until the terminal is focused, typed into or switches screens, so showing it
// also switches to the normal screen, where a read-only terminal already is.
const SHOW_CURSOR = '\u001b[?1047l\u001b[?25h'
const HIDE_CURSOR = '\u001b[?25l'

/**
 * A terminal that shows commands and what they wrote: a title bar with copy and clear, then each
 * command after its prompt and its output with escape codes drawn as colors, on the same engine as
 * `TerminalView`. While `streaming`, output may arrive a piece at a time: only what was added is
 * written, the view follows the newest line unless the reader has scrolled up, when a button brings
 * it back, and a cursor stands after the last character. A carriage return redraws its line, as a
 * progress bar does.
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
}: {
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
}) {
    const view = useRef<TerminalHandle>(null)
    const written = useRef('')
    const words = { ...WORDS, ...given }
    const exited = words.exited
    const text = useMemo(() => sessionText(entries, prompt, exited), [entries, prompt, exited])

    useEffect(() => {
        const handle = view.current
        if (handle === null) return
        const { reset, data } = nextWrite(written.current, text)
        if (reset) handle.reset()
        if (reset || written.current === '') handle.write(streaming ? SHOW_CURSOR : HIDE_CURSOR)
        if (data !== '') handle.write(data)
        written.current = text
        // The cursor is written with the text that changes it; `streaming` alone follows below.
        // oxlint-disable-next-line react/exhaustive-deps
    }, [text])

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
