import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Shell } from './Shell'
import { STATUS_STRIP, StatusItem, StatusLine } from './StatusLine'

describe('a status line', () => {
    it('draws its own strip, drawn alone as in a shell’s foot', () => {
        const html = renderToStaticMarkup(
            <StatusLine note="import-orders is running">
                <StatusItem label="run">run_01JCF8Q2</StatusItem>
            </StatusLine>,
        )
        expect(html.startsWith(`<div class="${STATUS_STRIP}">`)).toBe(true)
    })

    it('stands in the shell’s foot, which gives it the room and draws no strip of its own', () => {
        const html = renderToStaticMarkup(
            <Shell rail={null} foot={<StatusLine note="Ready" />}>
                harbor
            </Shell>,
        )
        expect(html).toMatch(/<footer class="flex min-w-0 shrink-0[^"]*"><div class="flex h-shell-foot/)
        expect(html.match(/bg-page-foot-ground/g)?.length).toBe(1)
    })

    it('lends its empty strip to stand beside the rail’s foot cell when a shell with a bottom strip has no foot', () => {
        const html = renderToStaticMarkup(
            <Shell rail={null} bottom={<div>player</div>}>
                harbor
            </Shell>,
        )
        expect(html).toMatch(
            /<div aria-hidden="true" class="h-shell-foot [^"]*bg-page-foot-ground[^"]* hidden md:flex md:peer-empty:hidden"><\/div>/,
        )
    })
})
