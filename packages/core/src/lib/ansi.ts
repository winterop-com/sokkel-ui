/**
 * ANSI SGR output read into styled runs of text: the sixteen colors, the 256-color palette and
 * 24-bit color, for text and ground, with bold, dim, italic, underline, strike-through, inverse and
 * the resets. Every other escape (a cursor move, a line clear, a window title) is dropped.
 */

/** A color as the output names it: an index into the 256-color palette, or red, green and blue. */
export type AnsiColor = number | readonly [number, number, number]

/** The look a run of text is drawn in. An unset field is the default. */
export interface AnsiStyle {
    color?: AnsiColor
    background?: AnsiColor
    bold?: boolean
    dim?: boolean
    italic?: boolean
    underline?: boolean
    strike?: boolean
    inverse?: boolean
}

/** A run of text in one style. */
export interface AnsiSegment {
    text: string
    style: AnsiStyle
}

// CSI sequences (ESC [ … final byte), OSC sequences (ESC ] … BEL or ESC \), and two-byte escapes.
// oxlint-disable-next-line no-control-regex
const ESCAPE = /\u001b(?:\[([0-9;:?]*)([@-~])|\][^\u0007\u001b]*(?:\u0007|\u001b\\)?|[@-Z\\-_])/g

/** The color an extended color code (38 or 48) names, and how many parameters it took. */
function extended(codes: number[], at: number): { color?: AnsiColor; used: number } {
    if (codes[at + 1] === 5) {
        const index = codes[at + 2]
        return { color: index !== undefined && index >= 0 && index <= 255 ? index : undefined, used: 2 }
    }
    if (codes[at + 1] === 2) {
        const [r, g, b] = codes.slice(at + 2, at + 5).map((value) => Math.min(255, Math.max(0, value)))
        return { color: r !== undefined && g !== undefined && b !== undefined ? [r, g, b] : undefined, used: 4 }
    }
    return { used: 0 }
}

/** The style after one SGR sequence's parameters. */
export function applySgr(style: AnsiStyle, parameters: string): AnsiStyle {
    // A colon separates the parts of an extended color in some programs; read it as a semicolon.
    const codes = parameters === '' ? [0] : parameters.split(/[;:]/).map((part) => (part === '' ? 0 : Number(part)))
    let next: AnsiStyle = { ...style }
    for (let at = 0; at < codes.length; at++) {
        const code = codes[at]
        if (code === 0) next = {}
        else if (code === 1) next.bold = true
        else if (code === 2) next.dim = true
        else if (code === 3) next.italic = true
        else if (code === 4) next.underline = true
        else if (code === 7) next.inverse = true
        else if (code === 9) next.strike = true
        else if (code === 21 || code === 22) {
            delete next.bold
            delete next.dim
        } else if (code === 23) delete next.italic
        else if (code === 24) delete next.underline
        else if (code === 27) delete next.inverse
        else if (code === 29) delete next.strike
        else if (code >= 30 && code <= 37) next.color = code - 30
        else if (code >= 90 && code <= 97) next.color = code - 90 + 8
        else if (code === 39) delete next.color
        else if (code >= 40 && code <= 47) next.background = code - 40
        else if (code >= 100 && code <= 107) next.background = code - 100 + 8
        else if (code === 49) delete next.background
        else if (code === 38 || code === 48) {
            const { color, used } = extended(codes, at)
            if (color !== undefined) next[code === 38 ? 'color' : 'background'] = color
            at += used
        }
    }
    return next
}

function same(a: AnsiStyle, b: AnsiStyle): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)] as (keyof AnsiStyle)[])
    return [...keys].every((key) => String(a[key]) === String(b[key]))
}

/**
 * The runs of `text`, each in the style its escapes set, and the style in force at its end, which a
 * caller passes back as `start` to carry on where the text left off, as output arriving in pieces
 * does. Runs in the same style are joined; empty ones are dropped.
 */
export function parseAnsi(text: string, start: AnsiStyle = {}): { segments: AnsiSegment[]; style: AnsiStyle } {
    const segments: AnsiSegment[] = []
    let style = start
    let from = 0
    const push = (part: string) => {
        if (part === '') return
        const last = segments[segments.length - 1]
        if (last !== undefined && same(last.style, style)) last.text += part
        else segments.push({ text: part, style })
    }
    for (const match of text.matchAll(ESCAPE)) {
        push(text.slice(from, match.index))
        from = match.index + match[0].length
        if (match[2] === 'm' && !(match[1] ?? '').startsWith('?')) style = applySgr(style, match[1] ?? '')
    }
    push(text.slice(from))
    return { segments, style }
}

/** The text without its escapes. */
export function stripAnsi(text: string): string {
    return text.replace(ESCAPE, '')
}

/**
 * The token each of the sixteen colors is drawn in: the kind inks, the status inks for red and
 * yellow, and the text's own inks for black and white. A bright color shares its plain one but
 * for black, white, green, magenta and blue, which take a neighboring ink so the two stay apart.
 */
export const ANSI_COLORS: readonly string[] = [
    'var(--faint)',
    'var(--status-failed-ink)',
    'var(--kind-green-ink)',
    'var(--status-completed-with-errors-ink)',
    'var(--kind-blue-ink)',
    'var(--kind-violet-ink)',
    'var(--kind-teal-ink)',
    'var(--foreground)',
    'var(--muted-foreground)',
    'var(--status-failed-ink)',
    'var(--kind-jade-ink)',
    'var(--status-completed-with-errors-ink)',
    'var(--code-function)',
    'var(--kind-pink-ink)',
    'var(--kind-teal-ink)',
    'var(--foreground)',
]

const CUBE = [0, 95, 135, 175, 215, 255]

/** The CSS color of an ANSI color: a token for the sixteen, the palette's own value past them. */
export function ansiColor(color: AnsiColor): string {
    if (typeof color !== 'number') return `rgb(${color[0]} ${color[1]} ${color[2]})`
    if (color < 16) return ANSI_COLORS[color] ?? 'currentColor'
    if (color < 232) {
        const index = color - 16
        return `rgb(${CUBE[Math.floor(index / 36)]} ${CUBE[Math.floor(index / 6) % 6]} ${CUBE[index % 6]})`
    }
    const gray = 8 + (color - 232) * 10
    return `rgb(${gray} ${gray} ${gray})`
}

/** The inline style a run is drawn in. A ground is a wash of its color, so the text over it stays legible. */
export function ansiCss(style: AnsiStyle): Record<string, string> {
    const css: Record<string, string> = {}
    let color = style.color === undefined ? undefined : ansiColor(style.color)
    let ground = style.background === undefined ? undefined : ansiColor(style.background)
    if (style.inverse === true) {
        ;[color, ground] = [ground ?? 'var(--background)', color ?? 'currentColor']
        css.backgroundColor = ground
    } else if (ground !== undefined) {
        css.backgroundColor = `color-mix(in oklab, ${ground} 32%, transparent)`
    }
    if (color !== undefined) css.color = color
    if (style.bold === true) css.fontWeight = '600'
    if (style.dim === true) css.opacity = '0.65'
    if (style.italic === true) css.fontStyle = 'italic'
    const lines = [style.underline === true && 'underline', style.strike === true && 'line-through'].filter(Boolean)
    if (lines.length > 0) css.textDecorationLine = lines.join(' ')
    return css
}
