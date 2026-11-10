import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { JsonSchema } from './read'
import { SchemaForm, useSchemaForm, type SchemaFieldRenderer } from './SchemaForm'

function Form({ schema, initial, field }: { schema: JsonSchema; initial: unknown; field?: SchemaFieldRenderer }) {
    const form = useSchemaForm(schema, { initial })
    return <SchemaForm form={form} marks={false} field={field} />
}

const render = (schema: JsonSchema, initial: unknown, field?: SchemaFieldRenderer) =>
    renderToStaticMarkup(<Form schema={schema} initial={initial} field={field} />)

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

describe("an app's own control", () => {
    it('is asked for every field, an object, a list and a switch among them, once each', () => {
        const asked: string[] = []
        const schema: JsonSchema = {
            type: 'object',
            properties: {
                code: { type: 'string' },
                paused: { type: 'boolean' },
                labels: { type: 'array', items: { type: 'string' } },
                owner: { type: 'object', properties: { name: { type: 'string' } } },
            },
        }
        const html = render(schema, { code: 'nightly-export', paused: false, labels: ['a'], owner: { name: 'ada' } }, (field) => {
            asked.push(field.path.join('.'))
            return field.path[0] === 'labels' ? <span data-own="labels" /> : undefined
        })
        expect(asked).toEqual(expect.arrayContaining(['code', 'paused', 'labels', 'owner', 'owner.name']))
        expect(asked.filter((at) => at === 'code')).toHaveLength(1)
        expect(html).toContain('data-own="labels"')
    })
})

describe('a read-only form or list of records', () => {
    it('locks every field under a read-only root, and under read-only items', () => {
        const root = render({ type: 'object', readOnly: true, properties: { code: { type: 'string' } } }, { code: 'x' })
        for (const input of root.match(/<input[^>]*>/g) ?? []) expect(input).toMatch(/readonly/i)
        const items = render(
            {
                type: 'object',
                properties: {
                    steps: { type: 'array', items: { type: 'object', readOnly: true, properties: { step: { type: 'string' } } } },
                },
            },
            { steps: [{ step: 'fetch' }] },
        )
        const inputs = items.match(/<input[^>]*>/g) ?? []
        expect(inputs.length).toBeGreaterThan(0)
        for (const input of inputs) expect(input).toMatch(/readonly/i)
    })
})

describe('how fields are marked', () => {
    const schema: JsonSchema = {
        type: 'object',
        required: ['job'],
        properties: { job: { type: 'string', title: 'Job' }, retries: { type: 'integer', title: 'Retries', default: 3 } },
    }

    function Look({ requiredMark, fallbacks }: { requiredMark?: 'star' | 'word'; fallbacks?: boolean }) {
        const form = useSchemaForm(schema, { initial: {} })
        return <SchemaForm form={form} marks={false} requiredMark={requiredMark} fallbacks={fallbacks} />
    }

    it('marks a required field by the word outside its label, and its control as required', () => {
        const html = renderToStaticMarkup(<Look requiredMark="word" />)
        expect(html).not.toContain('text-critical-ink')
        expect(html).toMatch(/<\/label><span[^>]*>required<\/span>/)
        expect(html).toMatch(/<input[^>]*aria-required="true"/)
    })

    it("says a field's default under it with fallbacks, and not without", () => {
        expect(renderToStaticMarkup(<Look fallbacks />)).toContain('Default is 3')
        expect(renderToStaticMarkup(<Look />)).not.toContain('Default is 3')
    })
})
