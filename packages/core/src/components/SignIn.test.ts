import { describe, expect, it } from 'vitest'

import { signInReady } from './SignIn'

const EMPTY = { server: '', user: '', password: '', token: '' }

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
