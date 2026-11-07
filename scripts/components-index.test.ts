import { describe, expect, it } from 'vitest'

import { exportedComponents, firstSentence, importPath, storyId, storyName } from './components-index'

const CORE_EXPORTS = {
    './styles.css': './src/styles/index.css',
    './primitives/*': { types: './dist/components/ui/*.d.ts', import: './dist/components/ui/*.js' },
    './hooks/*': { types: './dist/hooks/*.d.ts', import: './dist/hooks/*.js' },
    './*': { types: './dist/components/*.d.ts', import: './dist/components/*.js' },
}
const CHARTS_EXPORTS = {
    './styles.css': './src/styles.css',
    './kinds': { types: './dist/kinds/index.d.ts', import: './dist/kinds/index.js' },
    './*': { types: './dist/*.d.ts', import: './dist/*.js' },
}

describe('firstSentence', () => {
    it('takes the first sentence of a doc comment, on one line', () => {
        const doc = `/**
 * One number with what it counts: runs today, the failure rate. A change
 * against an earlier period is drawn beside it.
 */`
        expect(firstSentence(doc)).toBe('One number with what it counts: runs today, the failure rate.')
    })

    it('runs a sentence across lines and past an abbreviation', () => {
        expect(firstSentence('/** A list of runs, e.g. the last ten,\n * newest first. Then more. */')).toBe(
            'A list of runs, e.g. the last ten, newest first.',
        )
    })

    it('keeps a comment without a stop, and drops the tags', () => {
        expect(firstSentence('/** The one-line bar */')).toBe('The one-line bar')
        expect(firstSentence('/**\n * A field.\n * @deprecated\n */')).toBe('A field.')
    })

    it('ends a sentence before code', () => {
        expect(firstSentence('/** Draws a chart. `kind` picks how. */')).toBe('Draws a chart.')
    })
})

describe('importPath', () => {
    it('follows the core package exports map', () => {
        expect(importPath('@winterop-com/sokkel-ui', CORE_EXPORTS, 'components/DataTable')).toBe('@winterop-com/sokkel-ui/DataTable')
        expect(importPath('@winterop-com/sokkel-ui', CORE_EXPORTS, 'components/ui/button')).toBe(
            '@winterop-com/sokkel-ui/primitives/button',
        )
        expect(importPath('@winterop-com/sokkel-ui', CORE_EXPORTS, 'components/dashboard/StatPanel')).toBe(
            '@winterop-com/sokkel-ui/dashboard/StatPanel',
        )
    })

    it('follows an add-on exports map, exact entries included', () => {
        expect(importPath('@winterop-com/sokkel-ui-charts', CHARTS_EXPORTS, 'Chart')).toBe('@winterop-com/sokkel-ui-charts/Chart')
        expect(importPath('@winterop-com/sokkel-ui-charts', CHARTS_EXPORTS, 'dashboard/BarPanel')).toBe(
            '@winterop-com/sokkel-ui-charts/dashboard/BarPanel',
        )
        expect(importPath('@winterop-com/sokkel-ui-charts', CHARTS_EXPORTS, 'kinds/index')).toBe('@winterop-com/sokkel-ui-charts/kinds')
    })

    it('answers nothing for a module the map does not reach', () => {
        expect(importPath('@winterop-com/sokkel-ui', CORE_EXPORTS, 'stories/Thing')).toBeUndefined()
    })
})

describe('exportedComponents', () => {
    it('finds components exported inline and in a list, with their doc comments, in source order', () => {
        const source = `/** A card. */
function Card() {}

function CardTitle() {}

/** Not exported. */
function Inner() {}

export const GAP = {}

/** A badge. */
export function Badge() {}

export { Card, CardTitle as Title, type Props, cardVariants }
`
        expect(exportedComponents(source)).toEqual([
            { name: 'Card', doc: '/** A card. */' },
            { name: 'Title' },
            { name: 'Badge', doc: '/** A badge. */' },
        ])
    })
})

describe('storyId', () => {
    it('makes the id Storybook gives a story', () => {
        expect(storyName('LayerPanel')).toBe('Layer Panel')
        expect(storyName('HTTPError')).toBe('HTTP Error')
        expect(storyId('Patterns/Data table', 'Rows10k')).toBe('patterns-data-table--rows-10-k')
        expect(storyId('Primitives/Inputs/InputOTP', 'Variants')).toBe('primitives-inputs-inputotp--variants')
    })
})
