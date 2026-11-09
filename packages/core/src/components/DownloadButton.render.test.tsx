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

    it('says the share of a download by its bytes, and offers pause and resume when given', () => {
        const running = renderToStaticMarkup(<DownloadButton state="running" value={0.62} onPause={() => undefined} />)
        expect(running).toContain('62%')
        expect(running).toContain('aria-label="Pause the download"')
        const paused = renderToStaticMarkup(
            <DownloadButton state="paused" value={0.62} onResume={() => undefined} onCancel={() => undefined} />,
        )
        expect(paused).toContain('Paused')
        expect(paused).toContain('aria-label="Resume the download"')
        expect(paused).toContain('aria-label="Cancel the download"')
        expect(paused).not.toContain('Pause the download')
    })

    it('says its share as Progress says it, never certain before the end', () => {
        expect(renderToStaticMarkup(<DownloadButton state="running" value={0.996} />)).toContain('&gt;99%')
        expect(renderToStaticMarkup(<DownloadButton state="running" value={0.125} />)).toContain('13%')
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
