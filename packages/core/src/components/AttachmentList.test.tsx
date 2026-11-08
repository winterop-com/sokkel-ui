import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AttachmentList, type AttachmentFile } from './AttachmentList'

const FILES: AttachmentFile[] = [
    { id: 'orders', name: 'orders.csv' },
    { id: 'config', name: 'nightly-export.yaml', uploading: true },
]

describe('AttachmentList buttons', () => {
    it('puts no remove button on a file still uploading', () => {
        const html = renderToStaticMarkup(<AttachmentList files={FILES} onRemove={() => undefined} />)
        expect(html).toContain('Remove orders.csv')
        expect(html).not.toContain('Remove nightly-export.yaml')
        expect(html).not.toContain('Cancel upload')
    })

    it('gives a file still uploading a cancel button with onCancel', () => {
        const html = renderToStaticMarkup(<AttachmentList files={FILES} onRemove={() => undefined} onCancel={() => undefined} />)
        expect(html).toContain('Cancel upload nightly-export.yaml')
        expect(html).not.toContain('Remove nightly-export.yaml')
    })
})
