/** A fence line: its indent, then a run of three or more backticks or tildes. */
const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/

/** Whether `$` at `index` can open single-dollar math: a character other than space follows it. */
function opens(text: string, index: number): boolean {
    const next = text[index + 1]
    return next !== undefined && !/\s/.test(next) && next !== '$'
}

/** Whether `$` at `index` can close single-dollar math: a character other than space before it, no digit after it. */
function closes(text: string, index: number): boolean {
    const before = text[index - 1]
    const after = text[index + 1]
    return before !== undefined && !/\s/.test(before) && before !== '$' && (after === undefined || !/[\d$]/.test(after))
}

/**
 * The index of the closing `$` for the one opening at `start`, on the same line, or, when none
 * closes it, -1 and where the search stopped: no `$` opening before that point closes either.
 */
function closing(text: string, start: number): { end: number; stop: number } {
    for (let index = start + 1; index < text.length; index++) {
        const char = text[index]
        if (char === '\n') return { end: -1, stop: index }
        if (char === '\\') {
            index++
            continue
        }
        if (char === '$') {
            if (text[index + 1] === '$') return { end: -1, stop: index }
            if (closes(text, index)) return { end: index, stop: index }
        }
    }
    return { end: -1, stop: text.length }
}

/** A search through the text that remembers its last answer, so openers that share a closer find it once. */
function searcher(find: (from: number) => number): (from: number) => number {
    let found = -2
    return (from) => {
        if (found === -1 || (found >= from && found !== -2)) return found
        found = find(from)
        return found
    }
}

/** A quote's markers before a line's text: `> `, `>> `, or none. */
const QUOTE = /^[ \t]*(?:>[ \t]?)*/
/** Raw HTML a backslash would stay literal in: an autolink, or an opening, closing or empty tag. */
const RAW = /^(?:<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*>|<[^\s@<>\\]+@[^\s@<>\\]+>|<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>)/

/** The start of the line `index` is on, and whether only white space and a quote's markers come before it there. */
function lineStart(text: string, index: number): { start: number; alone: boolean } {
    const start = text.lastIndexOf('\n', index - 1) + 1
    const before = text.slice(start, index)
    return { start, alone: QUOTE.exec(before)?.[0].length === before.length }
}

/** Rewrites the math of one stretch of prose, with no code in it. */
function prose(text: string, inlineBrackets: boolean): string {
    let out = ''
    let index = 0
    // Each search remembers its last answer, so a line of openers that never close is read once.
    const parens = searcher((from) => text.indexOf('\\)', from))
    const brackets = searcher((from) => text.indexOf('\\]', from))
    const blank = searcher((from) => {
        const match = /\n[ \t>]*\n/g
        match.lastIndex = from
        return match.exec(text)?.index ?? -1
    })
    let unclosed = -1
    while (index < text.length) {
        const char = text[index]
        const next = text[index + 1]
        if (char === '<') {
            const raw = RAW.exec(text.slice(index, index + 2048))
            if (raw !== null) {
                out += raw[0]
                index += raw[0].length
                continue
            }
        }
        if (char === '\\' && (next === '(' || next === '[')) {
            const end = (next === '(' ? parens : brackets)(index + 2)
            const gap = end === -1 ? -1 : blank(index + 2)
            if (end !== -1 && (gap === -1 || gap >= end)) {
                const { start, alone } = lineStart(text, index)
                // Inside a quote each line of the formula starts with the quote's markers, which are not math.
                const quote = QUOTE.exec(text.slice(start, index))?.[0] ?? ''
                const inner = text.slice(index + 2, end)
                const value = (quote.includes('>') ? inner.replace(/\n[ \t]*(?:>[ \t]?)*/g, '\n') : inner).trim()
                const after = text.indexOf('\n', end)
                const rest = text.slice(end + 2, after === -1 ? text.length : after)
                if (value === '') {
                    out += char + next
                    index += 2
                    continue
                }
                if (next === '[' && alone && rest.trim() === '') {
                    // A display formula on lines of its own: a `$$` block at the same indent.
                    const indent = text.slice(start, index)
                    const body = value
                        .split('\n')
                        .map((line) => indent + line.trim())
                        .join('\n')
                    out += `$$\n${body}\n${indent}$$`
                    index = end + 2
                    continue
                }
                if (next === '[' && !inlineBrackets) {
                    // Inside a sentence `\[` is an escaped bracket, as in a citation's "\[45\]".
                    out += char + next
                    index += 2
                    continue
                }
                const line = value.replace(/\s*\n\s*/g, ' ')
                out += next === '(' ? `$${line}$` : `$$${line}$$`
                index = end + 2
                continue
            }
            out += char + next
            index += 2
            continue
        }
        if (char === '\\') {
            out += char + (next ?? '')
            index += 2
            continue
        }
        if (char === '$') {
            let run = 1
            while (text[index + run] === '$') run++
            if (run > 1) {
                out += text.slice(index, index + run)
                index += run
                continue
            }
            let end = -1
            if (index >= unclosed && opens(text, index)) {
                const found = closing(text, index)
                end = found.end
                if (end === -1) unclosed = found.stop
            }
            if (end === -1) {
                // A dollar that pairs with none, as in a price, stays a dollar.
                out += '\\$'
                index++
                continue
            }
            out += text.slice(index, end + 1)
            index = end + 1
            continue
        }
        out += char
        index++
    }
    return out
}

