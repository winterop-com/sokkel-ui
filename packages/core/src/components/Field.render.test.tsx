import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { describedBy, Field } from './Field'

/** How many elements open before the control, so two drawings can be told to hold it at one depth. */
const depthOf = (html: string) => html.slice(0, html.indexOf('<input')).split('<div').length

describe('Field', () => {
    it('keeps its control at one place whether or not it has an issue, so an issue never mounts it afresh', () => {
        const plain = renderToStaticMarkup(
            <Field id="period" label="Reporting period">
                <input id="period" />
            </Field>,
        )
        const refused = renderToStaticMarkup(
            <Field id="period" label="Reporting period" error="Say which period the report is for.">
                <input id="period" />
            </Field>,
        )
        expect(depthOf(refused)).toBe(depthOf(plain))
        expect(refused).toContain('pr-9')
        expect(plain).not.toContain('pr-9')
    })
})

describe('a required field', () => {
    it('keeps the star in its label by default', () => {
        const html = renderToStaticMarkup(
            <Field id="job" label="Job" required>
                <input id="job" />
            </Field>,
        )
        expect(html).toMatch(/<label[^>]*>Job<span[^>]*>\*<\/span><span class="sr-only">required<\/span><\/label>/)
    })

    it('draws the word after its label and outside it, so the label alone names the control', () => {
        const html = renderToStaticMarkup(
            <Field id="job" label="Job" required requiredMark="word" words={{ required: 'needed' }}>
                <input id="job" />
            </Field>,
        )
        expect(html).toMatch(/<label[^>]*>Job<\/label><span[^>]*>needed<\/span>/)
        expect(html).not.toContain('*')
    })
})

describe('a fallback', () => {
    it('is a line under the control after the help, which describedBy names', () => {
        const html = renderToStaticMarkup(
            <Field id="retries" label="Retries" help="Per step." fallback="Default is 3 retries">
                <input id="retries" />
            </Field>,
        )
        expect(html.indexOf('<input')).toBeLessThan(html.indexOf('Per step.'))
        expect(html.indexOf('Per step.')).toBeLessThan(html.indexOf('id="retries-fallback"'))
        expect(describedBy('retries', { help: 'Per step.', fallback: 'Default is 3 retries' })).toBe('retries-help retries-fallback')
    })
})
