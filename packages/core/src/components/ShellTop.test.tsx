import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Shell, ShellTop } from './Shell'

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
