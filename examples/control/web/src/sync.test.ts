import { describe, expect, it } from 'vitest'

import { createLeadGate, createOutbox, createSeen, shouldHandOff, supersedes, type Sent, type Stamp } from './sync.ts'

describe('supersedes', () => {
    it('lets the later revision win', () => {
        expect(supersedes({ revision: 4, author: 'a' }, { revision: 3, author: 'z' })).toBe(true)
        expect(supersedes({ revision: 3, author: 'z' }, { revision: 4, author: 'a' })).toBe(false)
    })

    it('brings every window to the same value when two change at the same revision, in whatever order they hear of it', () => {
        const changes: (Stamp & { value: string })[] = [
            { revision: 1, author: 'a', value: 'from a' },
            { revision: 1, author: 'c', value: 'from c' },
        ]
        // Each window holds its own change, or none, and then hears the others' in its own order.
        const windows = [
            { id: 'a', held: changes[0], hears: [changes[1]] },
            { id: 'c', held: changes[1], hears: [changes[0]] },
            { id: 'b', held: { revision: 0, author: '', value: '' }, hears: [changes[0], changes[1]] },
            { id: 'z', held: { revision: 0, author: '', value: '' }, hears: [changes[1], changes[0]] },
        ]
        const ends = windows.map(
            (window) => window.hears.reduce((held, given) => (supersedes(given, held) ? given : held), window.held).value,
        )
        expect(ends).toEqual(['from c', 'from c', 'from c', 'from c'])
    })

    it('does not take a change it holds already', () => {
        expect(supersedes({ revision: 2, author: 'a' }, { revision: 2, author: 'a' })).toBe(false)
    })
})

describe('createLeadGate', () => {
    it('takes a leader’s snapshots in order, and none late or twice', () => {
        const gate = createLeadGate()
        expect(gate.accept({ term: 1, leader: 'a', sequence: 0 })).toBe(true)
        expect(gate.accept({ term: 1, leader: 'a', sequence: 2 })).toBe(true)
        expect(gate.accept({ term: 1, leader: 'a', sequence: 1 })).toBe(false)
        expect(gate.accept({ term: 1, leader: 'a', sequence: 2 })).toBe(false)
    })

    it('rejects an old leader’s late snapshot once a new leader is known, so the state is not rolled back', () => {
        const gate = createLeadGate()
        gate.accept({ term: 1, leader: 'a', sequence: 7 })
        expect(gate.claim({ term: 2, leader: 'b' })).toBe(true)
        expect(gate.accept({ term: 1, leader: 'a', sequence: 8 })).toBe(false)
        expect(gate.accept({ term: 2, leader: 'b', sequence: 0 })).toBe(true)
        expect(gate.term()).toBe(2)
        expect(gate.leader()).toBe('b')
    })

    it('lets a successor take the old leader’s last snapshot until it claims the term itself', () => {
        const successor = createLeadGate()
        successor.accept({ term: 1, leader: 'a', sequence: 7 })
        // The lock has passed, but the old leader's parting snapshot is still on its way.
        expect(successor.accept({ term: 1, leader: 'a', sequence: 8 })).toBe(true)
        successor.claim({ term: 2, leader: 'b' })
        expect(successor.accept({ term: 1, leader: 'a', sequence: 9 })).toBe(false)
    })

    it('settles two claims to one term the same way in every window', () => {
        const one = createLeadGate()
        const other = createLeadGate()
        one.claim({ term: 3, leader: 'a' })
        one.claim({ term: 3, leader: 'b' })
        other.claim({ term: 3, leader: 'b' })
        expect(other.claim({ term: 3, leader: 'a' })).toBe(false)
        expect([one.leader(), other.leader()]).toEqual(['b', 'b'])
    })
})

describe('createOutbox', () => {
    it('sends a command again until the leader acknowledges it, across a change of leader', () => {
        const sent: Sent<string>[] = []
        const outbox = createOutbox<string>((each) => sent.push(each), { prefix: 'w1', now: () => 0 })
        const id = outbox.push('refresh flights')
        // No window led when it was sent, so nothing came back.
        outbox.resend()
        outbox.resend()
        expect(sent).toEqual([
            { id, command: 'refresh flights' },
            { id, command: 'refresh flights' },
            { id, command: 'refresh flights' },
        ])
        outbox.acknowledged(id)
        outbox.resend()
        expect(sent).toHaveLength(3)
        expect(outbox.size).toBe(0)
    })

    it('gives a command up after half a minute', () => {
        let now = 0
        const sent: Sent<string>[] = []
        const outbox = createOutbox<string>((each) => sent.push(each), { prefix: 'w1', now: () => now })
        outbox.push('enable vessels')
        now = 31_000
        outbox.resend()
        expect(sent).toHaveLength(1)
        expect(outbox.size).toBe(0)
    })

    it('hands what is waiting to a window that has become the leader itself', () => {
        const outbox = createOutbox<string>(() => undefined, { prefix: 'w1' })
        outbox.push('one')
        outbox.push('two')
        expect(outbox.drain()).toEqual(['one', 'two'])
        expect(outbox.size).toBe(0)
    })

    it('gives two windows different ids', () => {
        const ids: string[] = []
        createOutbox<string>((each) => ids.push(each.id), { prefix: 'w1' }).push('x')
        createOutbox<string>((each) => ids.push(each.id), { prefix: 'w2' }).push('x')
        expect(new Set(ids).size).toBe(2)
    })
})

describe('createSeen', () => {
    it('runs a command sent twice once', () => {
        const seen = createSeen()
        expect(seen.first('w1:1')).toBe(true)
        expect(seen.first('w1:1')).toBe(false)
        expect(seen.first('w1:2')).toBe(true)
    })

    it('forgets the oldest past its limit', () => {
        const seen = createSeen(2)
        seen.first('a')
        seen.first('b')
        seen.first('c')
        expect(seen.first('b')).toBe(false)
        expect(seen.first('a')).toBe(true)
    })
})

describe('shouldHandOff', () => {
    const peer = (visible: boolean, at = 0) => ({ at, born: 0, visible })

    it('hands over when the leader is out of sight and a window heard lately is in sight', () => {
        expect(shouldHandOff(true, [peer(false), peer(true)], 1000)).toBe(true)
    })

    it('keeps leading in sight, with no window in sight, or with one not heard for a while', () => {
        expect(shouldHandOff(false, [peer(true)], 1000)).toBe(false)
        expect(shouldHandOff(true, [peer(false)], 1000)).toBe(false)
        expect(shouldHandOff(true, [peer(true, 0)], 6000)).toBe(false)
        expect(shouldHandOff(true, [], 1000)).toBe(false)
    })

    it('answers for a window that announces itself after the leader went out of sight', () => {
        const peers = new Map<string, ReturnType<typeof peer>>()
        expect(shouldHandOff(true, peers.values(), 1000)).toBe(false)
        peers.set('late', peer(true, 9000))
        expect(shouldHandOff(true, peers.values(), 9500)).toBe(true)
    })
})
