import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Section } from './Section'

describe('Section', () => {
    it('is labelled by its heading, with the id given or its own', () => {
        const given = renderToStaticMarkup(
            <Section title="Steps" headingId="steps-heading">
                fetch
            </Section>,
        )
        expect(given).toContain('aria-labelledby="steps-heading"')
        expect(given).toContain('<h2 id="steps-heading"')
        const own = renderToStaticMarkup(<Section title="Steps">fetch</Section>)
        const [, id] = /aria-labelledby="([^"]+)"/.exec(own) ?? []
        expect(id).toBeTruthy()
        expect(own).toContain(`<h2 id="${id}"`)
        const flat = renderToStaticMarkup(
            <Section variant="flat" title="Steps" headingId="flat-heading">
                fetch
            </Section>,
        )
        expect(flat).toContain('aria-labelledby="flat-heading"')
        expect(flat).toContain('<h2 id="flat-heading"')
    })

    it('draws a plain section as before, with no tone and no mark', () => {
        const plain = renderToStaticMarkup(<Section title="Runs">nightly-export</Section>)
        expect(plain).not.toContain('data-tone')
        expect(plain).not.toContain('border-t-critical')
        expect(plain).not.toContain('<svg')
        expect(plain).not.toContain('bg-canvas')
    })

    it('draws a graph body on the canvas dot grid', () => {
        const graph = renderToStaticMarkup(
            <Section title="Steps" tone="graph" flush>
                fetch
            </Section>,
        )
        expect(graph).toContain('data-tone="graph"')
        expect(graph).toContain('bg-canvas')
        expect(graph).toContain('var(--panel-dot)')
    })

    it('marks a critical section with a top rule and a warning mark in its head', () => {
        const critical = renderToStaticMarkup(
            <Section title="Failed run" tone="critical">
                validate failed
            </Section>,
        )
        expect(critical).toContain('data-tone="critical"')
        expect(critical).toContain('border-t-critical')
        const [mark] = /<header[^>]*>.*?<svg[^>]*>/.exec(critical) ?? ['']
        expect(mark).toContain('text-critical')
        expect(mark).toContain('aria-hidden="true"')
    })

    it('gives the body the classes given for its layout', () => {
        const laid = renderToStaticMarkup(
            <Section title="Steps" bodyClassName="grid gap-2">
                fetch
            </Section>,
        )
        expect(laid).toMatch(/<div class="[^"]*grid gap-2[^"]*">fetch<\/div>/)
    })
})
