import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const CORE = join(import.meta.dirname, '..', 'packages', 'core')
const css = readFileSync(join(CORE, 'src', 'styles', 'tokens.css'), 'utf8')

/** The custom properties of the rule written for `selector`, one of its selectors, that holds the density's. */
function densityVars(selector: string): Record<string, string> {
    const blocks = [...css.matchAll(/^([^{}]+)\{([^}]*)\}/gm)].filter(
        ([, head, body]) => head.split(',').some((one) => one.trim() === selector) && body.includes('--density-'),
    )
    expect(blocks).toHaveLength(1)
    return Object.fromEntries([...blocks[0][2].matchAll(/(--density-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))
}

const rem = (value: string | undefined) => Number(/^([\d.]+)rem$/.exec(value ?? '')?.[1] ?? Number.NaN)

const SIZES = ['--density-control-xs', '--density-control-sm', '--density-control', '--density-control-lg']

describe('the token build', () => {
    it('writes a control height per size for every density level, the default one on :root', () => {
        const regular = densityVars("html[data-density='regular']")
        const compact = densityVars("html[data-density='compact']")
        expect(SIZES.map((name) => regular[name])).toEqual(['1.5rem', '1.75rem', '2rem', '2.25rem'])
        expect(SIZES.map((name) => compact[name])).toEqual(['1.25rem', '1.5rem', '1.75rem', '2rem'])
        expect(SIZES.map((name) => densityVars(':root')[name])).toEqual(SIZES.map((name) => regular[name]))
    })

    it('writes every level for one element too, on its density scope', () => {
        for (const level of ['regular', 'compact']) {
            expect(densityVars(`[data-density-scope='${level}']`)).toEqual(densityVars(`html[data-density='${level}']`))
        }
    })

    it('makes each compact control one step smaller than the regular one, the sizes still in order', () => {
        const regular = densityVars("html[data-density='regular']")
        const compact = densityVars("html[data-density='compact']")
        for (const [index, name] of SIZES.entries()) {
            expect(rem(compact[name])).toBeLessThan(rem(regular[name]))
            if (index > 0) expect(rem(compact[name])).toBe(rem(regular[SIZES[index - 1]]))
        }
    })
})
