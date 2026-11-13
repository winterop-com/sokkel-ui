import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SelectField } from './SelectField'

const SERVICES = [
    { value: 'api', label: 'API' },
    { value: 'worker', label: 'Worker' },
    { value: 'scheduler', label: 'Scheduler', disabled: true },
]

describe('SelectField', () => {
    it('names its select by the label and shows the chosen option', () => {
        const html = renderToStaticMarkup(<SelectField id="service" label="Service" options={SERVICES} value="worker" />)
        expect(html).toContain('for="service"')
        expect(html).toMatch(/<button[^>]*id="service"/)
        expect(html).toContain('Worker')
    })

    it('shows its placeholder while nothing is chosen, or a value no option has', () => {
        const empty = renderToStaticMarkup(
            <SelectField id="service" label="Service" options={SERVICES} value="" placeholder="Pick a service" />,
        )
        expect(empty).toContain('Pick a service')
        const unknown = renderToStaticMarkup(
            <SelectField id="service" label="Service" options={SERVICES} value="nowhere" placeholder="Pick a service" />,
        )
        expect(unknown).toContain('Pick a service')
    })

    it('points at its help and fallback, and marks itself required', () => {
        const html = renderToStaticMarkup(
            <SelectField id="service" label="Service" options={SERVICES} help="Where the step runs." fallback="Default is api" required />,
        )
        expect(html).toContain('aria-describedby="service-help service-fallback"')
        expect(html).toContain('aria-required="true"')
    })

    it('marks a refused value invalid', () => {
        const html = renderToStaticMarkup(
            <SelectField id="service" label="Service" options={SERVICES} value="api" error="The api has no queue." />,
        )
        expect(html).toContain('aria-invalid="true"')
        expect(html).toContain('aria-label="Error: The api has no queue."')
    })

    it('turns off when disabled', () => {
        const html = renderToStaticMarkup(<SelectField id="service" label="Service" options={SERVICES} value="api" disabled />)
        expect(html).toMatch(/<button[^>]*disabled=""/)
    })

    it('says required in the words it is given', () => {
        const html = renderToStaticMarkup(
            <SelectField id="service" label="Service" options={SERVICES} required words={{ required: 'påkrevd' }} />,
        )
        expect(html).toContain('<span class="sr-only">påkrevd</span>')
    })

    it('draws the chosen option with its icon, and never its detail', () => {
        const options = [
            { value: 'api', label: 'API', icon: <svg data-mark="api" />, detail: 'inherited' },
            { value: 'worker', label: 'Worker', icon: <svg data-mark="worker" /> },
        ]
        const html = renderToStaticMarkup(<SelectField id="service" label="Service" options={options} value="api" />)
        expect(html).toContain('data-mark="api"')
        expect(html).toContain('API')
        expect(html).not.toContain('inherited')
        const empty = renderToStaticMarkup(
            <SelectField id="service" label="Service" options={options} value="" placeholder="Pick a service" />,
        )
        expect(empty).toContain('Pick a service')
        expect(empty).not.toContain('data-mark')
    })
})
