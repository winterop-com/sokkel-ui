import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Segmented, type SegmentedVariant } from './Segmented'

const OPTIONS = [
    { value: 'local', label: 'Local' },
    { value: 'utc', label: 'UTC' },
] as const

const buttons = (html: string) => html.match(/<button[^>]*>/g) ?? []

describe('Segmented', () => {
    it.each(['track', 'tint', 'outline', 'solid'] satisfies SegmentedVariant[])(
        'makes each small %s option a finger tall below md, and a small control from md',
        (variant) => {
            const html = renderToStaticMarkup(
                <Segmented label="Times in" value="local" options={OPTIONS} variant={variant} onValueChange={() => undefined} />,
            )
            const options = buttons(html)
            expect(options).toHaveLength(2)
            for (const option of options) {
                expect(option).toMatch(/[ "]min-h-finger[ "]/)
                expect(option).toContain('md:min-h-')
            }
        },
    )

    it('makes each medium option a finger tall below md', () => {
        const html = renderToStaticMarkup(
            <Segmented label="Times in" size="md" value="utc" options={OPTIONS} onValueChange={() => undefined} />,
        )
        for (const option of buttons(html)) expect(option).toMatch(/[ "]min-h-finger[ "]/)
    })
})
