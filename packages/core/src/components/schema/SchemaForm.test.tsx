import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { JsonSchema } from './read'
import { SchemaForm, useSchemaForm } from './SchemaForm'

function Form({ schema, initial }: { schema: JsonSchema; initial: unknown }) {
    const form = useSchemaForm(schema, { initial })
    return <SchemaForm form={form} marks={false} />
}

const render = (schema: JsonSchema, initial: unknown) => renderToStaticMarkup(<Form schema={schema} initial={initial} />)

describe('a read-only group', () => {
    it('offers no Add or Remove and locks each item, as a list and as records', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: {
                labels: { type: 'array', readOnly: true, items: { type: 'string' } },
                steps: {
                    type: 'array',
                    readOnly: true,
                    items: { type: 'object', properties: { step: { type: 'string' }, retries: { type: 'integer' } } },
                },
            },
        }
        const html = render(schema, { labels: ['exports', 'orders'], steps: [{ step: 'fetch', retries: 2 }] })
        expect(html).not.toMatch(/>Remove</)
        expect(html).not.toMatch(/aria-label="Remove/)
        const inputs = html.match(/<input[^>]*>/g) ?? []
        expect(inputs.length).toBeGreaterThanOrEqual(4)
        for (const input of inputs) expect(input).toMatch(/readonly/i)
    })

    it('locks the fields of a read-only object', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: { owner: { type: 'object', readOnly: true, properties: { name: { type: 'string' } } } },
        }
        const inputs = render(schema, { owner: { name: 'ada' } }).match(/<input[^>]*>/g) ?? []
        expect(inputs).toHaveLength(1)
        expect(inputs[0]).toMatch(/readonly/i)
    })
})
