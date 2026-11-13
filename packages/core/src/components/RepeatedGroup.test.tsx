import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RepeatedDrag } from './RepeatedDrag'
import { RepeatedGroup } from './RepeatedGroup'
import { SchemaForm, useSchemaForm } from './schema/SchemaForm'
import type { JsonSchema } from './schema/read'

const ROWS = [{ key: 'a' }, { key: 'b' }]

describe('a repeated group', () => {
    it('marks a required group with a star and says it to a screen reader', () => {
        const html = renderToStaticMarkup(
            <RepeatedGroup label="Services" rows={ROWS} required words={{ required: 'needed' }}>
                {(key) => <span>{key}</span>}
            </RepeatedGroup>,
        )
        expect(html).toMatch(/aria-hidden="true">\*<\/span>/)
        expect(html).toContain('<span class="sr-only">needed</span>')
    })

    it('draws no mark without an issue, and the mark beside its name with one', () => {
        const plain = renderToStaticMarkup(
            <RepeatedGroup label="Services" rows={ROWS}>
                {(key) => <span>{key}</span>}
            </RepeatedGroup>,
        )
        expect(plain).not.toContain('data-issue')
        expect(plain).not.toContain('size-7')
        const refused = renderToStaticMarkup(
            <RepeatedGroup id="services" label="Services" rows={ROWS} error="Add at least 3 services">
                {(key) => <span>{key}</span>}
            </RepeatedGroup>,
        )
        expect(refused).toContain('id="services"')
        expect(refused).toContain('size-7')
    })
})

function Form({ schema, initial }: { schema: JsonSchema; initial: unknown }) {
    const form = useSchemaForm(schema, { initial, defaultSubmitted: true })
    return <SchemaForm form={form} marks={false} />
}

describe("a schema form's list of records", () => {
    it('is a repeated group, required by its object and marked when the list as a whole is refused', () => {
        const schema: JsonSchema = {
            type: 'object',
            required: ['services'],
            properties: {
                services: {
                    type: 'array',
                    title: 'Services',
                    minItems: 2,
                    items: { type: 'object', properties: { name: { type: 'string' } } },
                },
            },
        }
        const html = renderToStaticMarkup(<Form schema={schema} initial={{ services: [{ name: 'api' }] }} />)
        expect(html).toContain('<fieldset')
        expect(html).toContain('<span class="sr-only">required</span>')
        expect(html).toContain('aria-label="Remove Item 1"')
    })

    it('draws a grip on each row only inside a RepeatedDrag', () => {
        const group = (
            <RepeatedGroup label="Services" rows={ROWS} onMove={() => undefined}>
                {(key) => <span>{key}</span>}
            </RepeatedGroup>
        )
        expect(renderToStaticMarkup(group)).not.toContain('aria-label="Move Item 1"')
        const dragged = renderToStaticMarkup(<RepeatedDrag>{group}</RepeatedDrag>)
        expect(dragged).toContain('aria-label="Move Item 1"')
        expect(dragged).toContain('aria-label="Move Item 2"')
    })
})
