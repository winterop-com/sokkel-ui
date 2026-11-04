/** How a run of terminal text is drawn, as ANSI select-graphic-rendition codes set it. */
export interface AnsiStyle {
    color?: string
    bold?: boolean
    dim?: boolean
    italic?: boolean
    underline?: boolean
}

/** A run of text in one style. */
export interface AnsiSpan {
    text: string
    style: AnsiStyle
}

/** The CSS color each of the eight ANSI colors takes, from the theme's tokens; bright ones share them. */
const COLORS = [
    'var(--terminal-faint)',
    'var(--terminal-critical)',
    'var(--status-succeeded)',
    'var(--terminal-warning)',
    'var(--kind-blue)',
    'var(--kind-violet)',
    'var(--kind-teal)',
    'var(--terminal-foreground)',
]

/**
 * Terminal text split into styled runs. Colors (30-37, 90-97), bold (1), dim (2), italic (3),
 * underline (4) and their resets (0, 22, 23, 24, 39) are read; any other escape sequence is
 * dropped, so cursor moves and the like never show as text.
 */
export function parseAnsi(input: string): AnsiSpan[] {
    const spans: AnsiSpan[] = []
    let style: AnsiStyle = {}
    // eslint-disable-next-line no-control-regex
    const escape = /\u001b\[([0-9;]*)([A-Za-z])/g
    let last = 0
    for (let match = escape.exec(input); match !== null; match = escape.exec(input)) {
        if (match.index > last) spans.push({ text: input.slice(last, match.index), style })
        last = escape.lastIndex
        if (match[2] !== 'm') continue
        const codes = match[1] === '' ? [0] : match[1].split(';').map(Number)
        const next: AnsiStyle = { ...style }
        for (const code of codes) {
            if (code === 0) {
                for (const key of Object.keys(next) as (keyof AnsiStyle)[]) delete next[key]
            } else if (code === 1) next.bold = true
            else if (code === 2) next.dim = true
            else if (code === 3) next.italic = true
            else if (code === 4) next.underline = true
            else if (code === 22) {
                delete next.bold
                delete next.dim
            } else if (code === 23) delete next.italic
            else if (code === 24) delete next.underline
            else if (code === 39) delete next.color
            else if (code >= 30 && code <= 37) next.color = COLORS[code - 30]
            else if (code >= 90 && code <= 97) next.color = COLORS[code - 90]
        }
        style = next
    }
    if (last < input.length) spans.push({ text: input.slice(last), style })
    return spans.filter((span) => span.text !== '')
}
