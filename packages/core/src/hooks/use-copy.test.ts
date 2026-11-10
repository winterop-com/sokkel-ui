import { afterEach, describe, expect, it, vi } from 'vitest'

import { writeClipboard } from './use-copy'

describe('writeClipboard', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('resolves true when the write lands', async () => {
        const writeText = vi.fn(() => Promise.resolve())
        vi.stubGlobal('navigator', { clipboard: { writeText } })
        await expect(writeClipboard('nightly-export')).resolves.toBe(true)
        expect(writeText).toHaveBeenCalledWith('nightly-export')
    })

    it('resolves false on a page with no clipboard', async () => {
        vi.stubGlobal('navigator', {})
        await expect(writeClipboard('nightly-export')).resolves.toBe(false)
    })

    it('resolves false when the write is refused', async () => {
        vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('denied')) } })
        await expect(writeClipboard('nightly-export')).resolves.toBe(false)
    })

    it('resolves false when the write throws', async () => {
        vi.stubGlobal('navigator', {
            clipboard: {
                writeText: () => {
                    throw new TypeError('no clipboard')
                },
            },
        })
        await expect(writeClipboard('nightly-export')).resolves.toBe(false)
    })
})
