import { describe, expect, it } from 'vitest'

import { tokenAlpha, tokenColor } from './look'

describe('a color token with an alpha', () => {
    it('reads the percent after the slash', () => {
        expect(tokenAlpha('status-failed')).toEqual({ name: 'status-failed', alpha: 1 })
        expect(tokenAlpha('muted-foreground/45')).toEqual({ name: 'muted-foreground', alpha: 0.45 })
        expect(tokenAlpha('chart-2/150')).toEqual({ name: 'chart-2', alpha: 1 })
    })

    it('is written as CSS through the token', () => {
        expect(tokenColor('chart-2')).toBe('var(--chart-2)')
        expect(tokenColor('muted-foreground/45')).toBe('color-mix(in oklab, var(--muted-foreground) 45%, transparent)')
    })
})
