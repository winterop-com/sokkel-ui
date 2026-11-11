import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FilterChip, saidOptions } from './FilterChip'

const STATES = [{ value: 'succeeded' }, { value: 'failed' }, { value: 'running' }, { value: 'queued' }]

describe('saidOptions', () => {
    it('says the chosen in the options’ order, or in the order they were picked', () => {
        expect(saidOptions(STATES, ['running', 'succeeded'])).toBe('succeeded, running')
        expect(saidOptions(STATES, ['running', 'succeeded'], undefined, true)).toBe('running, succeeded')
        expect(saidOptions(STATES, ['queued', 'failed', 'running'], undefined, true)).toBe('queued +2')
    })
})

describe('FilterChip', () => {
    it('says what it holds in pick order when asked to', () => {
        const html = renderToStaticMarkup(
            <FilterChip facet="State" options={STATES} multiple selected={['running', 'failed']} order="picked" />,
        )
        expect(html).toContain('>running, failed<')
    })
})
