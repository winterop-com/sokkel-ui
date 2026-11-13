import { describe, expect, it } from 'vitest'

import { takesFinger } from './finger'

describe('takesFinger', () => {
    it('gives the hit area to a trigger drawn by the library', () => {
        expect(takesFinger(undefined, undefined)).toBe(true)
        expect(takesFinger(undefined, 'tool')).toBe(true)
    })

    it('gives it to a render element whose classes neither place it nor draw its ::after', () => {
        expect(takesFinger(<button type="button" />, undefined)).toBe(true)
        expect(takesFinger(<span className="flex size-7 items-center" />, undefined)).toBe(true)
    })

    it('leaves a render element placed by its own position, or drawing its own ::after, as it is', () => {
        expect(takesFinger(<button type="button" className="absolute top-2 right-2" />, undefined)).toBe(false)
        expect(takesFinger(<span className="sticky top-0" />, undefined)).toBe(false)
        expect(takesFinger(<span className="md:absolute" />, undefined)).toBe(false)
        expect(takesFinger(<span className="after:content-['']" />, undefined)).toBe(false)
        expect(takesFinger(<span className="hover:after:bg-hover" />, undefined)).toBe(false)
    })

    it('leaves classes or a render given as functions as they are', () => {
        expect(takesFinger(() => <span />, undefined)).toBe(false)
        expect(takesFinger(undefined, () => 'tool')).toBe(false)
        expect(takesFinger(<span className={'tool' as unknown as string} />, () => 'tool')).toBe(false)
    })
})
