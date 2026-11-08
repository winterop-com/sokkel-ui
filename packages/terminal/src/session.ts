/** One thing run in a terminal: the command typed and what it wrote. */
export interface TerminalEntry {
    id: string
    command?: string
    /** What the command wrote, with ANSI escape codes, newlines and carriage returns as written. */
    output?: string
    /** How the command ended, drawn after its output: 0 is success. */
    exitCode?: number
}

const ESC = '\u001b['

/**
 * The entries as the bytes a terminal is written: the prompt in the accent color before each
 * command, the output with its newlines as carriage return and line feed, and a failed exit in red.
 * The last line has no newline after it, so a streaming entry's cursor sits after its last character,
 * and the style an output leaves set is reset where the next line starts, so a growing output only
 * ever adds to what was written.
 */
export function sessionText(entries: readonly TerminalEntry[], prompt: string, exited: (code: number) => string): string {
    return entries
        .map((entry) => {
            const lines: string[] = []
            if (entry.command !== undefined) lines.push(`${ESC}34m${prompt}${ESC}0m ${entry.command}`)
            if (entry.output !== undefined && entry.output !== '') lines.push(entry.output.replace(/\r?\n/g, '\r\n'))
            if (entry.exitCode !== undefined && entry.exitCode !== 0) lines.push(`${ESC}0m${ESC}31m${exited(entry.exitCode)}${ESC}0m`)
            return lines.join('\r\n')
        })
        .filter((text) => text !== '')
        .join(`\r\n${ESC}0m`)
}

/**
 * What to write to go from the text written so far to the next: only what was added when the next
 * text continues the last, or all of it after a reset when anything before changed.
 */
export function nextWrite(written: string, next: string): { reset: boolean; data: string } {
    if (next.startsWith(written)) return { reset: false, data: next.slice(written.length) }
    return { reset: true, data: next }
}
