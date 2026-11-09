import { describe, expect, it } from 'vitest'

import { withoutDeferred } from './issues'

/** A value holding a live reference: `${...}` not escaped as `$${...}`. */
const live = (value: unknown) => typeof value === 'string' && /(^|[^$])\$\{/.test(value)

const issues = [
    { path: ['retries'], text: 'Expected an integer' },
    { path: ['config', 'rows', 0], text: 'Expected a number' },
    { path: ['code'], text: 'Must match ^[a-z]' },
]

describe('values left unchecked', () => {
    it('drops the issues about a deferred value and anything inside it, and keeps the rest', () => {
        const document = { retries: '${steps.fetch.retries}', config: { rows: '${steps.fetch.rows}' }, code: 'Nightly' }
        expect(withoutDeferred(issues, document, live).map((issue) => issue.text)).toEqual(['Must match ^[a-z]'])
    })

    it('checks an escaped reference as written', () => {
        expect(withoutDeferred(issues, { retries: '$${not}' }, live).map((issue) => issue.path[0])).toContain('retries')
    })

    it('keeps every issue when nothing is deferred', () => {
        expect(withoutDeferred(issues, {}, undefined)).toHaveLength(3)
    })
})
