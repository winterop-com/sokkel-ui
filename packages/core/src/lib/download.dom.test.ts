// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { download, fileName } from './download'

describe('download', () => {
    afterEach(() => vi.restoreAllMocks())

    it('hands text over as a file under its name, through a link it takes away again', () => {
        const clicked: { href: string; name: string }[] = []
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            clicked.push({ href: this.href, name: this.download })
        })
        const made = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:made')
        download('nightly-export.csv', 'job,state\nnightly-export,failed', 'text/csv;charset=utf-8')
        expect(clicked).toEqual([{ href: 'blob:made', name: 'nightly-export.csv' }])
        expect((made.mock.calls[0]![0] as Blob).type).toBe('text/csv;charset=utf-8')
        expect(document.querySelector('a')).toBeNull()
    })

    it('hands over a file already at an address without making one', () => {
        const clicked: string[] = []
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            clicked.push(this.href)
        })
        const made = vi.spyOn(URL, 'createObjectURL')
        download('runs.png', { href: 'data:image/png;base64,AAAA' })
        expect(clicked).toEqual(['data:image/png;base64,AAAA'])
        expect(made).not.toHaveBeenCalled()
    })
})

describe('fileName', () => {
    it('names a file from a title, and falls back on one with no letters', () => {
        expect(fileName('Runs by state, this week', 'csv')).toBe('runs-by-state-this-week.csv')
        expect(fileName('  --  ', '.png', 'chart')).toBe('chart.png')
    })
})
