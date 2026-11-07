import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

interface Tokens {
    themes: Record<string, { light?: Record<string, string>; dark?: Record<string, string> }>
}

const tokens = JSON.parse(readFileSync(join(__dirname, '..', 'tokens', 'tokens.json'), 'utf8')) as Tokens

/** The lightness of an oklch color, or null for a color written another way. */
function lightness(value: string | undefined): number | null {
    const match = value === undefined ? null : /^oklch\(([\d.]+) /.exec(value)
    return match === null ? null : Number(match[1])
}

/** The least two fills may differ in lightness for one to show on the other. */
const APART = 0.03

/** The fills a chosen item, a chip or a highlight paints, and the surfaces they are painted on. */
const FILLS = ['muted', 'secondary', 'accent'] as const
const SURFACES = ['popover', 'card', 'background'] as const

describe('the tokens', () => {
    const base = tokens.themes.default
    for (const [theme, schemes] of Object.entries(tokens.themes)) {
        for (const scheme of ['light', 'dark'] as const) {
            it(`set ${theme} ${scheme}'s fills apart from the surfaces they sit on`, () => {
                const colors = { ...base[scheme], ...schemes[scheme] }
                const close: string[] = []
                for (const fill of FILLS) {
                    for (const surface of SURFACES) {
                        const a = lightness(colors[fill])
                        const b = lightness(colors[surface])
                        if (a === null || b === null) continue
                        if (Math.round(Math.abs(a - b) * 1000) / 1000 < APART) close.push(`${fill} ${String(a)} on ${surface} ${String(b)}`)
                    }
                }
                expect(close, close.join('\n')).toEqual([])
            })
        }
    }
})
