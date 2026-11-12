import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FilePreview, parseCsv } from './FilePreview'

describe('FilePreview', () => {
    it('stops reading a CSV at the rows it shows', () => {
        expect(parseCsv('a\n1\n2\n3\n4\n', 3)).toEqual([['a'], ['1'], ['2']])
    })

    it('says a table goes on without counting the rest', () => {
        const text = ['job', ...Array.from({ length: 50 }, (_, at) => `run-${String(at)}`)].join('\n')
        const html = renderToStaticMarkup(<FilePreview name="runs.csv" kind="table" text={text} maxRows={3} />)
        expect(html).toContain('First 3 rows')
        expect(html).not.toContain('run-3<')
    })

    it('counts a table that ends within its rows', () => {
        const html = renderToStaticMarkup(<FilePreview name="runs.csv" kind="table" text={'job\nfetch\nupload\n'} />)
        expect(html).toContain('2 rows')
    })

    it('reads only the start of a file past its length, and says so', () => {
        const html = renderToStaticMarkup(
            <FilePreview name="out.json" kind="json" text={'{"a": "' + 'x'.repeat(50) + '"}'} maxLength={10} />,
        )
        expect(html).toContain('Only the start of this file is shown.')
        expect(html).not.toContain('does not parse')
    })

    it('caps a text body at 28rem, or fills its container', () => {
        expect(renderToStaticMarkup(<FilePreview name="a.txt" kind="text" text="hello" />)).toContain('max-h-[28rem]')
        const filled = renderToStaticMarkup(<FilePreview name="a.txt" kind="text" text="hello" fill />)
        expect(filled).toContain('flex-1')
        expect(filled).not.toContain('max-h-[28rem]')
    })
})
