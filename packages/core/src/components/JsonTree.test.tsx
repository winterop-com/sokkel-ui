import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { JsonTree } from './JsonTree'

const numbers = (count: number) => Array.from({ length: count }, (_, index) => 1000 + index)
const drawn = (html: string) => html.match(/tabular-nums">\d+</g)?.length ?? 0

describe('JsonTree', () => {
    it('draws every entry of a short list', () => {
        const html = renderToStaticMarkup(<JsonTree value={numbers(40)} />)
        expect(drawn(html)).toBe(40)
        expect(html).not.toContain('more')
    })

    it('draws the first hundred entries of a long list and a step for the next hundred', () => {
        const html = renderToStaticMarkup(<JsonTree value={numbers(240)} />)
        expect(drawn(html)).toBe(100)
        expect(html).toContain('>1099<')
        expect(html).not.toContain('>1100<')
        expect(html).toContain('Show 100 more')
    })

    it('says only what is left when fewer than the step remain', () => {
        const html = renderToStaticMarkup(<JsonTree value={numbers(130)} />)
        expect(html).toContain('Show 30 more')
    })

    it('caps an object as it caps a list, at its own limit and in its own words', () => {
        const value = Object.fromEntries(numbers(12).map((number) => [`job_${String(number)}`, number]))
        const html = renderToStaticMarkup(<JsonTree value={value} limit={5} words={{ more: (count) => `+${String(count)}` }} />)
        expect(drawn(html)).toBe(5)
        expect(html).toContain('>+5<')
    })

    it('still counts every entry of a folded list', () => {
        const html = renderToStaticMarkup(<JsonTree value={{ runs: numbers(240) }} open={1} />)
        expect(html).toContain('240')
        expect(html).not.toContain('more')
    })
})
