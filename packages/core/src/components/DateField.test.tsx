import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DateField } from './DateField'
import { DateTimeField } from './DateTimeField'
import { TimeField } from './TimeField'

describe('DateField', () => {
    it('writes its value in its format', () => {
        expect(renderToStaticMarkup(<DateField id="start" label="Start" defaultValue="2026-11-09" />)).toContain('value="2026-11-09"')
        expect(renderToStaticMarkup(<DateField id="start" label="Start" value="2026-11-09" format="DD.MM.YYYY" />)).toContain(
            'value="09.11.2026"',
        )
    })

    it('says at once a date given outside its bounds, with the bound written in its format', () => {
        const html = renderToStaticMarkup(<DateField id="start" label="Start" value="2026-11-02" min="2026-11-09" format="DD.MM.YYYY" />)
        expect(html).toContain('aria-label="Error: Enter 09.11.2026 or later"')
        expect(html).toContain('aria-invalid="true"')
    })

    it('says nothing of a date within its bounds, nor of an empty field', () => {
        expect(renderToStaticMarkup(<DateField id="start" label="Start" value="2026-11-09" min="2026-11-09" />)).not.toContain('Error:')
        expect(renderToStaticMarkup(<DateField id="start" label="Start" value={null} min="2026-11-09" />)).not.toContain('Error:')
    })

    it('can be cleared only when it is optional and holds a date', () => {
        expect(renderToStaticMarkup(<DateField id="start" label="Start" value="2026-11-09" />)).toContain('aria-label="Clear"')
        expect(renderToStaticMarkup(<DateField id="start" label="Start" value="2026-11-09" required />)).not.toContain('aria-label="Clear"')
        expect(renderToStaticMarkup(<DateField id="start" label="Start" value={null} />)).not.toContain('aria-label="Clear"')
    })

    it('draws no buttons when it cannot be changed', () => {
        const html = renderToStaticMarkup(<DateField id="start" label="Start" value="2026-11-09" readOnly />)
        expect(html).not.toContain('aria-label="Choose a date"')
        expect(html).not.toContain('aria-label="Clear"')
    })

    it('says its words in the language given', () => {
        const html = renderToStaticMarkup(
            <DateField
                id="start"
                label="Start"
                value="2026-11-02"
                min="2026-11-09"
                words={{ under: (min) => `Tidligst ${min}`, pick: 'Velg dato' }}
            />,
        )
        expect(html).toContain('Tidligst 2026-11-09')
        expect(html).toContain('aria-label="Velg dato"')
    })
})

describe('TimeField', () => {
    it('writes its value on its clock, with the zone after it', () => {
        expect(renderToStaticMarkup(<TimeField id="at" label="At" value="14:30" />)).toContain('value="14:30"')
        const twelve = renderToStaticMarkup(<TimeField id="at" label="At" value="14:30" clock={12} zone="UTC" />)
        expect(twelve).toContain('value="2:30 PM"')
        expect(twelve).toContain('>UTC</span>')
    })

    it('says a time after its bound, with the bound fitted to its seconds', () => {
        expect(renderToStaticMarkup(<TimeField id="at" label="At" value="23:30:00" max="22:00" seconds />)).toContain(
            'Error: Enter 22:00:00 or earlier',
        )
    })
})

describe('DateTimeField', () => {
    it('writes the date and the time with a space between them', () => {
        expect(renderToStaticMarkup(<DateTimeField id="at" label="At" value="2026-11-09T14:30" />)).toContain('value="2026-11-09 14:30"')
        expect(
            renderToStaticMarkup(<DateTimeField id="at" label="At" value="2026-11-09T14:30" format="DD.MM.YYYY" clock={12} />),
        ).toContain('value="09.11.2026 2:30 PM"')
    })

    it('says a moment before its bound', () => {
        expect(renderToStaticMarkup(<DateTimeField id="at" label="At" value="2026-11-09T01:00" min="2026-11-09T02:00" />)).toContain(
            'Error: Enter 2026-11-09 02:00 or later',
        )
    })
})
