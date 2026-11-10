import { describe, expect, it } from 'vitest'

import { shellParts } from './DialogShell'

const confirm = { label: 'Save', onConfirm: () => undefined }

describe('shellParts', () => {
    it('draws Cancel beside a confirm, and no corner close', () => {
        expect(shellParts({ confirm })).toEqual({ close: false, footer: true, cancel: true })
    })

    it('draws a footer of verbs without a confirm, closing from the corner with no Cancel', () => {
        expect(shellParts({ actions: 'Copy' })).toEqual({ close: true, footer: true, cancel: false })
    })

    it('draws a footer for a note alone', () => {
        expect(shellParts({ footer: '12 lines' })).toEqual({ close: true, footer: true, cancel: false })
    })

    it('draws no footer with nothing to put in it', () => {
        expect(shellParts({})).toEqual({ close: true, footer: false, cancel: false })
    })

    it('draws neither Cancel nor the close when the dialog cannot be dismissed', () => {
        expect(shellParts({ confirm, dismissible: false })).toEqual({ close: false, footer: true, cancel: false })
        expect(shellParts({ actions: 'Copy', dismissible: false })).toEqual({ close: false, footer: true, cancel: false })
    })
})
