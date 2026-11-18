/**
 * Write each package's English catalog, packages/<package>/messages/en.json: every word a part says,
 * by message id, as an ICU MessageFormat string. A part's words are its `<NAME>_WORDS`, found through
 * its `<NAME>_PART` (`lib/words`): a plain word is written as it is, quoted where ICU would read it
 * otherwise, and a phrase taking arguments is its English message in `<NAME>_MESSAGES`. A phrase whose
 * message is null formats rather than says and is left out. Ids are sorted, so a part's words stand together.
 *
 *   bun scripts/messages.ts          write the catalogs
 *   bun scripts/messages.ts --check  fail when a catalog is not what the parts make
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import { partMessageIds } from '../packages/core/src/lib/catalog'
import type { WordsPart } from '../packages/core/src/lib/words'

import { PACKAGES, type PackageDir } from './components-index'

const ROOT = join(import.meta.dirname, '..')

/** A part found in a package: its words, the module it is in and its English messages. */
export interface FoundPart {
    name: string
    file: string
    part: WordsPart<object>
    messages: Record<string, string | null> | undefined
}

function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) return sources(path)
        return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : []
    })
}

/** Every part of a package, by the `<NAME>_PART` its modules export. */
export async function partsOf(pkg: PackageDir): Promise<FoundPart[]> {
    const found: FoundPart[] = []
    for (const file of sources(join(ROOT, 'packages', pkg, 'src'))) {
        const text = readFileSync(file, 'utf8')
        const names = [...text.matchAll(/^export const ([A-Z][A-Z0-9_]*)_PART\b/gm)].map((match) => match[1] as string)
        if (names.length === 0) continue
        const module = (await import(file)) as Record<string, unknown>
        for (const name of names) {
            found.push({
                name,
                file: relative(ROOT, file),
                part: module[`${name}_PART`] as WordsPart<object>,
                messages: module[`${name}_MESSAGES`] as Record<string, string | null> | undefined,
            })
        }
    }
    return found.sort((a, b) => a.part.id.localeCompare(b.part.id))
}

/** Plain text as an ICU message that reads back as the same text. */
export function quoted(text: string): string {
    return text.replace(/'(?=['{}]|$)/g, "''").replace(/[{}]+/g, (braces) => `'${braces}'`)
}

/** A package's English catalog, by message id; throws on a phrase with no English message. */
export function catalogOf(parts: readonly FoundPart[]): Record<string, string> {
    const catalog: Record<string, string> = {}
    for (const { name, part, messages } of parts) {
        for (const [id, value] of partMessageIds(part)) {
            if (id in catalog) throw new Error(`${id} is held by two parts`)
            if (typeof value === 'string') catalog[id] = quoted(value)
            else if (typeof value === 'function') {
                const key = id.slice(part.id.length + 1)
                const message = messages?.[key]
                if (message === undefined) throw new Error(`${name}_MESSAGES has no message for ${key}, a phrase of ${name}_WORDS`)
                if (message !== null) catalog[id] = message
            }
        }
    }
    return Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

export const catalogPath = (pkg: PackageDir) => join(ROOT, 'packages', pkg, 'messages', 'en.json')

if (import.meta.main) {
    const check = process.argv.includes('--check')
    const stale: string[] = []
    for (const pkg of PACKAGES) {
        const parts = await partsOf(pkg)
        const path = catalogPath(pkg)
        if (parts.length === 0) {
            if (existsSync(path)) stale.push(`${relative(ROOT, path)} is there, but ${pkg} has no words`)
            continue
        }
        const text = `${JSON.stringify(catalogOf(parts), null, 4)}\n`
        const current = existsSync(path) ? readFileSync(path, 'utf8') : undefined
        if (current === text) continue
        if (check) stale.push(`${relative(ROOT, path)} is not what the parts make`)
        else {
            mkdirSync(dirname(path), { recursive: true })
            writeFileSync(path, text)
            console.log(`Wrote ${relative(ROOT, path)}`)
        }
    }
    if (stale.length > 0) {
        console.error(`${stale.join('\n')}\nRun \`bun run messages\` and commit the result.`)
        process.exit(1)
    }
    // A module the parts import can keep a timer alive; the catalogs are written, so stop here.
    process.exit(0)
}
