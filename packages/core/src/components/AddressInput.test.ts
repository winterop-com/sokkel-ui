import { describe, expect, test } from 'vitest'

import { isAddress, parseAddresses } from './AddressInput'

describe('recipients typed or pasted as text', () => {
    test('splits on commas, semicolons and line breaks, and drops the blanks', () => {
        expect(parseAddresses('ada@example.org, grace@example.org;\nlinus@example.org,,')).toEqual([
            { address: 'ada@example.org' },
            { address: 'grace@example.org' },
            { address: 'linus@example.org' },
        ])
    })

    test('keeps the name of a named address, quoted or not', () => {
        expect(parseAddresses('Grace <grace@example.org>, "Margaret" <margaret@example.org>, <linus@example.org>')).toEqual([
            { address: 'grace@example.org', name: 'Grace' },
            { address: 'margaret@example.org', name: 'Margaret' },
            { address: 'linus@example.org' },
        ])
    })

    test('an address needs a name, an at and a dotted host', () => {
        expect(isAddress('ada@example.org')).toBe(true)
        expect(isAddress('ada@example')).toBe(false)
        expect(isAddress('ada example.org')).toBe(false)
        expect(isAddress('ada@@example.org')).toBe(false)
    })
})
