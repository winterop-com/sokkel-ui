import { useMemo, type CSSProperties } from 'react'

import { ansiCss, parseAnsi, type AnsiStyle } from '../lib/ansi'
import { cn } from '../lib/cn'

export interface AnsiTextProps {
    text: string
    /** A block of mono output instead of a run inside a sentence. */
    block?: boolean
    /** Wraps long lines of a block instead of scrolling sideways. */
    wrap?: boolean
    start?: AnsiStyle
    className?: string
}

/**
 * Output written with ANSI color escapes, drawn as spans: the sixteen colors in the kind and status
 * inks of the theme, the 256-color palette and 24-bit color as they are, with bold, dim, italic,
 * underline and strike-through. Escapes that are not colors (a cursor move, a line clear) are
 * dropped. Inline it takes the text around it; `block` sets it apart in mono, keeping its spaces
 * and lines, wrapping long lines when `wrap` is set and scrolling sideways otherwise. `start` is
 * the style the text begins in, for output that arrives in pieces (`parseAnsi` returns the style
 * a piece ends in).
 */
export function AnsiText({ text, block = false, wrap = false, start, className }: AnsiTextProps) {
    const segments = useMemo(() => parseAnsi(text, start).segments, [text, start])
    const spans = segments.map((segment, index) =>
        Object.keys(segment.style).length === 0 ? (
            <span key={index}>{segment.text}</span>
        ) : (
            <span key={index} style={ansiCss(segment.style) as CSSProperties}>
                {segment.text}
            </span>
        ),
    )
    if (!block) {
        return (
            <span data-slot="ansi-text" className={cn('whitespace-pre-wrap', className)}>
                {spans}
            </span>
        )
    }
    return (
        <pre
            data-slot="ansi-text"
            className={cn(
                'min-w-0 overflow-x-auto font-mono text-sm leading-code text-foreground',
                wrap ? '[overflow-wrap:anywhere] whitespace-pre-wrap' : 'whitespace-pre',
                className,
            )}
        >
            {spans}
        </pre>
    )
}