/** Rewrites a stretch of text outside fences, leaving its inline code alone. */
function outsideFences(text: string, inlineBrackets: boolean): string {
    let out = ''
    let from = 0
    let index = 0
    while (index < text.length) {
        if (text[index] === '\\' && text[index + 1] === '`') {
            index += 2
            continue
        }
        if (text[index] !== '`') {
            index++
            continue
        }
        let run = 1
        while (text[index + run] === '`') run++
        const ticks = '`'.repeat(run)
        let end = text.indexOf(ticks, index + run)
        while (end !== -1 && text[end + run] === '`') {
            let skip = end
            while (text[skip] === '`') skip++
            end = text.indexOf(ticks, skip)
        }
        if (end === -1) {
            index += run
            continue
        }
        out += prose(text.slice(from, index), inlineBrackets) + text.slice(index, end + run)
        index = end + run
        from = index
    }
    return out + prose(text.slice(from), inlineBrackets)
}

/**
 * Markdown with its math in the form remark-math reads: `\(…\)` becomes `$…$`, `\[…\]` on lines of
 * its own becomes a `$$` block (inside a sentence it stays escaped brackets), and a single `$` that cannot pair as math is
 * escaped. A single dollar opens math when a non-space follows it and closes it when a non-space
 * comes before it and no digit after it, on the same line, as Pandoc reads them, so "costs $5 and
 * $10" stays prices. Fenced code, `$$` blocks, inline code and escapes are left as they are.
 *
 * With `inlineBrackets`, `\[…\]` inside a sentence is inline `$$…$$` math too, as chat models write it.
 *
 * With `streaming`, a `$$` block still being written (opened and not yet closed) becomes a `latex`
 * fence, so it shows as its source until its closing `$$` lands rather than as an error each token.
 */
export function normalizeMath(
    source: string,
    { streaming = false, inlineBrackets = false }: { streaming?: boolean; inlineBrackets?: boolean } = {},
): string {
    if (!/[$\\]/.test(source)) return source
    const lines = source.split('\n')
    const out: string[] = []
    let pending: string[] = []
    const flush = () => {
        if (pending.length > 0) out.push(outsideFences(pending.join('\n'), inlineBrackets))
        pending = []
    }
    let index = 0
    while (index < lines.length) {
        const line = lines[index]
        const fence = FENCE.exec(line)
        const block = line.trim() === '$$'
        if (fence === null && !block) {
            pending.push(line)
            index++
            continue
        }
        flush()
        const marker = fence?.[2] ?? '$$'
        const shut = (candidate: string) =>
            fence === null
                ? candidate.trim().endsWith('$$')
                : new RegExp(`^\\s*${marker[0] === '`' ? '`' : '~'}{${String(marker.length)},}\\s*$`).test(candidate)
        const opener = out.length
        out.push(line)
        index++
        let closed = false
        while (index < lines.length) {
            out.push(lines[index])
            index++
            if (shut(lines[index - 1])) {
                closed = true
                break
            }
        }
        if (streaming && block && !closed) out[opener] = line.replace('$$', '```latex')
    }
    flush()
    return out.join('\n')
}

/** Whether markdown holds math once `normalizeMath` has read it: a `math` fence, or a dollar left unescaped. */
export function hasMath(source: string, { inlineBrackets = false }: { inlineBrackets?: boolean } = {}): boolean {
    if (/^\s*(`{3,}|~{3,})\s*math\s*$/im.test(source)) return true
    const normalized = normalizeMath(source, { inlineBrackets })
    let fenced = false
    for (const line of normalized.split('\n')) {
        if (FENCE.test(line)) fenced = !fenced
        if (fenced) continue
        if (/(^|[^\\])(\\\\)*\$/.test(line.replace(/(`+)[^`]*?\1/g, ''))) return true
    }
    return false
}
