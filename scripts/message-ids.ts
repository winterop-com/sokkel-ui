/**
 * Message ids are public: apps and the other renderers key their translations by them, and a word
 * whose id disappears falls back to English with no error. This keeps the ids the last release
 * shipped in `messages/released-ids.json` and fails when one of them is gone, unless
 * `docs/unreleased.md` names it (under Breaking), so a rename or a removal is always said.
 *
 *   bun run message-ids --check     fail on a released id that is gone and not named in unreleased.md
 *   bun run message-ids --record    write the current ids as released (the release PR runs it)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const RELEASED = join(ROOT, 'messages', 'released-ids.json')
const UNRELEASED = join(ROOT, 'docs', 'unreleased.md')

/** Every message id the packages' English catalogs hold, sorted. */
function currentIds(): string[] {
    const ids = new Set<string>()
    for (const pkg of readdirSync(join(ROOT, 'packages'))) {
        const file = join(ROOT, 'packages', pkg, 'messages', 'en.json')
        if (!existsSync(file)) continue
        for (const id of Object.keys(JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>)) ids.add(id)
    }
    return [...ids].sort()
}

if (process.argv.includes('--record')) {
    const ids = currentIds()
    writeFileSync(RELEASED, `${JSON.stringify(ids, null, 4)}\n`)
    console.log(`messages/released-ids.json holds ${String(ids.length)} ids`)
} else {
    const released = JSON.parse(readFileSync(RELEASED, 'utf8')) as string[]
    const now = new Set(currentIds())
    const said = readFileSync(UNRELEASED, 'utf8')
    const gone = released.filter((id) => !now.has(id))
    const unsaid = gone.filter((id) => !said.includes(`\`${id}\``))
    if (unsaid.length > 0) {
        console.error(`Message ids the last release shipped are gone, and docs/unreleased.md does not name them:`)
        for (const id of unsaid) console.error(`  ${id}`)
        console.error(
            "An app's translation for each falls back to English. Name each id in `backticks` under Breaking, with its new id if renamed.",
        )
        process.exit(1)
    }
    console.log(
        `message ids: ${String(released.length)} released, ${String(gone.length)} gone and named, ${String(now.size - (released.length - gone.length))} new`,
    )
}
