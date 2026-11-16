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

// Between two entries that wrote anything: a new line, with the style an output left set reset.
const BETWEEN = `\r\n${ESC}0m`

/** One entry as the bytes a terminal is written, or nothing for an entry that has nothing to show. */
function entryText(entry: TerminalEntry, prompt: string, exited: (code: number) => string): string {
    const lines: string[] = []
    if (entry.command !== undefined) lines.push(`${ESC}34m${prompt}${ESC}0m ${entry.command}`)
    if (entry.output !== undefined && entry.output !== '') lines.push(entry.output.replace(/\r?\n/g, '\r\n'))
    if (entry.exitCode !== undefined && entry.exitCode !== 0) lines.push(`${ESC}0m${ESC}31m${exited(entry.exitCode)}${ESC}0m`)
    return lines.join('\r\n')
}

/** Entries' texts joined as a terminal is written, skipping those with nothing to show. */
function joined(texts: readonly string[]): string {
    return texts.filter((text) => text !== '').join(BETWEEN)
}

/**
 * The entries as the bytes a terminal is written: the prompt in the accent color before each
 * command, the output with its newlines as carriage return and line feed, and a failed exit in red.
 * The last line has no newline after it, so a streaming entry's cursor sits after its last character,
 * and the style an output leaves set is reset where the next line starts, so a growing output only
 * ever adds to what was written.
 */
export function sessionText(entries: readonly TerminalEntry[], prompt: string, exited: (code: number) => string): string {
    return joined(entries.map((entry) => entryText(entry, prompt, exited)))
}

/** What a terminal was last written, entry by entry, so the next write is found without going over it all. */
export interface SessionWritten {
    entries: readonly TerminalEntry[]
    texts: readonly string[]
    prompt: string
    exited: (code: number) => string
}

/**
 * What to write to go from what was written to the next entries: only what was added when they
 * continue it (the last entry's output grew, entries followed), or all of it after a reset when
 * anything written before changed. An entry that is the same object as before is not read again,
 * so a chunk streamed into a long session costs the entries' count and the changed entry's length,
 * not the whole session's.
 */
export function sessionWrite(
    before: SessionWritten | undefined,
    entries: readonly TerminalEntry[],
    prompt: string,
    exited: (code: number) => string,
): { reset: boolean; data: string; written: SessionWritten } {
    // An entry kept as the same object is not read again, unless how entries are drawn changed.
    const kept = before !== undefined && before.prompt === prompt && before.exited === exited
    const texts = entries.map((entry, at) => (kept && before.entries[at] === entry ? before.texts[at] : entryText(entry, prompt, exited)))
    const written = { entries, texts, prompt, exited }
    const old = before?.texts ?? []
    const whole = () => ({ reset: old.some((text) => text !== ''), data: joined(texts), written })
    let at = 0
    while (at < texts.length && at < old.length && texts[at] === old[at]) at += 1
    if (at === texts.length && at === old.length) return { reset: false, data: '', written }
    // Everything written after the first change must be one entry's text, which the new one continues.
    const oldAfter = old.slice(at)
    const shown = oldAfter.filter((text) => text !== '')
    const wroteBefore = old.slice(0, at).some((text) => text !== '')
    if (shown.length === 0) {
        const rest = joined(texts.slice(at))
        return { reset: false, data: wroteBefore && rest !== '' ? BETWEEN + rest : rest, written }
    }
    const grew = texts[at]
    if (shown.length > 1 || oldAfter[0] === '' || grew === undefined || !grew.startsWith(old[at])) return whole()
    const rest = joined(texts.slice(at + 1))
    return { reset: false, data: grew.slice(old[at].length) + (rest === '' ? '' : BETWEEN + rest), written }
}
