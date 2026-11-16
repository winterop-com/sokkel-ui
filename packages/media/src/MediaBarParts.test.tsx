import { SoundVisualizer } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { isValidElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Backdrop, drawVisualizer, kindOf } from './MediaBarParts'

describe('the visualizer slot', () => {
    it('reads the kind a SoundVisualizer draws, spectrum by default, and none for any other node', () => {
        expect(kindOf(<SoundVisualizer kind="wave" />)).toBe('wave')
        expect(kindOf(<SoundVisualizer />)).toBe('spectrum')
        expect(kindOf(<div>bars</div>)).toBeUndefined()
        expect(kindOf(null)).toBeUndefined()
    })

    it('gives a SoundVisualizer the look it is drawn with, and draws any other node as given', () => {
        const drawn = drawVisualizer(<SoundVisualizer kind="spectrum" />, { kind: 'ring', align: 'center' })
        expect(isValidElement(drawn) && (drawn as ReactElement<{ kind: string; align: string }>).props).toMatchObject({
            kind: 'ring',
            align: 'center',
        })
        const other = <span>bars</span>
        expect(drawVisualizer(other, { kind: 'ring' })).toBe(other)
    })
})

describe('Backdrop', () => {
    it('draws the visualizer at its strength, and nothing at none or without one', () => {
        expect(renderToStaticMarkup(<Backdrop visualizer={<i>bars</i>} strength={0.4} />)).toContain('opacity:0.4')
        expect(renderToStaticMarkup(<Backdrop visualizer={<i>bars</i>} strength={0} />)).toBe('')
        expect(renderToStaticMarkup(<Backdrop visualizer={null} strength={1} />)).toBe('')
    })
})
