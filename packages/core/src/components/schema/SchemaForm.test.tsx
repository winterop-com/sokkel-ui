import { useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { readScalar, scalarUnion } from './issues'
import { objectOf, repeatedKeys, rowsOf } from './MapField'
import type { JsonSchema } from './read'
import {
    initialValue,
    loadSchemaChecks,
    SchemaForm,
    useSchemaForm,
    type SchemaFieldRenderer,
    type SchemaFormState,
    type ServerIssue,
} from './SchemaForm'
import { validate } from './validate'

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

    it('says nothing under a field whose default is null', () => {
        function Nulls() {
            const form = useSchemaForm(
                { type: 'object', properties: { note: { type: ['string', 'null'], default: null } } },
                { initial: {} },
            )
            return <SchemaForm form={form} marks={false} fallbacks />
        }
        expect(renderToStaticMarkup(<Nulls />)).not.toContain('Default is')
    })
})

describe('a map of scalars', () => {
    const schema: JsonSchema = {
        type: 'object',
        properties: {
            headers: { type: 'object', title: 'Headers', additionalProperties: { type: 'string' } },
            limits: { type: 'object', title: 'Limits', additionalProperties: { type: 'integer', minimum: 0 } },
            nested: { type: 'object', additionalProperties: { type: 'object', properties: { a: { type: 'string' } } } },
        },
    }

    it('draws a row of a key and a value for each entry, with Remove, not a JSON buffer', () => {
        const html = render(schema, { headers: { 'x-team': 'harbor', accept: 'text/csv' }, limits: { worker: 4 } })
        expect(html).toMatch(/<input[^>]*value="x-team"/)
        expect(html).toMatch(/<input[^>]*value="text\/csv"/)
        expect(html).toContain('aria-label="Remove x-team"')
        expect(html).toContain('>Key</span>')
        // The integer map's value is a number field; only the map of objects is edited as JSON.
        expect(html).toMatch(/<input[^>]*value="4"/)
        expect(html.match(/<textarea/g)).toHaveLength(1)
    })

    it('keeps the first of a repeated key and leaves out a row without a key', () => {
        const rows = [
            { id: 1, key: 'x-team', value: 'harbor' },
            { id: 2, key: '', value: 'lost' },
            { id: 3, key: 'x-team', value: 'juniper' },
            { id: 4, key: 'accept', value: undefined },
        ]
        expect([...repeatedKeys(rows)]).toEqual([3])
        expect(objectOf(rows, '')).toEqual({ 'x-team': 'harbor', accept: '' })
        expect(objectOf(rows)).toEqual({ 'x-team': 'harbor' })
        expect(rowsOf({ a: 1, b: 2 }).map((row) => [row.key, row.value])).toEqual([
            ['a', 1],
            ['b', 2],
        ])
        expect(rowsOf(undefined)).toEqual([])
    })

    it('stops the submit while a field holds its own refusal, such as a key given twice', () => {
        let critical = -1
        function Held() {
            const form = useSchemaForm(schema, { initial: {}, defaultSubmitted: true })
            const once = useRef(false)
            if (!once.current) {
                once.current = true
                form.hold(['headers'], 'Each key only once')
            }
            critical = form.count.critical
            return null
        }
        renderToStaticMarkup(<Held />)
        expect(critical).toBe(1)
    })
})

describe('a choice of scalar types', () => {
    it('is told from other choices', () => {
        expect(scalarUnion({ anyOf: [{ type: 'string' }, { type: 'integer' }] }, {})).toEqual(['string', 'integer'])
        expect(scalarUnion({ type: ['integer', 'boolean', 'null'] }, {})).toEqual(['integer', 'boolean'])
        expect(scalarUnion({ anyOf: [{ type: 'integer' }, { enum: ['none'] }] }, {})).toEqual(['integer', 'string'])
        expect(scalarUnion({ anyOf: [{ type: 'string' }, { type: 'object' }] }, {})).toBeUndefined()
        expect(scalarUnion({ anyOf: [{ type: 'string' }, { type: 'string', pattern: '^a' }] }, {})).toBeUndefined()
        expect(scalarUnion({ type: 'string', anyOf: [{ minLength: 1 }, { maxLength: 0 }] }, {})).toBeUndefined()
    })

    it('reads typed text as the narrowest type it parses as', () => {
        const sizes = ['string', 'integer']
        expect(readScalar('16384', sizes)).toBe(16384)
        expect(readScalar('16KB', sizes)).toBe('16KB')
        expect(readScalar('1.5', sizes)).toBe('1.5')
        expect(readScalar('1.5', ['string', 'number'])).toBe(1.5)
        expect(readScalar('true', ['string', 'boolean'])).toBe(true)
        expect(readScalar('true', sizes)).toBe('true')
        expect(readScalar('  ', sizes)).toBeUndefined()
    })

    it('is one text box, without quotes, and what it reads passes the schema', () => {
        const schema: JsonSchema = {
            type: 'object',
            properties: { buffer: { title: 'Buffer', anyOf: [{ type: 'string', pattern: '^\\d+KB$' }, { type: 'integer' }] } },
        }
        const html = render(schema, { buffer: 16384 })
        expect(html).toMatch(/<input[^>]*value="16384"/)
        expect(html).not.toContain('<textarea')
        expect(validate(schema, { buffer: readScalar('16384', ['string', 'integer']) })).toEqual([])
        expect(validate(schema, { buffer: readScalar('16KB', ['string', 'integer']) })).toEqual([])
    })
})

