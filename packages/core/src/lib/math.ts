import { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize'

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

/** The index of the closing `$` for the one opening at `start`, on the same line, or -1. */
function closing(text: string, start: number): number {
    for (let index = start + 1; index < text.length; index++) {
        const char = text[index]
        if (char === '\n') return -1
        if (char === '\\') {
            index++
            continue
        }
        if (char === '$') {
            if (text[index + 1] === '$') return -1
            if (closes(text, index)) return index
        }
    }
    return -1
}

/** The start of the line `index` is on, and whether only white space comes before it there. */
function lineStart(text: string, index: number): { start: number; alone: boolean } {
    const start = text.lastIndexOf('\n', index - 1) + 1
    return { start, alone: text.slice(start, index).trim() === '' }
}

/** Rewrites the math of one stretch of prose, with no code in it. */
function prose(text: string): string {
    let out = ''
    let index = 0
    while (index < text.length) {
        const char = text[index]
        const next = text[index + 1]
        if (char === '\\' && (next === '(' || next === '[')) {
            const close = next === '(' ? '\\)' : '\\]'
            const end = text.indexOf(close, index + 2)
            const inner = end === -1 ? '' : text.slice(index + 2, end)
            if (end !== -1 && inner.trim() !== '' && !/\n\s*\n/.test(inner)) {
                const value = inner.trim()
                const { start, alone } = lineStart(text, index)
                const after = text.indexOf('\n', end)
                const rest = text.slice(end + 2, after === -1 ? text.length : after)
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
                out += next === '(' ? `$${value.replace(/\s*\n\s*/g, ' ')}$` : `$$${value.replace(/\s*\n\s*/g, ' ')}$$`
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
            const end = opens(text, index) ? closing(text, index) : -1
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
function outsideFences(text: string): string {
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
        out += prose(text.slice(from, index)) + text.slice(index, end + run)
        index = end + run
        from = index
    }
    return out + prose(text.slice(from))
}

/**
 * Markdown with its math in the form remark-math reads: `\(…\)` becomes `$…$`, `\[…\]` becomes a
 * `$$` block (or inline `$$…$$` inside a sentence), and a single `$` that cannot pair as math is
 * escaped. A single dollar opens math when a non-space follows it and closes it when a non-space
 * comes before it and no digit after it, on the same line, as Pandoc reads them, so "costs $5 and
 * $10" stays prices. Fenced code, `$$` blocks, inline code and escapes are left as they are.
 */
export function normalizeMath(source: string): string {
    if (!/[$\\]/.test(source)) return source
    const lines = source.split('\n')
    const out: string[] = []
    let pending: string[] = []
    const flush = () => {
        if (pending.length > 0) out.push(outsideFences(pending.join('\n')))
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
        out.push(line)
        index++
        while (index < lines.length) {
            out.push(lines[index])
            index++
            if (shut(lines[index - 1])) break
        }
    }
    flush()
    return out.join('\n')
}

/** Whether markdown holds math once `normalizeMath` has read it: a `math` fence, or a dollar left unescaped. */
export function hasMath(source: string): boolean {
    if (/^\s*(`{3,}|~{3,})\s*math\s*$/im.test(source)) return true
    const normalized = normalizeMath(source)
    let fenced = false
    for (const line of normalized.split('\n')) {
        if (FENCE.test(line)) fenced = !fenced
        if (fenced) continue
        if (/(^|[^\\])(\\\\)*\$/.test(line.replace(/(`+)[^`]*?\1/g, ''))) return true
    }
    return false
}

const codeClasses = (defaultSchema.attributes?.code ?? []).filter((entry) => !(Array.isArray(entry) && entry[0] === 'className'))

/**
 * The sanitize schema `Markdown` uses with `allowHtml`: GitHub's, with the classes remark-math puts
 * on its math (`language-math`, `math-inline`, `math-display`) kept, so KaTeX, which runs after it,
 * finds them.
 */
export const markdownSchema: SanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [...codeClasses, ['className', /^language-./, 'math-inline', 'math-display']],
        // The placeholder of a part an app embeds, which Markdown fills.
        div: [...(defaultSchema.attributes?.div ?? []), 'dataPart'],
        span: [...(defaultSchema.attributes?.span ?? []), 'dataPart'],
    },
}
