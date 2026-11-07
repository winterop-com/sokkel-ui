/**
 * Terminal output as the lines a screen shows: a newline starts a line, a carriage return sends
 * the writing back to the start of the current line so what follows overwrites it, as a progress
 * bar redraws itself. Only the newest `limit` lines are kept.
 */
export function screenLines(output: string, limit = 5000): string[] {
    const lines = output
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((chunk) => {
            const parts = chunk.split('\r')
            let line = parts[0]
            // A carriage return rewrites from the start: the new text covers as much of the old as it is long.
            for (const part of parts.slice(1)) line = part + line.slice(visibleIndex(line, stripAnsi(part).length))
            return line
        })
    return lines.length > limit ? lines.slice(lines.length - limit) : lines
}

// eslint-disable-next-line no-control-regex
const ESCAPES = /\u001b\[[0-9;]*[A-Za-z]/g

/** The text with its escape sequences removed. */
export function stripAnsi(text: string): string {
    return text.replace(ESCAPES, '')
}

/** The index in `text` just past its first `count` visible characters, skipping escape sequences. */
function visibleIndex(text: string, count: number): number {
    let seen = 0
    let index = 0
    while (index < text.length && seen < count) {
        if (text[index] === '\u001b') {
            ESCAPES.lastIndex = index
            const match = ESCAPES.exec(text)
            if (match !== null && match.index === index) {
                index += match[0].length
                continue
            }
        }
        seen += 1
        index += 1
    }
    return index
}
