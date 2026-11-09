import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { loadSchemaChecks, SchemaForm, useSchemaForm, type SchemaFormState } from './schema/SchemaForm'
import type { JsonSchema } from './schema/read'
import { SecretField } from './SecretField'

const NOW = new Date('2026-11-09T10:00:00Z')

describe('a secret field', () => {
    it('is a masked input with Show while nothing is set', () => {
        const html = renderToStaticMarkup(<SecretField id="token" label="API token" />)
        expect(html).toMatch(/<input[^>]*type="password"[^>]*id="token"|<input[^>]*id="token"[^>]*type="password"/)
        expect(html).toContain('aria-label="Show"')
        expect(html).not.toContain('>Replace<')
    })

    it('shows a set secret as set, with when, and Replace in place of an input', () => {
        const html = renderToStaticMarkup(
            <SecretField id="token" label="API token" sealed setAt="2026-11-06T10:00:00Z" now={NOW} words={{ replace: 'Change' }} />,
        )
        expect(html).not.toContain('<input')
        expect(html).toContain('3 days ago')
        expect(html).toMatch(/<button[^>]*id="token"[^>]*>Change<\/button>/)
    })

    it('opens for a new secret while replacing, with Cancel to seal it again', () => {
        const replacing = renderToStaticMarkup(<SecretField id="token" label="API token" sealed defaultReplacing />)
        expect(replacing).toContain('type="password"')
        expect(replacing).toContain('>Cancel<')
        // A new secret typed keeps the field open, whatever it started as.
        const typed = renderToStaticMarkup(<SecretField id="token" label="API token" sealed value="tdv_0000" />)
        expect(typed).toContain('value="tdv_0000"')
    })

    it('offers no Replace when read only', () => {
        const html = renderToStaticMarkup(<SecretField id="token" label="API token" sealed readOnly />)
        expect(html).not.toContain('Replace')
    })
})

const CONNECTION: JsonSchema = {
    type: 'object',
    required: ['host', 'token'],
    properties: {
        host: { type: 'string' },
        token: { type: 'string', writeOnly: true },
        signing: { type: 'string', writeOnly: true },
    },
}

describe("a schema form's secrets", () => {
    it('draws a writeOnly property as a secret field, sealed where one is set, out of the value', () => {
        let state: SchemaFormState | undefined
        function Form() {
            const form = useSchemaForm(CONNECTION, {
                initial: { host: 'api.example.org' },
                sealed: [{ path: ['token'], setAt: NOW }],
                now: NOW,
            })
            state = form
            return <SchemaForm form={form} marks={false} />
        }
        const html = renderToStaticMarkup(<Form />)
        expect(html.match(/data-slot="secret-field"/g)).toHaveLength(2)
        expect(html).toContain('>Replace<')
        expect(html.match(/type="password"/g)).toHaveLength(1)
        expect(state?.value).toEqual({ host: 'api.example.org' })
        expect(state?.sealed(['token'])?.setAt).toBe(NOW)
        expect(state?.sealed(['signing'])).toBeUndefined()
    })

    it('asks for nothing more of a required secret that is set', async () => {
        await loadSchemaChecks()
        const count = (sealed: boolean) => {
            let critical = -1
            function Form() {
                const form = useSchemaForm(CONNECTION, {
                    initial: { host: 'api.example.org' },
                    sealed: sealed ? [{ path: ['token'] }] : [],
                    defaultSubmitted: true,
                })
                critical = form.count.critical
                return null
            }
            renderToStaticMarkup(<Form />)
            return critical
        }
        expect(count(false)).toBe(1)
        expect(count(true)).toBe(0)
    })
})
