import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { UpNext } from './UpNext'

const play = () => undefined

describe('UpNext', () => {
    it('says what plays next, with Play now', () => {
        const html = renderToStaticMarkup(<UpNext title="The long quay" subtitle="Harbor, episode 2" onPlay={play} />)
        expect(html).toContain('aria-label="Up next"')
        expect(html).toContain('The long quay')
        expect(html).toContain('Harbor, episode 2')
        expect(html).toContain('Play now')
    })

    it('counts down from whole seconds, rounding up, and waits without a countdown', () => {
        expect(renderToStaticMarkup(<UpNext title="The long quay" countdown={8} onPlay={play} />)).toContain('Playing in 8 s')
        expect(renderToStaticMarkup(<UpNext title="The long quay" countdown={4.2} onPlay={play} />)).toContain('Playing in 5 s')
        for (const countdown of [undefined, 0, -3]) {
            expect(renderToStaticMarkup(<UpNext title="The long quay" countdown={countdown} onPlay={play} />)).not.toContain('Playing in')
        }
    })

    it('offers Cancel only when the app hears it', () => {
        expect(renderToStaticMarkup(<UpNext title="The long quay" onPlay={play} />)).not.toContain('Cancel')
        expect(renderToStaticMarkup(<UpNext title="The long quay" onPlay={play} onCancel={() => undefined} />)).toContain('Cancel')
    })

    it('says its words as the app gives them', () => {
        const html = renderToStaticMarkup(
            <UpNext
                title="The long quay"
                countdown={3}
                onPlay={play}
                onCancel={() => undefined}
                words={{ heading: 'Neste', playNow: 'Spill nå', cancel: 'Avbryt', playingIn: (seconds) => `Om ${String(seconds)} s` }}
            />,
        )
        expect(html).toContain('aria-label="Neste"')
        expect(html).toContain('Spill nå')
        expect(html).toContain('Avbryt')
        expect(html).toContain('Om 3 s')
    })

    it('draws a cover from the seed, or wears the artwork given', () => {
        expect(renderToStaticMarkup(<UpNext title="The long quay" placeholderSeed="e2" onPlay={play} />)).toContain('data-slot="artwork"')
        const given = renderToStaticMarkup(<UpNext title="The long quay" cover={<img src="quay.jpg" alt="" />} onPlay={play} />)
        expect(given).toContain('quay.jpg')
        expect(given).not.toContain('data-slot="artwork"')
    })
})
