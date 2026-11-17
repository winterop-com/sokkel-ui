/**
 * Write the English emoji list `EmojiPicker` loads, packages/core/src/data/emoji-en.json, from the
 * `emojibase-data` the workspace pins as a dev dependency, keeping only what the picker reads. The
 * package carries the file, so no app installs `emojibase-data` and its every locale.
 *
 * One row per emoji, in the picker's order (by group, then the data set's order):
 *
 *   [emoji, name, keywords, group, version, skins?]
 *
 * `group` is the index of the group in `EMOJI_GROUPS`, `version` the emoji version that brought it,
 * and `skins`, where it takes a tone, the same emoji in the five tones, lightest first. The skin
 * tone components (the data set's group 2) and the emoji in no group are left out.
 *
 *   bun scripts/emoji-data.ts          write the file
 *   bun scripts/emoji-data.ts --check  fail when the file is not what the data set makes
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { EMOJI_GROUPS, type EmojiGroup, type EmojiRow } from '../packages/core/src/components/emoji-data'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'packages', 'core', 'src', 'data', 'emoji-en.json')

/** The data set's group numbers and the picker's group each one is; 2, the skin tone components, is left out. */
const GROUP_OF: Record<number, EmojiGroup> = {
    0: 'smileys',
    1: 'people',
    3: 'animals',
    4: 'food',
    5: 'travel',
    6: 'activities',
    7: 'objects',
    8: 'symbols',
    9: 'flags',
}

interface RawEmoji {
    label: string
    emoji: string
    tags?: string[]
    group?: number
    order?: number
    version: number
    skins?: { emoji: string; tone?: number | number[] }[]
}

function rows(raw: readonly RawEmoji[]): EmojiRow[] {
    const kept: [EmojiRow, number][] = []
    for (const item of raw) {
        const group = item.group === undefined ? undefined : GROUP_OF[item.group]
        if (group === undefined) continue
        const tones = new Map<number, string>()
        for (const skin of item.skins ?? []) if (typeof skin.tone === 'number') tones.set(skin.tone, skin.emoji)
        const row: EmojiRow = [item.emoji, item.label, item.tags ?? [], EMOJI_GROUPS.indexOf(group), item.version]
        if (tones.size === 5) row.push([1, 2, 3, 4, 5].map((tone) => tones.get(tone) ?? item.emoji))
        kept.push([row, item.order ?? 0])
    }
    return kept.sort((a, b) => a[0][3] - b[0][3] || a[1] - b[1]).map(([row]) => row)
}

/** The file's text: one row a line, so a new data set shows as a diff of the emoji it changes. */
function render(list: readonly EmojiRow[]): string {
    return `[\n${list.map((row) => JSON.stringify(row)).join(',\n')}\n]\n`
}

const require = createRequire(import.meta.url)
const version = (require('emojibase-data/package.json') as { version: string }).version
const text = render(rows(require('emojibase-data/en/data.json') as RawEmoji[]))

if (process.argv.includes('--check')) {
    let current = ''
    try {
        current = readFileSync(OUT, 'utf8')
    } catch {
        // A missing file differs like any other.
    }
    if (current !== text) {
        console.error(`packages/core/src/data/emoji-en.json is not what emojibase-data ${version} makes: run bun run emoji-data`)
        process.exit(1)
    }
    console.log(`packages/core/src/data/emoji-en.json matches emojibase-data ${version}`)
} else {
    writeFileSync(OUT, text)
    console.log(`wrote packages/core/src/data/emoji-en.json from emojibase-data ${version}: ${String(Buffer.byteLength(text))} bytes`)
}
