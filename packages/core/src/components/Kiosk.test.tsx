import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Kiosk } from './Kiosk'

describe('Kiosk', () => {
    it('draws only the slots it is given', () => {
        const bare = renderToStaticMarkup(<Kiosk title="Tidevann">stage</Kiosk>)
        expect(bare).toContain('Tidevann')
        expect(bare).toContain('stage')
        for (const slot of ['kiosk-clock', 'kiosk-actions', 'kiosk-figures', 'kiosk-aside', 'kiosk-foot'])
            expect(bare).not.toContain(`data-slot="${slot}"`)
        const full = renderToStaticMarkup(
            <Kiosk label="Wall" title="Tidevann" mark="mark" clock="14:30" actions="leave" figures="counters" aside="sources" foot="alerts">
                stage
            </Kiosk>,
        )
        expect(full).toContain('aria-label="Wall"')
        for (const slot of ['kiosk-clock', 'kiosk-actions', 'kiosk-figures', 'kiosk-stage', 'kiosk-aside', 'kiosk-foot'])
            expect(full).toContain(`data-slot="${slot}"`)
        for (const word of ['mark', '14:30', 'leave', 'counters', 'sources', 'alerts']) expect(full).toContain(word)
    })

    it('puts the aside beside the stage at its width in a wide room, and under it otherwise', () => {
        const html = renderToStaticMarkup(
            <Kiosk title="Tidevann" aside="sources" asideWidth="lg">
                stage
            </Kiosk>,
        )
        expect(html).toContain('@3xl:grid-cols-[minmax(0,1fr)_24rem]')
        expect(html).toContain('grid-rows-[minmax(18rem,1fr)_auto]')
        expect(renderToStaticMarkup(<Kiosk title="Tidevann">stage</Kiosk>)).not.toContain('@3xl:grid-cols')
    })
})
