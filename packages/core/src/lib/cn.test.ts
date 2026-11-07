import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
    it('keeps a token text size beside a text color', () => {
        expect(cn('text-page', 'text-muted-foreground')).toBe('text-page text-muted-foreground')
        expect(cn('text-title font-medium', 'text-primary-ink')).toBe('text-title font-medium text-primary-ink')
    })

    it('lets a later text size win over an earlier one', () => {
        expect(cn('text-xs', 'text-stat')).toBe('text-stat')
        expect(cn('text-graph-title', 'text-sm')).toBe('text-sm')
    })
})
