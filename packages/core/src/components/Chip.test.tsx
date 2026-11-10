import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Chip } from './Chip'
import { Dot } from './Dot'
import { StatusChip } from './StatusChip'

describe('Chip', () => {
    it('draws its tone, neutral by default, and an absent value dashed', () => {
        expect(renderToStaticMarkup(<Chip>nightly</Chip>)).toContain('bg-faint/15 text-muted-foreground')
        expect(renderToStaticMarkup(<Chip tone="good">healthy</Chip>)).toContain('bg-good/15 text-good-ink')
        expect(renderToStaticMarkup(<Chip tone="critical">over budget</Chip>)).toContain('bg-critical/15 text-critical-ink')
        expect(renderToStaticMarkup(<Chip tone="absent">no owner</Chip>)).toContain('border-dashed')
    })

    it('is words alone without handlers, the code face with mono, and says its title on hover', () => {
        const html = renderToStaticMarkup(
            <Chip mono title="nightly-export">
                nightly-export
            </Chip>,
        )
        expect(html).not.toContain('<button')
        expect(html).toContain('font-mono')
        expect(html).toContain('title="nightly-export"')
    })

    it('is a button with onSelect and ends in a named remove button with onRemove', () => {
        const html = renderToStaticMarkup(
            <Chip onSelect={() => undefined} onRemove={() => undefined}>
                harbor
            </Chip>,
        )
        expect(html).toContain('data-slot="chip-select"')
        expect(html).toContain('aria-label="Remove"')
        expect(html.match(/<button/g)).toHaveLength(2)
    })

    it('takes its remove word from words', () => {
        const html = renderToStaticMarkup(
            <Chip onRemove={() => undefined} words={{ remove: 'Fjern' }}>
                harbor
            </Chip>,
        )
        expect(html).toContain('aria-label="Fjern"')
    })
})

describe('Dot', () => {
    it('is hidden alone, and an image named by its label', () => {
        expect(renderToStaticMarkup(<Dot status="failed" />)).toContain('aria-hidden="true"')
        const named = renderToStaticMarkup(<Dot status="failed" label="failed" />)
        expect(named).toContain('role="img"')
        expect(named).toContain('aria-label="failed"')
    })

    it('keeps 10px by default and draws 8px at md', () => {
        expect(renderToStaticMarkup(<Dot />)).toContain('size-2.5')
        expect(renderToStaticMarkup(<Dot size="md" />)).toMatch(/\bsize-2\b(?!\.)/)
    })

    it("draws a hollow dot's ring in the tone's ink", () => {
        expect(renderToStaticMarkup(<Dot status="failed" outline />)).toContain('border-color:var(--status-failed-ink)')
        expect(renderToStaticMarkup(<Dot kind="blue" outline />)).toContain('border-color:var(--kind-blue-ink)')
        expect(renderToStaticMarkup(<Dot outline />)).toContain('border-border-strong')
    })

    it('says the word beside it, the dot then hidden', () => {
        const html = renderToStaticMarkup(<Dot status="completed_with_errors" say />)
        expect(html).toContain('>completed with errors<')
        expect(html).toContain('aria-hidden="true"')
        expect(renderToStaticMarkup(<Dot status="running" say="running, step 3 of 5" />)).toContain('>running, step 3 of 5<')
    })

    it('is in the tab order when focusable, named by its tip', () => {
        const html = renderToStaticMarkup(<Dot status="failed" tip="Last run failed" focusable />)
        expect(html).toContain('tabindex="0"')
        expect(html).toContain('aria-label="Last run failed"')
    })
})

describe('StatusChip', () => {
    it('draws an 8px dot in the state color with dot', () => {
        const html = renderToStaticMarkup(<StatusChip status="failed" dot />)
        expect(html).toMatch(/\bsize-2\b(?!\.)/)
        expect(html).toContain('background:var(--status-failed)')
    })
})
