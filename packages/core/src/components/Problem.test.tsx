import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ProblemLine } from './Problem'
import { Problem } from './Problem'

describe('ProblemLine', () => {
    it('is an alert in the critical ink with its code drawn in the code face', () => {
        const html = renderToStaticMarkup(<ProblemLine>The server refused `harbor`.</ProblemLine>)
        expect(html).toContain('role="alert"')
        expect(html).toContain('text-critical-ink')
        expect(html).toMatch(/<code[^>]*>harbor<\/code>/)
    })

    it('is a status in the warning tone', () => {
        const html = renderToStaticMarkup(<ProblemLine tone="warning">Partly sent.</ProblemLine>)
        expect(html).toContain('role="status"')
        expect(html).toContain('text-warning-ink')
    })
})

describe('Problem', () => {
    it("marks its tone in the tone's ink, its rule and corners on its logical sides", () => {
        const html = renderToStaticMarkup(<Problem title="The api did not answer" />)
        expect(html).toContain('text-critical-ink')
        expect(html).toContain('border-s-2')
        expect(html).toContain('rounded-e-control')
        expect(renderToStaticMarkup(<Problem tone="warning" title="Partly sent" />)).toContain('text-warning-ink')
    })
})
