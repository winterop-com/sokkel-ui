import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { termScore } from '../lib/commands'
import type { PaletteCommand } from './CommandPalette'
import { CronField } from './CronField'
import { DateTimeField } from './DateTimeField'
import { SearchResultBody } from './Search'
import { SecretField } from './SecretField'
import { TextField } from './TextField'

describe('TextField', () => {
    it('grows a text area up to maxRows lines, then scrolls', () => {
        const html = renderToStaticMarkup(<TextField id="notes" label="Notes" multiline rows={2} maxRows={6} defaultValue="" />)
        expect(html).toContain('max-height:calc(6lh + 1rem + 2px)')
        expect(html).toContain('min-height:calc(2lh + 1rem + 2px)')
        expect(html).toContain('overflow-y-auto')
        const most = renderToStaticMarkup(<TextField id="notes" label="Notes" multiline rows={9} maxRows={3} />)
        expect(most).toContain('min-height:calc(3lh + 1rem + 2px)')
        expect(renderToStaticMarkup(<TextField id="notes" label="Notes" multiline />)).not.toContain('max-height')
    })

    it('sets the label in the code face with monoLabel, and only the value with mono', () => {
        const key = renderToStaticMarkup(<TextField id="bucket" label="EXPORT_BUCKET" monoLabel />)
        expect(key).toMatch(/<label[^>]*class="[^"]*font-mono/)
        const value = renderToStaticMarkup(<TextField id="bucket" label="Bucket" mono />)
        expect(value).not.toMatch(/<label[^>]*class="[^"]*font-mono/)
        expect(value).toMatch(/<input[^>]*class="[^"]*font-mono/)
    })
})

describe('DateTimeField', () => {
    it('sets its value in the code face with mono', () => {
        const html = renderToStaticMarkup(<DateTimeField id="at" label="Started at" mono defaultValue="2026-11-09T02:00" />)
        expect(html).toMatch(/<input[^>]*class="[^"]*font-mono/)
        expect(renderToStaticMarkup(<DateTimeField id="at" label="Started at" />)).not.toContain('font-mono')
    })
})

describe('SecretField', () => {
    it('marks required with the word after the label', () => {
        const html = renderToStaticMarkup(
            <SecretField id="token" label="API token" required requiredMark="word" words={{ required: 'påkrevd' }} />,
        )
        expect(html).toContain('påkrevd')
        expect(html).not.toContain('>*<')
    })
})

describe('CronField', () => {
    it('says nothing of a required empty field before it is left', () => {
        const html = renderToStaticMarkup(<CronField value="" onChange={() => undefined} from={new Date(0)} required />)
        expect(html).not.toContain('Enter a schedule')
        expect(html).not.toContain('aria-invalid="true"')
    })
})

describe('palette rows', () => {
    const base: PaletteCommand = { id: '4812', label: 'Run 4812', onSelect: () => undefined }

    it('finds a row by a text second line, and by keywords alone when the line is a node', () => {
        expect(termScore({ ...base, detail: 'Failed at upload' }, 'upload')).toBeGreaterThan(0)
        expect(termScore({ ...base, detail: <b>Failed at upload</b> }, 'upload')).toBe(0)
        expect(termScore({ ...base, detail: <b>Failed</b>, keywords: ['failed'] }, 'failed')).toBeGreaterThan(0)
    })

    it('draws a node as the second line, in a status ink with a tone', () => {
        const html = renderToStaticMarkup(
            <SearchResultBody result={{ id: '4812', title: 'Run 4812' }} query="" second={<b>Failed</b>} detailTone="critical" />,
        )
        expect(html).toContain('<b>Failed</b>')
        expect(html).toContain('text-critical-ink')
    })
})
