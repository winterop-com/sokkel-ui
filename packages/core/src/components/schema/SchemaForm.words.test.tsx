import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import type { JsonSchema } from './read'
import { loadSchemaChecks, SchemaForm, SchemaIssueCount, useSchemaForm, type SchemaFormWords } from './SchemaForm'

// The strip draws nothing without a scroll area, so it says here what it was given.
vi.mock('../IssueMarks', () => ({
    IssueMarks: ({ label }: { label?: string }) => <i data-marks={label} />,
}))

const schema: JsonSchema = {
    type: 'object',
    required: ['code', 'owner'],
    properties: { code: { type: 'string' }, owner: { type: 'string' } },
}

function Form({ words, count }: { words?: Partial<SchemaFormWords>; count?: boolean }) {
    const form = useSchemaForm(schema, { initial: {}, words, defaultSubmitted: true })
    return (
        <>
            <SchemaForm form={form} />
            {count === true && <SchemaIssueCount form={form} />}
        </>
    )
}

beforeAll(async () => {
    await loadSchemaChecks()
})

describe('the words around a schema form', () => {
    it('names the strip of issue marks in the words given', () => {
        expect(renderToStaticMarkup(<Form />)).toContain('data-marks="Issues in this form"')
        expect(renderToStaticMarkup(<Form words={{ marks: 'Feil i skjemaet' }} />)).toContain('data-marks="Feil i skjemaet"')
    })

    it('counts the issues in the words given', () => {
        const html = renderToStaticMarkup(<Form count words={{ count: { errors: (count) => `${String(count)} feil` } }} />)
        expect(html).toContain('2 feil')
        expect(html).not.toContain('2 errors')
    })
})
