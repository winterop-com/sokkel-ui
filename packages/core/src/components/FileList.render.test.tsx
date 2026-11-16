import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FileList, FileTile, type FileEntry } from './FileList'

const ENTRIES: FileEntry[] = [
    { id: 'a', name: 'orders-9.csv', kind: 'table', size: 18_000, modified: 'Nov 4', owner: 'ada' },
    { id: 'b', name: 'orders-10.csv', kind: 'table', size: 2400, modified: 'Nov 2', owner: 'grace' },
]

describe('a file listing’s table', () => {
    it('says the table’s own words in the words given, as how many are selected', () => {
        const html = renderToStaticMarkup(
            <FileList
                entries={ENTRIES}
                selected={['a']}
                onSelectedChange={() => undefined}
                tableWords={{ selected: (count) => `${String(count)} picked`, clear: 'Unpick' }}
            />,
        )
        expect(html).toContain('1 picked')
        expect(html).toContain('Unpick')
        expect(html).not.toContain('1 selected')
    })

    it('says a failed read in place of the rows, with a way to try again', () => {
        const html = renderToStaticMarkup(
            <FileList entries={[]} error="The folder did not load" onRetry={() => undefined} words={{ empty: 'Nothing here' }} />,
        )
        expect(html).toContain('The folder did not load')
        expect(html).toContain('Try again')
        expect(html).not.toContain('Nothing here')
    })

    it('draws placeholder rows while the entries load', () => {
        expect(renderToStaticMarkup(<FileList entries={[]} loading />)).toContain('data-slot="skeleton"')
    })
})

describe('a file tile', () => {
    it('names its checkbox in the words given, the file’s name where they put it', () => {
        const html = renderToStaticMarkup(
            <FileTile entry={ENTRIES[0]} onSelectedChange={() => undefined} words={{ selectEntry: (name) => `${name}, choose` }} />,
        )
        expect(html).toContain('aria-label="orders-9.csv, choose"')
    })
})
