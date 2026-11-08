import { afterEach, describe, expect, it, vi } from 'vitest'

import { rememberUser, rememberedUser, signInReady } from './SignIn'
import { flowGraph, levelHeights, seeded } from './SignInArt'

const EMPTY = { server: '', user: '', password: '', token: '', remember: false }

describe('signInReady', () => {
    it('wants a user and a password', () => {
        expect(signInReady({ ...EMPTY, user: 'ada' }, 'password', false)).toBe(false)
        expect(signInReady({ ...EMPTY, user: 'ada', password: 'tide' }, 'password', false)).toBe(true)
        expect(signInReady({ ...EMPTY, user: '  ', password: 'tide' }, 'password', false)).toBe(false)
    })

    it('wants only a token by token', () => {
        expect(signInReady({ ...EMPTY, token: 'tok_123' }, 'token', false)).toBe(true)
        expect(signInReady({ ...EMPTY, user: 'ada', password: 'tide' }, 'token', false)).toBe(false)
    })

    it('wants the server when it asks for one', () => {
        expect(signInReady({ ...EMPTY, token: 'tok_123' }, 'token', true)).toBe(false)
        expect(signInReady({ ...EMPTY, token: 'tok_123', server: 'https://example.org' }, 'token', true)).toBe(true)
    })
})

describe('the remembered username', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('is kept, read back and forgotten', () => {
        const kept = new Map<string, string>()
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => kept.get(key) ?? null,
            setItem: (key: string, value: string) => kept.set(key, value),
            removeItem: (key: string) => kept.delete(key),
        })
        rememberUser('tidevann.user', 'ada')
        expect(rememberedUser('tidevann.user')).toBe('ada')
        rememberUser('tidevann.user', '')
        expect(rememberedUser('tidevann.user')).toBe('')
    })

    it('is empty when storage refuses', () => {
        vi.stubGlobal('localStorage', {
            getItem: () => {
                throw new Error('denied')
            },
            setItem: () => {
                throw new Error('denied')
            },
        })
        expect(() => rememberUser('tidevann.user', 'ada')).not.toThrow()
        expect(rememberedUser('tidevann.user')).toBe('')
    })
})

describe('the sign-in art', () => {
    it('draws the same for the same seed', () => {
        expect(Array.from({ length: 4 }, seeded(5))).toEqual(Array.from({ length: 4 }, seeded(5)))
        expect(levelHeights(40, 7)).toEqual(levelHeights(40, 7))
        expect(flowGraph(3)).toEqual(flowGraph(3))
    })

    it('holds level heights between a floor and 1, the tallest at 1', () => {
        const heights = levelHeights(56, 11)
        expect(Math.max(...heights)).toBe(1)
        expect(Math.min(...heights)).toBeGreaterThanOrEqual(0.05)
    })

    it('lights one path from the first node to the last', () => {
        for (const seed of [1, 2, 3, 4, 5]) {
            const { nodes, edges } = flowGraph(seed)
            const lit = edges.filter((edge) => edge.lit)
            expect(lit[0].from).toBe(0)
            expect(lit.at(-1)?.to).toBe(nodes.length - 1)
            for (let index = 1; index < lit.length; index += 1) expect(lit[index].from).toBe(lit[index - 1].to)
        }
    })

    it('takes its shape from columns and rows', () => {
        const { nodes } = flowGraph(4, { columns: 8, rows: [3, 3] })
        const columns = new Map<number, number>()
        for (const node of nodes) columns.set(node.column, (columns.get(node.column) ?? 0) + 1)
        expect(columns.size).toBe(8)
        expect(columns.get(0)).toBe(1)
        expect(columns.get(7)).toBe(1)
        for (let column = 1; column < 7; column += 1) expect(columns.get(column)).toBe(3)
    })
})
