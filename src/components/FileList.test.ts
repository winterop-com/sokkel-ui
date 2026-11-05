import { describe, expect, it } from 'vitest'

import { formatSize, sortFiles, type FileEntry } from './FileList'
import { parseCsv } from './FilePreview'

const ENTRIES: FileEntry[] = [
    { id: 'b', name: 'orders-10.csv', kind: 'table', size: 2400, modified: 'Nov 2', modifiedAt: '2026-11-02', owner: 'grace' },
    { id: 'a', name: 'orders-9.csv', kind: 'table', size: 18_000, modified: 'Nov 4', modifiedAt: '2026-11-04', owner: 'ada' },
    { id: 'f', name: 'archive', kind: 'folder', modified: 'Oct 1', modifiedAt: '2026-10-01' },
]

describe('sortFiles', () => {
    it('keeps folders first and sorts names by their numbers', () => {
        expect(sortFiles(ENTRIES, { key: 'name', direction: 'asc' }).map((entry) => entry.id)).toEqual(['f', 'a', 'b'])
    })

    it('keeps folders first when the order is reversed', () => {
        expect(sortFiles(ENTRIES, { key: 'size', direction: 'desc' }).map((entry) => entry.id)).toEqual(['f', 'a', 'b'])
        expect(sortFiles(ENTRIES, { key: 'modified', direction: 'asc' }).map((entry) => entry.id)).toEqual(['f', 'b', 'a'])
    })
})

describe('formatSize', () => {
    it('picks the largest unit that keeps the value at one or more', () => {
        expect(formatSize(812)).toBe('812 B')
        expect(formatSize(14_200)).toBe('14 KB')
        expect(formatSize(3_140_000)).toBe('3.1 MB')
    })
})

describe('parseCsv', () => {
    it('splits on commas and keeps quoted commas and quotes', () => {
        expect(parseCsv('a,b\n"x, y","say ""hi"""\r\n1,2')).toEqual([
            ['a', 'b'],
            ['x, y', 'say "hi"'],
            ['1', '2'],
        ])
    })
})
