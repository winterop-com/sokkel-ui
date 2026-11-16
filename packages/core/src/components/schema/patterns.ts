/**
 * Schema patterns tested without freezing the page. A pattern that repeats a group which itself
 * repeats, as `^(a+)+$`, can take time exponential in the text's length on a text that fails, and
 * a schema can come from anywhere a document's `$schema` points. Such a pattern tests a text only
 * up to a length it answers quickly at; a longer one passes here, and is left to the server.
 */

/** How deeply the pattern nests repeats: 0 for none, 1 for `a+`, 2 for `(a+)+`, and so on. */
export function repeatDepth(pattern: string): number {
    // The deepest repeat inside each open group; the first entry is the pattern outside any group.
    const stack: number[] = [0]
    let deepest = 0
    /** Reads the quantifier at `at`, if any, after an atom that nests `depth` repeats, and returns where reading goes on. */
    const after = (depth: number, at: number): number => {
        let next = at
        let repeats = false
        const char = pattern[at]
        if (char === '*' || char === '+') {
            repeats = true
            next = at + 1
        } else if (char === '?') {
            next = at + 1
        } else if (char === '{') {
            const match = /^\{(\d*)(,?)(\d*)\}/.exec(pattern.slice(at))
            if (match !== null) {
                // `{n}` repeats a fixed count; `{n,}` and a range wider than one are repeats.
                repeats = match[2] !== '' && (match[3] === '' || Number(match[3]) > Number(match[1] || '0') + 1)
                next = at + match[0].length
            }
        }
        if (next > at && pattern[next] === '?') next += 1
        const reached = repeats ? depth + 1 : depth
        stack[stack.length - 1] = Math.max(stack[stack.length - 1], reached)
        deepest = Math.max(deepest, reached)
        return next
    }
    let index = 0
    while (index < pattern.length) {
        const char = pattern[index]
        if (char === '\\') {
            index = after(0, index + 2)
        } else if (char === '[') {
            let close = index + 1
            if (pattern[close] === '^') close += 1
            if (pattern[close] === ']') close += 1
            while (close < pattern.length && pattern[close] !== ']') close += pattern[close] === '\\' ? 2 : 1
            index = after(0, close + 1)
        } else if (char === '(') {
            stack.push(0)
            index += 1
        } else if (char === ')') {
            index = after(stack.length > 1 ? (stack.pop() ?? 0) : 0, index + 1)
        } else {
            index = after(0, index + 1)
        }
    }
    return deepest
}

/** The longest text a pattern of this repeat depth is tested on; past it, the time it can take grows too fast. */
export function testedLength(depth: number): number {
    return depth < 2 ? Number.POSITIVE_INFINITY : Math.floor(40 / depth)
}

/** A pattern as a test that answers quickly: a text longer than its depth allows passes untested. */
export function guardedPattern(pattern: string, flags = 'u'): { test: (text: string) => boolean; toString: () => string } {
    const test = new RegExp(pattern, flags)
    const longest = testedLength(repeatDepth(pattern))
    // Ajv keeps each compiled pattern under its text, so two patterns must never write out the same.
    return { test: (text) => text.length > longest || test.test(text), toString: () => test.toString() }
}
