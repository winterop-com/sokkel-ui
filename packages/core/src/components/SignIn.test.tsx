import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SignIn, rememberUser, rememberedUser, signInReady, type SignInProps } from './SignIn'
import { flowGraph, levelHeights, seeded } from './SignInArt'

const EMPTY = { server: '', user: '', password: '', token: '', remember: false }

const PASSWORD = { method: 'password', server: false } as const
const TOKEN = { method: 'token', server: false } as const

describe('signInReady', () => {
    it('wants a user and a password', () => {
        expect(signInReady({ ...EMPTY, user: 'ada' }, PASSWORD)).toBe(false)
        expect(signInReady({ ...EMPTY, user: 'ada', password: 'tide' }, PASSWORD)).toBe(true)
        expect(signInReady({ ...EMPTY, user: '  ', password: 'tide' }, PASSWORD)).toBe(false)
    })

    it('wants only a token by token', () => {
        expect(signInReady({ ...EMPTY, token: 'tok_123' }, TOKEN)).toBe(true)
        expect(signInReady({ ...EMPTY, user: 'ada', password: 'tide' }, TOKEN)).toBe(false)
    })

    it('wants the server when it asks for one', () => {
        expect(signInReady({ ...EMPTY, token: 'tok_123' }, { ...TOKEN, server: true })).toBe(false)
        expect(signInReady({ ...EMPTY, token: 'tok_123', server: 'https://example.org' }, { ...TOKEN, server: true })).toBe(true)
    })

    it('wants only the user when the password is optional', () => {
        expect(signInReady({ ...EMPTY, user: 'ada' }, { ...PASSWORD, optional: 'password' })).toBe(true)
        expect(signInReady(EMPTY, { ...PASSWORD, optional: 'password' })).toBe(false)
        expect(signInReady(EMPTY, { ...TOKEN, optional: 'password' })).toBe(false)
    })

    it('wants no credentials when they are optional, but still the server', () => {
        expect(signInReady(EMPTY, { ...PASSWORD, optional: 'credentials' })).toBe(true)
        expect(signInReady(EMPTY, { ...TOKEN, optional: 'credentials' })).toBe(true)
        expect(signInReady(EMPTY, { ...PASSWORD, server: true, optional: 'credentials' })).toBe(false)
        expect(signInReady({ ...EMPTY, server: 'harbor' }, { ...PASSWORD, server: true, optional: 'credentials' })).toBe(true)
    })
})

describe('SignIn', () => {
    const draw = (props: Partial<SignInProps> = {}) =>
        renderToStaticMarkup(<SignIn name="Tidevann" reveal={false} onSubmit={() => undefined} {...props} />)
    /** Whether the submit is held. */
    const held = (page: string) => / disabled=""/.test(/<button type="submit"[^>]*>/.exec(page)?.[0] ?? '')

    it('leads each field with an icon, unless told not to', () => {
        const page = draw({ server: true })
        expect(page).toContain('lucide-globe')
        expect(page).toContain('lucide-user')
        expect(page).toContain('lucide-lock')
        const plain = draw({ server: true, icons: false })
        expect(plain).not.toContain('lucide-globe')
        expect(plain).not.toContain('lucide-user')
        expect(plain).not.toContain('lucide-lock')
        expect(plain).not.toContain('data-slot="input-group-addon" data-align="inline-start"')
    })

    it('marks what may be left empty and lets the form be sent without it', () => {
        expect(draw()).not.toContain('>optional<')
        const password = draw({ optional: 'password', defaultValues: { user: 'ada' } })
        expect(password.match(/>optional</g)).toHaveLength(1)
        expect(held(password)).toBe(false)
        const none = draw({ optional: 'credentials' })
        expect(none.match(/>optional</g)).toHaveLength(2)
        expect(held(none)).toBe(false)
        expect(held(draw())).toBe(true)
    })

    it("says it is looking for a server in the field's place, holding the submit", () => {
        const page = draw({ server: 'looking', optional: 'credentials' })
        expect(page).toContain('Looking for a server')
        expect(page).not.toContain('type="url"')
        expect(held(page)).toBe(true)
    })

    it('offers a different server once one is found, in the words given', () => {
        const page = draw({ server: 'found', defaultValues: { user: 'ada', password: 'tide' } })
        expect(page).toContain('Connect to a different server')
        expect(page).not.toContain('type="url"')
        expect(held(page)).toBe(false)
        expect(draw({ server: 'found', words: { changeServer: 'Use another server' } })).toContain('Use another server')
    })

    it('draws the values the app holds', () => {
        const page = draw({ server: true, values: { ...EMPTY, server: 'https://harbor.example.org', user: 'grace' } })
        expect(page).toContain('value="https://harbor.example.org"')
        expect(page).toContain('value="grace"')
    })

    it('holds the submit until the app says it is ready', () => {
        const values = { ...EMPTY, user: 'ada', password: 'tide' }
        expect(held(draw({ values }))).toBe(false)
        expect(held(draw({ values, ready: false }))).toBe(true)
    })

    it('says in the brand pane what answered at the address, before the facts', () => {
        const facts = [{ label: 'app', value: '2.0.1' }]
        const answered = draw({ facts, probe: { server: 'https://harbor.example.org', state: 'answered', version: '1.4.2' } })
        expect(answered).toContain('>server</dt>')
        expect(answered.indexOf('1.4.2')).toBeLessThan(answered.indexOf('2.0.1'))
        expect(draw({ probe: { server: 'https://nowhere.example.org', state: 'silent' } })).toContain('no answer')
        expect(draw({ probe: { server: 'https://harbor.example.org', state: 'asking' } })).toContain('asking')
        expect(draw({ probe: { server: 'h', state: 'silent' }, words: { noAnswer: 'nothing there' } })).toContain('nothing there')
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
