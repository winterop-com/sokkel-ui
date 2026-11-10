import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

interface Tokens {
    themes: Record<string, { light?: Record<string, string>; dark?: Record<string, string> }>
}

const tokens = JSON.parse(readFileSync(join(__dirname, '..', 'packages', 'core', 'tokens', 'tokens.json'), 'utf8')) as Tokens

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
    const base = tokens.themes.tidevann
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

/** The surfaces tidevann, the base theme, sets as fixed colors, which every other theme mixes from its own. */
const SURFACES_OF_THEIR_OWN = ['canvas', 'node', 'node-line', 'critical-wash', 'panel-line', 'panel-ground'] as const

describe('the tinted surfaces', () => {
    const base = tokens.themes.tidevann
    const styles = join(__dirname, '..', 'packages', 'core', 'src', 'styles')
    const fixed = new Set(SURFACES_OF_THEIR_OWN.flatMap((name) => [base.light?.[name], base.dark?.[name]]))
    for (const theme of Object.keys(tokens.themes).filter((name) => name !== 'tidevann')) {
        it(`set ${theme}'s own, never tidevann's`, () => {
            const css = readFileSync(join(styles, 'themes', `${theme}.css`), 'utf8')
            const blocks = [...css.matchAll(/^(html[^{}]*) \{\n([^}]*)\}/gm)]
            expect(blocks).toHaveLength(2)
            const wrong: string[] = []
            for (const [, selector, body] of blocks) {
                for (const name of SURFACES_OF_THEIR_OWN) {
                    const value = new RegExp(`^ +--${name}: (.+);$`, 'm').exec(body)?.[1]
                    if (value === undefined || fixed.has(value)) wrong.push(`${selector} --${name}: ${value ?? 'unset'}`)
                }
            }
            for (const [, name, value] of css.matchAll(/--([\w-]+): (.+);/g)) {
                if ((SURFACES_OF_THEIR_OWN as readonly string[]).includes(name) && fixed.has(value)) wrong.push(`--${name}: ${value}`)
            }
            expect(wrong, wrong.join('\n')).toEqual([])
        })
    }
})

describe('the brand', () => {
    for (const [theme, schemes] of Object.entries(tokens.themes)) {
        it(`is ${theme}'s own in both schemes`, () => {
            expect(schemes.light?.brand, 'light').toBeDefined()
            expect(schemes.dark?.brand, 'dark').toBeDefined()
            if (theme !== 'tidevann') expect(schemes.light?.brand).not.toBe(tokens.themes.tidevann.light?.brand)
        })
    }
})

describe('the terminal', () => {
    const base = tokens.themes.tidevann
    for (const [theme, schemes] of Object.entries(tokens.themes).filter(([name]) => name !== 'tidevann')) {
        it(`takes ${theme}'s own accent on its dark ground in both schemes`, () => {
            const light = schemes.light?.['terminal-accent']
            expect(light).toBeDefined()
            expect(light).not.toBe(base.light?.['terminal-accent'])
            expect(schemes.dark?.['terminal-accent']).toBe(light)
        })
    }
})

/** The corner roles a theme may set apart from each other, each derived from `--radius`. */
const CORNER_ROLES = ['control-radius', 'surface-radius'] as const

describe('the corners', () => {
    it('round controls and surfaces by roles a theme can set', () => {
        const theme = (tokens as unknown as { theme: Record<string, string> }).theme
        expect(theme['radius-control']).toBe('var(--control-radius)')
        expect(theme['radius-surface']).toBe('var(--surface-radius)')
    })
    for (const [name, schemes] of Object.entries(tokens.themes)) {
        it(`derive ${name}'s control and surface corners from --radius`, () => {
            const wrong = (['light', 'dark'] as const).flatMap((scheme) =>
                CORNER_ROLES.map((role) => [scheme, role, schemes[scheme]?.[role]] as const).filter(
                    ([, , value]) => value !== undefined && !value.includes('var(--radius)'),
                ),
            )
            expect(
                wrong.map((entry) => entry.join(' ')),
                'every corner derives from --radius',
            ).toEqual([])
        })
    }
})

describe('the theme files', () => {
    const resolve = createRequire(import.meta.url).resolve
    const styles = join(__dirname, '..', 'packages', 'core', 'src', 'styles')
    for (const theme of Object.keys(tokens.themes).filter((name) => name !== 'tidevann')) {
        it(`set ${theme}'s light and dark once each, for the whole app and for one element`, () => {
            const css = readFileSync(join(styles, 'themes', `${theme}.css`), 'utf8')
            const selectors = [...css.matchAll(/([^{}]+)\{[^}]*\}/g)].map(([, head]) =>
                head
                    .replace(/\/\*[^]*?\*\//g, '')
                    .trim()
                    .split(/,\s*/),
            )
            expect(selectors).toEqual([
                [`html[data-theme='${theme}']`, `[data-theme-scope='${theme}']`],
                [`html.dark[data-theme='${theme}']`, `.dark [data-theme-scope='${theme}']`],
            ])
        })
        it(`export ${theme} as themes/${theme}.css`, () => {
            expect(resolve(`@winterop-com/sokkel-ui/themes/${theme}.css`)).toBe(join(styles, 'themes', `${theme}.css`))
        })
    }
    it('export every theme together as themes.css', () => {
        expect(resolve('@winterop-com/sokkel-ui/themes.css')).toBe(join(styles, 'themes.css'))
    })
})
