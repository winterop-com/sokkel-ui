import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FILE_FIELD_WORDS, FileField, checkFiles, limitsText, refusalText, typeNames } from './FileField'

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type })

describe('typeNames', () => {
    it('names extensions and subtypes in capitals, and families in words, each once', () => {
        expect(typeNames('.csv, text/csv, .yaml, image/*')).toEqual(['CSV', 'YAML', 'image files'])
        expect(typeNames(['application/pdf', 'application/x-yaml'])).toEqual(['PDF', 'YAML'])
        expect(typeNames(undefined)).toEqual([])
    })
})

describe('refusalText', () => {
    const limits = { types: 'CSV or YAML', maxSize: 10_000_000, maxFiles: 5 }

    it('says a file too large with its size and the limit', () => {
        expect(refusalText('size', { size: 12_000_000 }, limits)).toBe('too large: 12 MB, at most 10 MB')
    })

    it('says a file of the wrong type with the types taken', () => {
        expect(refusalText('type', { size: 1 }, limits)).toBe('wrong type: CSV or YAML only')
    })

    it('says a file past the count with the limit', () => {
        expect(refusalText('count', { size: 1 }, limits)).toBe('too many: at most 5 files')
        expect(refusalText('count', { size: 1 }, { maxFiles: 1 })).toBe('too many: at most 1 file')
    })

    it('takes its words from the app', () => {
        expect(
            refusalText('size', { size: 2_000 }, { maxSize: 1_000 }, { ...FILE_FIELD_WORDS, size: (size, limit) => `${size} > ${limit}` }),
        ).toBe('2.0 KB > 1.0 KB')
    })
})

describe('limitsText', () => {
    it('says the types, the size and the count in one line', () => {
        expect(limitsText({ types: 'CSV or YAML', maxSize: 10_000_000, maxFiles: 5 })).toBe(
            'CSV or YAML · up to 10 MB each · at most 5 files',
        )
    })

    it('says a single file’s size without "each", starting with a capital', () => {
        expect(limitsText({ maxSize: 2_000_000, maxFiles: 1 })).toBe('Up to 2.0 MB · one file')
        expect(limitsText({ types: 'image files' })).toBe('Image files')
    })

    it('says nothing without limits', () => {
        expect(limitsText({})).toBe('')
    })
})

describe('FileField', () => {
    it('lists the files held with their sizes, and says the limits', () => {
        const html = renderToStaticMarkup(
            <FileField
                id="orders"
                label="Orders"
                value={[file('orders-2026-10.csv', 'text/csv', 2_100)]}
                onChange={() => undefined}
                accept=".csv,.yaml"
                maxSize={5_000}
                maxFiles={3}
            />,
        )
        expect(html).toContain('orders-2026-10.csv')
        expect(html).toContain('2.1 KB')
        expect(html).toContain('CSV or YAML · up to 5.0 KB each · at most 3 files')
        expect(html).toContain('Choose files')
    })

    it('says the files refused with why', () => {
        const refused = checkFiles([file('installer.exe', ''), file('inventory-full.csv', 'text/csv', 9_000)], {
            accept: '.csv',
            maxSize: 5_000,
        }).refused
        const html = renderToStaticMarkup(
            <FileField
                id="refused"
                label="Orders"
                value={[]}
                onChange={() => undefined}
                accept=".csv"
                maxSize={5_000}
                defaultRefused={refused}
            />,
        )
        expect(html).toContain('wrong type: CSV only')
        expect(html).toContain('too large: 9.0 KB, at most 5.0 KB')
    })

    it('draws a file still going up with its share', () => {
        const going = file('orders.csv', 'text/csv')
        const html = renderToStaticMarkup(
            <FileField id="going" label="Orders" value={[going]} onChange={() => undefined} progress={() => 0.42} />,
        )
        expect(html).toContain('42%')
    })

    it('asks for one file when it takes one', () => {
        const html = renderToStaticMarkup(<FileField id="one" label="Picture" value={[]} onChange={() => undefined} maxFiles={1} />)
        expect(html).toContain('Choose a file')
        expect(html).not.toContain('multiple')
    })
})
