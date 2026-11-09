import { yaml } from '@codemirror/lang-yaml'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import type { JsonSchema } from '../schema/read'
import { validate } from '../schema/validate'
import { schemaDiagnostics } from './schema'

const SCHEMA: JsonSchema = {
    type: 'object',
    properties: {
        steps: {
            type: 'array',
            items: {
                type: 'object',
                properties: { name: { enum: ['fetch', 'transform', 'upload'] }, retries: { type: 'integer' } },
            },
        },
    },
}

const deferred = (value: unknown) => typeof value === 'string' && value.includes('${')

describe('a schema check that leaves deferred values alone', () => {
    it('takes a reference where an integer goes, and still marks what is wrong', () => {
        const doc = ['steps:', '  - name: fetch', '    retries: ${steps.prepare.retries}', '  - name: compress', ''].join('\n')
        const state = EditorState.create({ doc, extensions: [yaml()] })
        const marked = schemaDiagnostics(state, 'yaml', SCHEMA, validate, undefined, deferred).map((each) => doc.slice(each.from, each.to))
        expect(marked).not.toContain('${steps.prepare.retries}')
        expect(marked).toContain('compress')
        const unguarded = schemaDiagnostics(state, 'yaml', SCHEMA, validate).map((each) => doc.slice(each.from, each.to))
        expect(unguarded).toContain('${steps.prepare.retries}')
    })
})
