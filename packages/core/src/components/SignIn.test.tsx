import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    SignIn,
    keptWidth,
    openingField,
    refusedField,
    rememberSettles,
    rememberUser,
    rememberedUser,
    signInFields,
    signInReady,
    type SignInProps,
} from './SignIn'
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
    const held = (page: string) => / aria-disabled="true"/.test(/<button type="submit"[^>]*>/.exec(page)?.[0] ?? '')
    /** The input with the given name, as drawn. */
    const field = (page: string, name: string) => new RegExp(`<input[^>]* name="${name}"[^>]*>`).exec(page)?.[0] ?? ''

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

    it('names the fields for the password manager and marks the required ones', () => {
        const page = draw({ server: true })
        expect(field(page, 'server')).toContain('required=""')
        expect(field(page, 'username')).toContain('autoComplete="username"')
        expect(field(page, 'username')).toContain('required=""')
        expect(field(page, 'password')).toContain('autoComplete="current-password"')
        expect(field(page, 'password')).toContain('required=""')
        expect(field(draw({ method: 'token' }), 'token')).toContain('required=""')
        const none = draw({ optional: 'credentials' })
        expect(field(none, 'username')).not.toContain('required')
        expect(field(none, 'password')).not.toContain('required')
        expect(field(draw({ optional: 'password' }), 'username')).toContain('required=""')
        expect(field(draw({ optional: 'password' }), 'password')).not.toContain('required')
    })

    it('puts focus in the first field, or the first one empty, unless told not to', () => {
        expect(field(draw(), 'username')).toContain('autofocus')
        expect(field(draw(), 'password')).not.toContain('autofocus')
        expect(field(draw({ server: true }), 'server')).toContain('autofocus')
        expect(field(draw({ method: 'token' }), 'token')).toContain('autofocus')
        expect(field(draw({ defaultValues: { user: 'ada' } }), 'password')).toContain('autofocus')
        expect(draw({ autoFocus: false })).not.toContain('autofocus')
    })

    it('keeps the fields focusable while busy, taking no typing, and shuts the submit', () => {
        const page = draw({ busy: true, defaultValues: { user: 'ada', password: 'tide' } })
        expect(field(page, 'username')).toContain('readOnly=""')
        expect(field(page, 'username')).toContain('aria-disabled="true"')
        expect(field(page, 'password')).not.toContain('disabled=""')
        expect(held(page)).toBe(true)
        expect(field(draw(), 'username')).not.toContain('readOnly')
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

    it('is held until the page is left when storage refuses', () => {
        vi.stubGlobal('localStorage', {
            getItem: () => {
                throw new Error('denied')
            },
            setItem: () => {
                throw new Error('denied')
            },
        })
        expect(rememberedUser('tidevann.refused')).toBe('')
        expect(() => rememberUser('tidevann.refused', 'ada')).not.toThrow()
        expect(rememberedUser('tidevann.refused')).toBe('ada')
        rememberUser('tidevann.refused', '')
        expect(rememberedUser('tidevann.refused')).toBe('')
    })

    it('is kept once a busy try ends with no error', () => {
        expect(rememberSettles(undefined, false, { busy: true, error: undefined })).toBe('wait')
        expect(rememberSettles(undefined, true, { busy: true, error: undefined })).toBe('wait')
        expect(rememberSettles(undefined, true, { busy: false, error: undefined })).toBe('keep')
    })

    it('is dropped once the try is refused', () => {
        expect(rememberSettles(undefined, true, { busy: false, error: 'No.' })).toBe('drop')
        expect(rememberSettles(undefined, false, { busy: false, error: 'No.' })).toBe('drop')
        expect(rememberSettles('No.', false, { busy: false, error: 'Still no.' })).toBe('drop')
    })

    it('waits while the error from before the submit still shows', () => {
        expect(rememberSettles('No.', false, { busy: false, error: 'No.' })).toBe('wait')
        expect(rememberSettles('No.', false, { busy: true, error: 'No.' })).toBe('wait')
    })
})

describe('focus', () => {
    const password = signInFields({ method: 'password', server: false, own: false })
    const token = signInFields({ method: 'token', server: true, own: false })

    it('lists the fields the form draws, in order', () => {
        expect(password).toEqual(['user', 'password'])
        expect(token).toEqual(['server', 'token'])
        expect(signInFields({ method: 'password', server: true, own: true })).toEqual(['server'])
        expect(signInFields({ method: 'password', server: false, own: true })).toEqual([])
    })

    it('opens on the first field empty, else the first', () => {
        expect(openingField(password, EMPTY)).toBe('user')
        expect(openingField(password, { ...EMPTY, user: 'ada' })).toBe('password')
        expect(openingField(password, { ...EMPTY, user: 'ada', password: 'tide' })).toBe('user')
        expect(openingField(token, { ...EMPTY, server: 'https://example.org' })).toBe('token')
        expect(openingField([], EMPTY)).toBeUndefined()
    })

    it('goes to the password, the token, or the field the error is about when refused', () => {
        expect(refusedField(password)).toBe('password')
        expect(refusedField(token)).toBe('token')
        expect(refusedField(token, 'server')).toBe('server')
        expect(refusedField(password, 'token')).toBe('password')
        expect(refusedField(['server'])).toBe('server')
        expect(refusedField([])).toBeUndefined()
    })
})

describe('the kept brand width', () => {
    it('reads back whole pixels, no narrower than the pane goes', () => {
        expect(keptWidth('512')).toBe(512)
        expect(keptWidth('512.6')).toBe(513)
        expect(keptWidth('100')).toBe(320)
    })

    it('is none when nothing usable is kept', () => {
        expect(keptWidth(null)).toBeNull()
        expect(keptWidth('')).toBeNull()
        expect(keptWidth('wide')).toBeNull()
        expect(keptWidth('-4')).toBeNull()
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
