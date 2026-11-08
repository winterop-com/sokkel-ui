/**
 * Mentions in a message's text: a person is mentioned as `@` and their handle (`@ada`), the
 * token the composers put in and an app reads back with `mentionsIn`.
 */

/** A person a composer can mention. */
export interface MentionPerson {
    id: string
    /** The name shown in the suggestions: "Ada Berg". */
    name: string
    /** What follows the `@` in the text: letters, digits, `.`, `_` and `-`; the id by default. */
    handle?: string
    /** A picture of them, as `PersonAvatar` takes it. */
    image?: string
    /** A second line in the suggestions, such as their role. */
    detail?: string
}

/** The characters a handle is made of. */
const HANDLE = /[\p{L}\p{N}._-]/u
/** The longest handle a query reads before it gives up on the `@`. */
const LONGEST = 48

/** The handle a person is mentioned by: their own, or their id. */
export function handleOf(person: Pick<MentionPerson, 'id' | 'handle'>): string {
    return person.handle ?? person.id
}

/** Whether the character before an `@` lets it start a mention: the start, a space, or an opening mark. */
function opens(before: string | undefined): boolean {
    return before === undefined || /[\s([{"'“‘]/u.test(before)
}

/**
 * The mention being typed at the caret, if any: where its `@` is and what follows it up to the
 * caret. An `@` inside a word (an address such as `ada@example.org`) starts none.
 */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
    let index = Math.min(Math.max(0, caret), text.length) - 1
    while (index >= 0 && caret - index <= LONGEST + 1) {
        const char = text[index]
        if (char === '@') return opens(text[index - 1]) ? { start: index, query: text.slice(index + 1, caret) } : null
        if (!HANDLE.test(char)) return null
        index -= 1
    }
    return null
}

/**
 * The text with the mention typed from `start` to `caret` made into `@handle` and a space after
 * it (unless one follows already), and the caret after that space.
 */
export function insertMention(text: string, start: number, caret: number, handle: string): { value: string; caret: number } {
    let end = caret
    // A handle the caret stands inside is replaced whole.
    while (end < text.length && HANDLE.test(text[end])) end += 1
    const after = text.slice(end)
    const token = `@${handle}`
    const space = /^\s/.test(after) ? '' : ' '
    const value = `${text.slice(0, start)}${token}${space}${after}`
    return { value, caret: start + token.length + 1 }
}

/** The ids of the people the text mentions, each once, in the order first mentioned. */
export function mentionsIn(text: string, people: readonly Pick<MentionPerson, 'id' | 'handle'>[]): string[] {
    const byHandle = new Map(people.map((person) => [handleOf(person).toLowerCase(), person.id]))
    const found: string[] = []
    for (const match of text.matchAll(/@([\p{L}\p{N}._-]+)/gu)) {
        const at = match.index
        if (!opens(text[at - 1])) continue
        // A sentence's full stop or a dash after a handle is not part of it.
        const handle = match[1].replace(/[._-]+$/u, '').toLowerCase()
        const id = byHandle.get(handle)
        if (id !== undefined && !found.includes(id)) found.push(id)
    }
    return found
}

/**
 * The people a query suggests, best first: a handle or a name that starts with it, then one with
 * a word that starts with it, then one that holds it, each in the list's order; all of them, up to
 * `limit`, for an empty query.
 */
export function matchPeople<P extends MentionPerson>(people: readonly P[], query: string, limit = 8): P[] {
    const wanted = query.trim().toLowerCase()
    if (wanted === '') return people.slice(0, limit)
    const rank = (person: P): number => {
        const handle = handleOf(person).toLowerCase()
        const name = person.name.toLowerCase()
        if (handle.startsWith(wanted) || name.startsWith(wanted)) return 0
        if (name.split(/[\s._-]+/).some((word) => word.startsWith(wanted))) return 1
        if (handle.includes(wanted) || name.includes(wanted)) return 2
        return -1
    }
    return people
        .map((person, index) => ({ person, index, rank: rank(person) }))
        .filter((one) => one.rank >= 0)
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .slice(0, limit)
        .map((one) => one.person)
}
