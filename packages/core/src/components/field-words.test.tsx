import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DateField } from './DateField'
import { DateTimeField } from './DateTimeField'
import { FileField } from './FileField'
import { NumberField } from './NumberField'
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
