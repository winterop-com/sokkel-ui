import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Shell, ShellHead, ShellTop } from './Shell'

describe('ShellTop', () => {
    it('draws nothing outside a Shell', () => {
        expect(renderToStaticMarkup(<ShellTop>harbor</ShellTop>)).toBe('')
    })

    it('leaves the shell its own top until a screen draws one, and the box a screen draws into ahead of it', () => {
        const html = renderToStaticMarkup(
            <Shell rail={null} top={<span>shell top</span>}>
                <ShellTop>
                    <span>screen top</span>
                </ShellTop>
            </Shell>,
        )
        // On the server no screen has claimed the bar yet: the shell's own top shows, after the screen's box.
        expect(html).toContain('shell top')
        expect(html).not.toContain('screen top')
        expect(html).toMatch(/<div class="contents"><\/div><span>shell top<\/span><\/header>/)
    })
})

describe('ShellHead', () => {
    it('draws its head in place outside a Shell', () => {
        expect(renderToStaticMarkup(<ShellHead inset={false}>harbor</ShellHead>)).toBe('harbor')
        expect(renderToStaticMarkup(<ShellHead>harbor</ShellHead>)).toMatch(
            /^<div data-shell-head-rule="true" class="[^"]*px-\(--density-page-inset\)[^"]*border-b[^"]*">harbor<\/div>$/,
        )
    })

    it('draws into the box above the scroller once claimed, and nothing in the content', () => {
        const html = renderToStaticMarkup(
            <Shell rail={null}>
                <ShellHead>
                    <h1>Runs</h1>
                </ShellHead>
                <p>body</p>
            </Shell>,
        )
        // On the server no screen has claimed the box yet: it stays empty, ahead of the scroller.
        expect(html).not.toContain('<h1>Runs</h1>')
        expect(html).toMatch(/<div class="[^"]*scroller-thin[^"]*"><\/div><main [^>]*><p>body<\/p><\/main>/)
    })
})
