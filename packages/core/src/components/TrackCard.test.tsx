import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TRACK_AFFILIATIONS, TRACK_COLORS } from '../lib/tracks'
import { TrackCard } from './TrackCard'
import { TrackGlyph } from './TrackGlyph'

const NOW = Date.UTC(2026, 10, 20, 14, 30)

describe('TrackGlyph', () => {
    it('draws its kind in its affiliation token, turned to its heading', () => {
        const html = renderToStaticMarkup(<TrackGlyph kind="vessel" affiliation="hostile" heading={110} label />)
        expect(html).toContain('color:var(--track-hostile)')
        expect(html).toContain('rotate(110 24 24)')
        expect(html).toContain('aria-label="Hostile vessel"')
    })

    it('never turns a sensor, and is hidden without a label', () => {
        const html = renderToStaticMarkup(<TrackGlyph kind="sensor" heading={90} />)
        expect(html).not.toContain('rotate(')
        expect(html).toContain('aria-hidden="true"')
    })

    it('has a token for every affiliation', () => {
        for (const affiliation of TRACK_AFFILIATIONS) expect(TRACK_COLORS[affiliation]).toBe(`var(--track-${affiliation})`)
    })
})

describe('TrackCard', () => {
    it('shows the name, the id, the affiliation, the states and the freshness', () => {
        const html = renderToStaticMarkup(
            <TrackCard
                name="Contact 14"
                code="contact-14"
                kind="vessel"
                affiliation="hostile"
                states={['Simulated', { label: 'Live', tone: 'good' }]}
                updatedAt={NOW - 2000}
                now={NOW}
            />,
        )
        for (const word of ['Contact 14', 'contact-14', 'Hostile', 'Simulated', 'Live']) expect(html).toContain(word)
        expect(html).toContain('data-slot="freshness"')
        expect(html).toContain('data-state="live"')
    })

    it('makes the affiliation a menu only with onAffiliationChange', () => {
        const still = renderToStaticMarkup(<TrackCard name="New 33" kind="vessel" affiliation="pending" />)
        expect(still).not.toContain('data-slot="chip-select"')
        const menu = renderToStaticMarkup(
            <TrackCard name="New 33" kind="vessel" affiliation="pending" onAffiliationChange={() => undefined} />,
        )
        expect(menu).toContain('data-slot="chip-select"')
        expect(menu).toContain('Affiliation: Pending. Change')
    })

    it('drops its frame for a list row, and draws no freshness without a time', () => {
        const html = renderToStaticMarkup(<TrackCard name="Pilot 2" kind="vessel" affiliation="friend" framed={false} />)
        expect(html).not.toContain('rounded-surface border')
        expect(html).not.toContain('data-slot="freshness"')
    })
})
