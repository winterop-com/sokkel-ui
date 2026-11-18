/**
 * A part's words against a catalog: the message id each word is held under, and the words
 * translated from a catalog of ICU messages in a locale. `LocaleProvider` translates with it and
 * `bun run messages` lists the ids with it.
 */
import { compileMessage, type CompiledMessage } from './message-format'
import type { WordsPart } from './words'

/** The part a word of `part` is held under in a catalog: the part it was taken from, unchanged, or `part` itself. */
function owner(part: WordsPart<object>, key: string): WordsPart<object> {
    const value = (part.words as Record<string, unknown>)[key]
    for (const from of part.from ?? []) {
        if (key in from.words && (from.words as Record<string, unknown>)[key] === value) return owner(from, key)
    }
    return part
}

function compiled(id: string, message: string): CompiledMessage | null {
    try {
        return compileMessage(message)
    } catch (error) {
        console.error(`The message ${id} cannot be read: ${(error as Error).message}`)
        return null
    }
}

/** A message id and its English value as a catalog lists them, for each word of a part, `from` parts left out. */
export function partMessageIds(part: WordsPart<object>): [id: string, value: unknown, args: string | undefined][] {
    const out: [string, unknown, string | undefined][] = []
    const walk = (value: unknown, id: string, args: string | undefined) => {
        if (value !== null && typeof value === 'object') {
            for (const [key, inner] of Object.entries(value)) walk(inner, `${id}.${key}`, undefined)
        } else out.push([id, value, args])
    }
    for (const [key, value] of Object.entries(part.words)) {
        if (owner(part, key) !== part) continue
        walk(value, `${part.id}.${key}`, (part.args as Record<string, string | undefined> | undefined)?.[key])
    }
    return out
}

/** A part's words translated from a catalog in a locale: each word the catalog holds, the rest as they are. */
export function translateWords<W extends object>(part: WordsPart<W>, messages: Readonly<Record<string, string>>, locale: string): W {
    const translate = (value: unknown, id: string, args: string | undefined): unknown => {
        if (Array.isArray(value)) return value.map((inner, index) => translate(inner, `${id}.${String(index)}`, undefined))
        if (value !== null && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, translate(inner, `${id}.${key}`, undefined)]))
        }
        const message = messages[id]
        if (message === undefined) return value
        if (typeof value === 'function') {
            if (args === undefined) return value
            const names = args.split(' ').filter(Boolean)
            const read = compiled(id, message)
            if (read === null) return value
            return (...given: unknown[]) => read.format(Object.fromEntries(names.map((name, index) => [name, given[index]])), locale)
        }
        const read = compiled(id, message)
        return read === null ? value : read.format({}, locale)
    }
    const words: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(part.words)) {
        const from = owner(part as WordsPart<object>, key)
        if (from !== part) {
            words[key] = (translateWords(from, messages, locale) as Record<string, unknown>)[key]
            continue
        }
        words[key] = translate(value, `${part.id}.${key}`, (part.args as Record<string, string | undefined> | undefined)?.[key])
    }
    return words as W
}
