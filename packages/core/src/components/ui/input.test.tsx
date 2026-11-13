import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Input } from './input'
import { Textarea } from './textarea'

/** The classes of the first element in `html`. */
const classes = (html: string) => (/class="([^"]*)"/.exec(html)?.[1] ?? '').split(/\s+/)

describe('Input', () => {
    it("is as tall as the density's control", () => {
        expect(classes(renderToStaticMarkup(<Input />))).toContain('h-(--density-control)')
    })

    it('marks an issue with its edge at rest and draws the ring only on focus', () => {
        for (const html of [renderToStaticMarkup(<Input aria-invalid />), renderToStaticMarkup(<Textarea aria-invalid />)]) {
            const own = classes(html)
            expect(own).toContain('aria-invalid:border-destructive')
            expect(own).toContain('aria-invalid:focus-visible:ring-3')
            expect(own.filter((name) => name.includes('invalid') && /:ring-[1-9]/.test(name) && !name.includes('focus'))).toEqual([])
        }
    })
})
