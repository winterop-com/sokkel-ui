import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DownloadButton } from './DownloadButton'

describe('DownloadButton', () => {
    it('says what is kept on hover, and arms a removal before removing', () => {
        const kept = renderToStaticMarkup(<DownloadButton state="kept" keptDetail="On this device, 48.2 MB" onRemove={() => undefined} />)
        expect(kept).toContain('title="On this device, 48.2 MB"')
        expect(kept).toContain('aria-label="Kept on this device. Remove it"')
        const armed = renderToStaticMarkup(<DownloadButton state="kept" onRemove={() => undefined} defaultArmed />)
        expect(armed).toContain('Remove?')
        expect(armed).toContain('aria-label="Press again to remove this download"')
    })

    it('says why the last try failed on hover', () => {
        expect(renderToStaticMarkup(<DownloadButton state="idle" error="The server stopped answering." />)).toContain(
            'title="The server stopped answering."',
        )
    })

    it('keeps the word for a screen reader when compact', () => {
        expect(renderToStaticMarkup(<DownloadButton state="idle" compact />)).toContain('class="sr-only">Download')
        expect(renderToStaticMarkup(<DownloadButton state="idle" compact="narrow" />)).toContain('max-sm:sr-only')
    })
})