describe('a field left at its default', () => {
    const schema: JsonSchema = {
        type: 'object',
        required: ['code'],
        properties: {
            code: { type: 'string', default: 'nightly-export' },
            priority: { type: 'string', title: 'Priority', enum: ['low', 'normal', 'high'], default: 'normal' },
            region: { type: 'string', title: 'Region', default: 'europe' },
            retries: { type: 'integer', title: 'Retries', default: 3 },
            paused: { type: 'boolean', title: 'Paused', default: true },
            note: { type: ['string', 'null'], title: 'Note', default: null },
        },
    }

    it('is left out of the value unless it is required', () => {
        expect(initialValue(schema)).toEqual({ code: 'nightly-export' })
    })

    it('shows the default, marked as the default, without holding it', () => {
        const html = render(schema, {})
        expect(html).toContain('normal (default)')
        expect(html).toMatch(/<input[^>]*placeholder="europe \(default\)"/)
        expect(html).toMatch(/<input[^>]*placeholder="3 \(default\)"/)
        expect(html).toMatch(/aria-checked="true"/)
        expect(html).toContain('>default</span>')
        expect(html).not.toContain('null (default)')
    })

    it('shows a value chosen in place of the default as any other', () => {
        const html = render(schema, { priority: 'normal', paused: false })
        expect(html).not.toContain('normal (default)')
        expect(html).not.toContain('>default</span>')
    })
})

describe('a folded form', () => {
    const schema: JsonSchema = {
        type: 'object',
        required: ['code'],
        properties: {
            code: { type: 'string', title: 'Code' },
            name: { type: 'string', title: 'Name' },
            region: { type: 'string', title: 'Region' },
            retries: { type: 'integer', title: 'Retries' },
        },
    }

    function Folded({ initial, issues }: { initial: unknown; issues?: readonly ServerIssue[] }) {
        const form = useSchemaForm(schema, { initial, issues })
        return <SchemaForm form={form} marks={false} fold />
    }

    it('shows the required and set fields and puts the rest behind one disclosure', () => {
        const html = renderToStaticMarkup(<Folded initial={{ name: 'Nightly export' }} />)
        expect(html).toContain('>Code<')
        expect(html).toContain('>Name<')
        expect(html).not.toContain('>Region<')
        expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>2 more fields<\/button>/)
    })

    it('opens by itself while a folded field has an issue to show', () => {
        const html = renderToStaticMarkup(
            <Folded initial={{ code: 'nightly-export' }} issues={[{ path: ['region'], text: 'No such region' }]} />,
        )
        expect(html).toContain('>Region<')
        expect(html).toContain('>Fewer fields<')
    })
})

describe('a form held from outside', () => {
    const schema: JsonSchema = { type: 'object', properties: { code: { type: 'string' }, name: { type: 'string' } } }

    it('draws the value it is given and says each change, keeping none of its own', () => {
        const heard: unknown[] = []
        let state: SchemaFormState | undefined
        function Held() {
            state = useSchemaForm(schema, { value: { code: 'sync-inventory' }, onChange: (value) => heard.push(value) })
            return <SchemaForm form={state} marks={false} />
        }
        expect(renderToStaticMarkup(<Held />)).toMatch(/<input[^>]*value="sync-inventory"/)
        state?.set(['name'], 'Sync inventory')
        state?.set(['code'], 'sync-orders')
        expect(heard).toEqual([
            { code: 'sync-inventory', name: 'Sync inventory' },
            { code: 'sync-orders', name: 'Sync inventory' },
        ])
        expect(state?.value).toEqual({ code: 'sync-inventory' })
    })
})

describe('a quiet block', () => {
    const schema: JsonSchema = { type: 'object', required: ['code'], properties: { code: { type: 'string' } } }

    it('says whether the value would be refused before any issue is shown', async () => {
        await loadSchemaChecks()
        const read = (initial: unknown) => {
            let state: SchemaFormState | undefined
            function Quiet() {
                state = useSchemaForm(schema, { initial })
                return null
            }
            renderToStaticMarkup(<Quiet />)
            return { blocking: state?.blocking, shown: state?.count.critical }
        }
        expect(read({})).toEqual({ blocking: true, shown: 0 })
        expect(read({ code: 'send-digest' })).toEqual({ blocking: false, shown: 0 })
    })
})

describe("an app's own field in parts", () => {
    it('sets its note beside the label, its row under the control, and the mark on the control', async () => {
        await loadSchemaChecks()
        function Parts() {
            const form = useSchemaForm(
                { type: 'object', required: ['query'], properties: { query: { type: 'string', title: 'Query' } } },
                { initial: {}, defaultSubmitted: true },
            )
            return (
                <SchemaForm
                    form={form}
                    marks={false}
                    field={(field) => ({
                        control: <input id={field.id} data-own="" />,
                        below: <p data-below="">Runs on the worker</p>,
                        note: <span data-note="">SQL</span>,
                    })}
                />
            )
        }
        const html = renderToStaticMarkup(<Parts />)
        expect(html).toMatch(/<\/label><span data-note="">SQL<\/span>/)
        expect(html).toMatch(/<div class="relative min-w-0"><input[^>]*data-own=""\/><button[^>]*aria-label="Error: Enter a value"/)
        expect(html).toMatch(/<\/div><p data-below="">/)
    })
})

describe("a schema form's secret words", () => {
    it('reach the secret field', () => {
        function Words() {
            const form = useSchemaForm(
                { type: 'object', properties: { token: { type: 'string', title: 'API token', writeOnly: true } } },
                { initial: {}, sealed: [{ path: ['token'] }], words: { secret: { set: 'Kept', replace: 'Change' } } },
            )
            return <SchemaForm form={form} marks={false} />
        }
        const html = renderToStaticMarkup(<Words />)
        expect(html).toContain('>Kept<')
        expect(html).toContain('>Change<')
    })
})
