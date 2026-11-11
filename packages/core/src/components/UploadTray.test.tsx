import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { CheckedRefusal } from '../lib/uploads'
import { FileField } from './FileField'
import { DropZone, type DropZoneProps } from './UploadTray'

const dropped = vi.hoisted(() => ({ take: (_files: File[]) => undefined as void }))

vi.mock('../hooks/use-file-drop', () => ({
    useFileDrop: (onFiles: (files: File[]) => void) => {
        dropped.take = onFiles
        return { over: false, handlers: {} }
    },
}))

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type })
const ORDERS = file('orders.csv', 'text/csv')
const NOTES = file('notes.yaml', 'application/x-yaml')
const PICTURE = file('harbor.png', 'image/png')
const LARGE = file('archive.csv', 'text/csv', 2_000)

/** Drops the files on a zone of these props and says what its `onFiles` heard. */
function drop(files: File[], props: Partial<DropZoneProps> = {}) {
    const heard: { taken: File[]; refused: CheckedRefusal[] }[] = []
    renderToStaticMarkup(
        <DropZone onFiles={(taken, refused) => heard.push({ taken, refused })} {...props}>
            page
        </DropZone>,
    )
    dropped.take(files)
    return heard
}

describe('DropZone', () => {
    it('hands every file over, none refused, without limits', () => {
        expect(drop([ORDERS, PICTURE])).toEqual([{ taken: [ORDERS, PICTURE], refused: [] }])
    })

    it('sorts a drop by type, size and count, as a FileField of the same limits does', () => {
        const [heard] = drop([ORDERS, PICTURE, LARGE, NOTES], { accept: '.csv,.yaml', maxSize: 1_000, maxFiles: 2, held: 1 })
        expect(heard.taken).toEqual([ORDERS])
        expect(heard.refused).toEqual([
            { file: PICTURE, reason: 'type' },
            { file: LARGE, reason: 'size' },
            { file: NOTES, reason: 'count' },
        ])
    })
})

describe('FileField refused from outside', () => {
    const field = (refused: readonly CheckedRefusal[], defaultRefused?: readonly CheckedRefusal[]) =>
        renderToStaticMarkup(
            <FileField
                id="orders"
                label="Orders"
                accept=".csv,.yaml"
                maxSize={1_000}
                value={[ORDERS]}
                onChange={() => undefined}
                refused={refused}
                defaultRefused={defaultRefused}
            />,
        )

    it('says each refused file handed to it with why, by its own limits', () => {
        const html = field([
            { file: PICTURE, reason: 'type' },
            { file: LARGE, reason: 'size' },
        ])
        expect(html).toContain('harbor.png')
        expect(html).toContain('wrong type: CSV or YAML only')
        expect(html).toContain('archive.csv')
        expect(html).toContain('too large: 2.0 KB, at most 1.0 KB')
    })

    it('holds the refused from outside over its own', () => {
        const html = field([], [{ file: PICTURE, reason: 'type' }])
        expect(html).not.toContain('harbor.png')
    })
})
