import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AddressInput } from './AddressInput'
import { CronField } from './CronField'
import { DateField } from './DateField'
import { DateTimeField } from './DateTimeField'
import { FileField } from './FileField'
import { InlineEdit } from './InlineEdit'
import { IssueMark, spoken } from './IssueMark'
import { NumberField } from './NumberField'
import { QuickAdd } from './QuickAdd'
import { RepeatedGroup } from './RepeatedGroup'
import { loadSchemaChecks, SchemaForm, useSchemaForm } from './schema/SchemaForm'
import { SecretField } from './SecretField'
import { SelectField } from './SelectField'
import { TextField } from './TextField'
import { TimeField } from './TimeField'
import { YesNoField } from './YesNoField'

const WORD = 'påkrevd'
const noop = () => undefined

const FIELDS: [string, ReactElement][] = [
    ['TextField', <TextField id="f" label="Name" required words={{ required: WORD }} />],
    ['SelectField', <SelectField id="f" label="Service" options={[{ value: 'api', label: 'API' }]} required words={{ required: WORD }} />],
    ['NumberField', <NumberField id="f" label="Retries" required words={{ required: WORD }} />],
    ['DateField', <DateField id="f" label="Start" today="2026-11-09" required words={{ required: WORD }} />],
    ['TimeField', <TimeField id="f" label="At" required words={{ required: WORD }} />],
    ['DateTimeField', <DateTimeField id="f" label="Next run" today="2026-11-09" required words={{ required: WORD }} />],
    ['SecretField', <SecretField id="f" label="Token" required words={{ required: WORD }} />],
    ['FileField', <FileField id="f" label="Orders" value={[]} onChange={noop} required words={{ required: WORD }} />],
    ['YesNoField', <YesNoField id="f" label="Notify" value={null} onValueChange={noop} required words={{ required: WORD }} />],
]

describe('a required field', () => {
    it.each(FIELDS)('%s says required in the words it is given', (_name, field) => {
        const html = renderToStaticMarkup(field)
        expect(html).toContain(`<span class="sr-only">${WORD}</span>`)
        expect(html).not.toContain('>required<')
    })

    it('says required in English by default', () => {
        const html = renderToStaticMarkup(<TextField id="f" label="Name" required />)
        expect(html).toContain('<span class="sr-only">required</span>')
    })
})

const ISSUE = { issueCritical: 'Feil: ', issueWarning: 'Advarsel: ' }
const refuse = async () => undefined

const MARKED: [string, ReactElement][] = [
    ['TextField', <TextField id="f" label="Name" error="Too long" words={ISSUE} />],
    ['SelectField', <SelectField id="f" label="Service" options={[{ value: 'api', label: 'API' }]} error="Too long" words={ISSUE} />],
    ['NumberField', <NumberField id="f" label="Retries" error="Too long" words={ISSUE} />],
    ['DateField', <DateField id="f" label="Start" today="2026-11-09" error="Too long" words={ISSUE} />],
    ['TimeField', <TimeField id="f" label="At" error="Too long" words={ISSUE} />],
    ['DateTimeField', <DateTimeField id="f" label="Next run" today="2026-11-09" error="Too long" words={ISSUE} />],
    ['SecretField', <SecretField id="f" label="Token" error="Too long" words={ISSUE} />],
    ['FileField', <FileField id="f" label="Orders" value={[]} onChange={noop} error="Too long" words={ISSUE} />],
    ['YesNoField', <YesNoField id="f" label="Notify" value={null} onValueChange={noop} error="Too long" words={ISSUE} />],
    [
        'CronField',
        <CronField value="0 5 31 2 *" onChange={noop} from={new Date('2026-11-09T00:00:00Z')} invalid="Too long" words={ISSUE} />,
    ],
    [
        'RepeatedGroup',
        <RepeatedGroup label="Steps" rows={[]} error="Too long" words={ISSUE}>
            {() => null}
        </RepeatedGroup>,
    ],
    ['AddressInput', <AddressInput value={[]} onChange={noop} issues={[{ tone: 'critical', text: 'Too long' }]} words={ISSUE} />],
    ['QuickAdd', <QuickAdd defaultValue="x" defaultState={{ error: 'Too long' }} onAdd={refuse} words={ISSUE} />],
    ['InlineEdit', <InlineEdit label="Name" value="x" defaultEditing={{ draft: 'y', error: 'Too long' }} onSave={refuse} words={ISSUE} />],
]

describe('a field with an issue', () => {
    it.each(MARKED)('%s says the issue after the words it is given', (_name, field) => {
        const html = renderToStaticMarkup(field)
        expect(html).toContain('aria-label="Feil: Too long"')
        expect(html).not.toContain('Error: ')
    })

    it('says an error and a warning in English by default', () => {
        const html = renderToStaticMarkup(
            <TextField id="f" label="Name" error="Too long" issues={[{ tone: 'warning', text: 'Unusual name', detail: 'Check it' }]} />,
        )
        expect(html).toContain('aria-label="Error: Too long Warning: Unusual name. Check it"')
    })

    it('says a warning after the warning word it is given', () => {
        const html = renderToStaticMarkup(
            <TextField id="f" label="Name" issues={[{ tone: 'warning', text: 'Unusual name' }]} words={ISSUE} />,
        )
        expect(html).toContain('aria-label="Advarsel: Unusual name"')
    })

    it('takes the words in spoken and in the mark alone', () => {
        expect(spoken([{ tone: 'critical', text: 'Too long' }], ISSUE)).toBe('Feil: Too long')
        const mark = renderToStaticMarkup(
            <IssueMark issues={[{ tone: 'warning', text: 'Unusual name' }]} words={{ issueWarning: 'Advarsel: ' }} />,
        )
        expect(mark).toContain('aria-label="Advarsel: Unusual name"')
    })

    it('reaches every mark a schema form draws', async () => {
        await loadSchemaChecks()
        function Form() {
            const form = useSchemaForm(
                { type: 'object', required: ['query'], properties: { query: { type: 'string', title: 'Query' } } },
                { initial: {}, defaultSubmitted: true, words: ISSUE },
            )
            return <SchemaForm form={form} marks={false} />
        }
        const html = renderToStaticMarkup(<Form />)
        expect(html).toContain('aria-label="Feil: ')
        expect(html).not.toContain('Error: ')
    })
})
