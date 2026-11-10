import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Callout } from './Callout'

describe('Callout', () => {
    it('draws a boxed note with a full edge and no colored rule on one side', () => {
        const html = renderToStaticMarkup(<Callout title="nightly-export failed">The run stopped at upload.</Callout>)
        expect(html).toContain('role="note"')
        expect(html).toContain('rounded-surface border ')
        expect(html).not.toMatch(/border-[lrse]-/)
        expect(html).toContain('nightly-export failed')
        expect(html).toContain('<svg')
    })

    it('says a critical callout as an alert, in its tone', () => {
        const html = renderToStaticMarkup(<Callout tone="critical" title="nightly-export failed" />)
        expect(html).toContain('role="alert"')
        expect(html).toContain('border-critical/35')
        expect(html).toContain('text-critical-ink')
    })

    it('draws the neutral tone on the panel ground with the hairline', () => {
        const html = renderToStaticMarkup(<Callout tone="neutral">Runs are kept for 30 days.</Callout>)
        expect(html).toContain('data-tone="neutral"')
        expect(html).toContain('border-border bg-panel-ground')
    })

    it('drops the icon when told to, and draws backticked words as code', () => {
        const html = renderToStaticMarkup(
            <Callout icon={false} tone="warning">
                Set `schedule` to run it nightly.
            </Callout>,
        )
        expect(html).not.toContain('<svg')
        expect(html).toContain('<code')
    })
})
