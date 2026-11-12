import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { BlockPicker } from './BlockPicker'

const pick = () => undefined

describe('the block picker', () => {
    test('is drawn at the width it is given, never wider than the canvas it stands over', () => {
        expect(renderToStaticMarkup(<BlockPicker blocks={[]} groups={[]} onPick={pick} />)).toContain('w-64')
        const wide = renderToStaticMarkup(<BlockPicker blocks={[]} groups={[]} onPick={pick} width="lg" />)
        expect(wide).toContain('w-80')
        expect(wide).toContain('max-w-[var(--graph-overlay-width,none)]')
    })
})
