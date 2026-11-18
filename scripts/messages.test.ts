import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { compileMessage, formatMessage, messageArguments } from '../packages/core/src/lib/message-format'

import { PACKAGES } from './components-index'
import { catalogOf, catalogPath, partsOf, quoted, type FoundPart } from './messages'

/**
 * Every part's words against the catalogs: each `<NAME>_WORDS` has its `<NAME>_PART` under the id its
 * name makes, each phrase an English ICU message that says what the English function says, and each
 * package's `messages/en.json` is what the parts make.
 */

const ROOT = join(import.meta.dirname, '..')
const PARTS = new Map<string, FoundPart[]>()
for (const pkg of PACKAGES) PARTS.set(pkg, await partsOf(pkg))
const ALL = [...PARTS.values()].flat()

/** `DATA_TABLE` as a part id: `dataTable`. */
const idOf = (name: string) => name.toLowerCase().replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())

function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) return sources(path)
        return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : []
    })
}

/** The source of `export const <NAME>_WORDS … = …` up to the line that closes it. */
function wordsSource(text: string, name: string): string | undefined {
    const start = text.search(new RegExp(`^export const ${name}_WORDS\\b`, 'm'))
    if (start === -1) return undefined
    const rest = text.slice(start)
    const firstLine = rest.split('\n', 1)[0] as string
    if (/[}\]]\s*$/.test(firstLine) || !/[{[(]\s*$/.test(firstLine)) return firstLine
    const end = rest.search(/^[})\]]/m)
    return rest.slice(0, end + 1)
}

/** Sample values for an argument, by how the English message uses it. */
function samples(message: string, arg: string): unknown[] {
    const typed = (type: string) => new RegExp(`\\{\\s*${arg}\\s*,\\s*${type}\\b`).test(message)
    const optional = new RegExp(`\\{\\s*${arg}\\s*,\\s*select\\s*,[^]*\\bundefined\\s*\\{`).test(message) ? [undefined] : []
    if (typed('date') || typed('time')) return [new Date(2026, 10, 17, 9, 5), new Date(2026, 0, 3, 18, 45)]
    if (typed('plural') || typed('selectordinal') || typed('number')) return [...optional, 0, 1, 2, 3, 7, 11, 12, 13, 21, 22, 23, 101, 999]
    const select = new RegExp(`\\{\\s*${arg}\\s*,\\s*select\\s*,`).exec(message)
    if (select) {
        const keys = [...message.slice(select.index).matchAll(/(?:,|\})\s*([\w-]+)\s*\{/g)].map((match) => match[1] as string)
        if (keys.includes('true')) return [true, false]
        return [...new Set(keys.filter((key) => key !== 'other')), 'something else'].map((key) => (key === 'undefined' ? undefined : key))
    }
    return ['nightly-export', 'grace']
}

