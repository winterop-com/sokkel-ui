import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { localeNumber } from '../lib/numbers'
import { NumberField } from './NumberField'

describe('NumberField', () => {
    it('writes its value with its format, and its unit beside it', () => {
        const html = renderToStaticMarkup(
            <NumberField id="timeout" label="Timeout" value={3600.5} suffix="s" format={localeNumber('de-DE').format} />,
        )
        expect(html).toContain('value="3.600,5"')
        expect(html).toContain('>s</span>')
    })

    it('says at once a number given over its bound', () => {
        const html = renderToStaticMarkup(<NumberField id="timeout" label="Timeout" value={7200} min={1} max={3600} />)
        expect(html).toContain('aria-label="Error: Enter 3600 or less"')
    })

    it('stops its stepper at the bounds', () => {
        const low = renderToStaticMarkup(<NumberField id="retries" label="Retries" value={0} min={0} max={10} stepper />)
        expect(low).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Decrease"|<button[^>]*aria-label="Decrease"[^>]*disabled=""/)
        expect(low).not.toMatch(/<button[^>]*disabled=""[^>]*aria-label="Increase"|<button[^>]*aria-label="Increase"[^>]*disabled=""/)
    })

    it('takes a number keyboard for whole numbers that are not negative', () => {
        expect(renderToStaticMarkup(<NumberField id="retries" label="Retries" value={3} min={0} integer />)).toContain(
            'inputMode="numeric"',
        )
        expect(renderToStaticMarkup(<NumberField id="offset" label="Offset" value={3} />)).toContain('inputMode="decimal"')
    })

    it('has no clear button, since an empty number is typed away', () => {
        expect(renderToStaticMarkup(<NumberField id="retries" label="Retries" value={3} />)).not.toContain('aria-label="Clear"')
    })
})
