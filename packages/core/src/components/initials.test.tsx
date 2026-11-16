import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AccountMenu } from './AccountMenu'
import { PersonAvatar } from './PersonAvatar'
import { Rail } from './Rail'

// A letter outside the basic plane, two UTF-16 units long.
const SCRIPT_A = '\u{1D49C}'

/** Whether the text holds half of a surrogate pair on its own. */
const broken = (html: string) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(html)

describe('initials', () => {
    it('keep a first letter outside the basic plane whole in the account menu', () => {
        const html = renderToStaticMarkup(<AccountMenu name={`${SCRIPT_A}da`} collapsed />)
        expect(html).toContain(SCRIPT_A)
        expect(broken(html)).toBe(false)
    })

    it('keep it whole in a collapsed rail entry without an icon', () => {
        const html = renderToStaticMarkup(
            <Rail
                name="Tidevann"
                collapsed
                groups={[{ id: 'projects', entries: [{ id: 'harbor', label: `${SCRIPT_A}rbor`, href: '#harbor' }] }]}
            />,
        )
        expect(html).toContain(`>${SCRIPT_A}<`)
        expect(broken(html)).toBe(false)
    })

    it('keep it whole in a person avatar', () => {
        const html = renderToStaticMarkup(<PersonAvatar name={`${SCRIPT_A}da lovelace`} />)
        expect(html).toContain(`${SCRIPT_A}L`)
        expect(broken(html)).toBe(false)
    })
})