describe('the parts', () => {
    it('finds parts in the packages', () => {
        expect(ALL.length).toBeGreaterThan(0)
    })

    it.each(PACKAGES)('in %s, gives every exported <NAME>_WORDS a <NAME>_PART under the id its name makes', async (pkg) => {
        const problems: string[] = []
        const found = PARTS.get(pkg) ?? []
        for (const file of sources(join(ROOT, 'packages', pkg, 'src'))) {
            const text = readFileSync(file, 'utf8')
            for (const [, name] of text.matchAll(/^export const ([A-Z][A-Z0-9_]*)_WORDS\b/gm)) {
                const part = found.find((entry) => entry.name === name)
                if (part === undefined) {
                    problems.push(`${name}_WORDS has no ${name}_PART`)
                    continue
                }
                const module = (await import(file)) as Record<string, unknown>
                if (part.part.words !== module[`${name}_WORDS`]) problems.push(`${name}_PART's words are not ${name}_WORDS`)
                if (part.part.id !== idOf(name as string))
                    problems.push(`${name}_PART's id is ${part.part.id}, not ${idOf(name as string)}`)
            }
        }
        for (const part of found)
            if (!readFileSync(join(ROOT, part.file), 'utf8').includes(`export const ${part.name}_WORDS`))
                problems.push(`${part.name}_PART has no ${part.name}_WORDS beside it`)
        expect(problems).toEqual([])
    })

    it('gives every part an id of its own', () => {
        const ids = ALL.map((entry) => entry.part.id)
        expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([])
    })

    it('takes words from exactly the parts whose words a part spreads', () => {
        const problems: string[] = []
        for (const { name, file, part } of ALL) {
            const source = wordsSource(readFileSync(join(ROOT, file), 'utf8'), name) ?? ''
            const spread = [...source.matchAll(/\.\.\.([A-Z][A-Z0-9_]*)_WORDS\b/g)].map((match) => idOf(match[1] as string)).sort()
            const from = (part.from ?? []).map((other) => other.id).sort()
            if (spread.join() !== from.join())
                problems.push(`${name}_PART takes from [${from.join(', ')}] but ${name}_WORDS spreads [${spread.join(', ')}]`)
        }
        expect(problems).toEqual([])
    })

    it('names the arguments of every phrase, and only of phrases', () => {
        const problems: string[] = []
        for (const { name, part, messages } of ALL) {
            const words = part.words as Record<string, unknown>
            const args = (part.args ?? {}) as Record<string, string>
            for (const [key, value] of Object.entries(words)) {
                const inherited = (part.from ?? []).some((from) => (from.words as Record<string, unknown>)[key] === value)
                if (typeof value !== 'function' || inherited) continue
                const message = messages?.[key]
                if (message === undefined) problems.push(`${name}_MESSAGES has no message for ${key}`)
                else if (message !== null && args[key] === undefined) problems.push(`${name}_PART names no arguments for ${key}`)
                else if (message === null && args[key] !== undefined)
                    problems.push(`${name}_PART names arguments for ${key}, which has no message`)
            }
            for (const key of Object.keys(args))
                if (typeof words[key] !== 'function') problems.push(`${name}_PART names arguments for ${key}, which is not a phrase`)
            for (const key of Object.keys(messages ?? {}))
                if (typeof words[key] !== 'function') problems.push(`${name}_MESSAGES holds ${key}, which is not a phrase`)
        }
        expect(problems).toEqual([])
    })

    it("says in each English message what the phrase's English function says", () => {
        const problems: string[] = []
        for (const { name, part, messages } of ALL) {
            for (const [key, message] of Object.entries(messages ?? {})) {
                if (message === null) continue
                const phrase = (part.words as Record<string, unknown>)[key] as (...args: unknown[]) => unknown
                const names = ((part.args ?? {}) as Record<string, string>)[key]?.split(' ').filter(Boolean) ?? []
                const unnamed = messageArguments(message).filter((arg) => !names.includes(arg))
                if (unnamed.length > 0)
                    problems.push(`${name}.${key}: the message takes ${unnamed.join(', ')}, which the phrase does not name`)
                if (names.length < phrase.length)
                    problems.push(
                        `${name}.${key}: the phrase takes ${String(phrase.length)} arguments, but ${String(names.length)} are named`,
                    )
                const options = names.map((arg) => samples(message, arg))
                const rounds = Math.max(1, ...options.map((values) => values.length))
                for (let round = 0; round < rounds; round++) {
                    const values = options.map((values) => values[round % values.length])
                    const said = String(phrase(...values))
                    const formatted = formatMessage(message, Object.fromEntries(names.map((arg, index) => [arg, values[index]])), 'en-US')
                    if (said !== formatted)
                        problems.push(
                            `${name}.${key}(${values.map((value) => JSON.stringify(value)).join(', ')}): "${said}", but the message says "${formatted}"`,
                        )
                }
            }
        }
        expect(problems).toEqual([])
    })
})

describe('the catalogs', () => {
    it.each(PACKAGES)('hold for %s what its parts make', (pkg) => {
        const parts = PARTS.get(pkg) ?? []
        const path = catalogPath(pkg)
        if (parts.length === 0) {
            expect(existsSync(path)).toBe(false)
            return
        }
        expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(catalogOf(parts))
    })

    it('read back as the English words, each message compiling', () => {
        const problems: string[] = []
        for (const pkg of PACKAGES) {
            const path = catalogPath(pkg)
            if (!existsSync(path)) continue
            for (const [id, message] of Object.entries(JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>)) {
                try {
                    compileMessage(message)
                } catch (error) {
                    problems.push(`${id}: ${(error as Error).message}`)
                }
            }
        }
        expect(problems).toEqual([])
    })

    it('quote plain words so they read back as themselves', () => {
        for (const text of ["Don't", "It's '{x}'", 'a {b} c', "''", "end'", '{{x}}', 'Step #1'])
            expect(formatMessage(quoted(text))).toBe(text)
    })
})
