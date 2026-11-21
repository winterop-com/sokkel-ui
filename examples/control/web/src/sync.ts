/**
 * The rules the control site's windows agree by, apart from the channel they talk over, so each can
 * be checked on its own: which of two changes of the shared state wins, which leader's snapshots
 * are taken, how a command reaches the leader for certain and is run once, and when a leader out of
 * sight hands over.
 */

/** What tells one change of the shared state from another: how many changes came before, and which window made it. */
export interface Stamp {
    revision: number
    author: string
}

/**
 * Whether a change takes the place of the one a window holds: the later revision does, and of two
 * with the same revision the one whose author sorts last. Every window compares the same two stamps
 * and so keeps the same one, whoever sent it and whoever receives it.
 */
export const supersedes = (given: Stamp, held: Stamp): boolean =>
    given.revision > held.revision || (given.revision === held.revision && given.author > held.author)

/** Who sent a snapshot: the leader, the term it leads in, and the snapshot's place in what it has sent. */
export interface Lead {
    term: number
    leader: string
    sequence: number
}

export interface LeadGate {
    /** The latest term this window has heard of. */
    term(): number
    /** Who leads, as far as this window has heard. */
    leader(): string
    /** Notes that a leader claims a term; true when it takes the place of the leader known, false when it is superseded already. */
    claim(given: Pick<Lead, 'term' | 'leader'>): boolean
    /**
     * Whether a snapshot is taken: one from the leader known and later than its last, or the first
     * from a leader that takes its place. One from a leader superseded, or one that comes late or
     * twice, is not, so a snapshot sent before a handoff cannot roll the state back after it.
     */
    accept(given: Lead): boolean
}

/** Whether one leadership takes the place of another: a later term does, and of two claims to one term the leader that sorts last. */
const outranks = (given: Pick<Lead, 'term' | 'leader'>, held: Pick<Lead, 'term' | 'leader'>): boolean =>
    given.term > held.term || (given.term === held.term && given.leader > held.leader)

/** A window's record of who leads and what it has taken from them. */
export function createLeadGate(): LeadGate {
    let held: Lead = { term: 0, leader: '', sequence: -1 }
    return {
        term: () => held.term,
        leader: () => held.leader,
        claim(given) {
            if (given.term === held.term && given.leader === held.leader) return true
            if (!outranks(given, held)) return false
            held = { term: given.term, leader: given.leader, sequence: -1 }
            return true
        },
        accept(given) {
            if (given.term === held.term && given.leader === held.leader) {
                if (given.sequence <= held.sequence) return false
                held = { ...held, sequence: given.sequence }
                return true
            }
            if (!outranks(given, held)) return false
            held = { term: given.term, leader: given.leader, sequence: given.sequence }
            return true
        },
    }
}

/** A command on its way to the leader, with the id it is acknowledged and told apart by. */
export interface Sent<T> {
    id: string
    command: T
}

export interface Outbox<T> {
    /** Sends a command and keeps it until the leader says it has it. */
    push(command: T): string
    /** Forgets a command the leader has acknowledged. */
    acknowledged(id: string): void
    /** Sends again every command not yet acknowledged, as after a change of leader, and forgets those grown too old. */
    resend(): void
    /** Takes every command not yet acknowledged out, for a window that has become the leader to run itself. */
    drain(): T[]
    readonly size: number
}

export interface OutboxOptions {
    now?: () => number
    /** How long a command is sent again before it is given up, in milliseconds. Half a minute by default. */
    expire?: number
    /** What a command's id starts with, so two windows never make the same one. */
    prefix: string
}

/** The commands a window has sent the leader and not heard back on. */
export function createOutbox<T>(send: (sent: Sent<T>) => void, options: OutboxOptions): Outbox<T> {
    const now = options.now ?? (() => Date.now())
    const expire = options.expire ?? 30_000
    const waiting = new Map<string, { command: T; at: number }>()
    let count = 0
    return {
        push(command) {
            count += 1
            const id = `${options.prefix}:${String(count)}`
            waiting.set(id, { command, at: now() })
            send({ id, command })
            return id
        },
        acknowledged(id) {
            waiting.delete(id)
        },
        resend() {
            for (const [id, entry] of waiting) {
                if (now() - entry.at > expire) waiting.delete(id)
                else send({ id, command: entry.command })
            }
        },
        drain() {
            const commands = [...waiting.values()].map((entry) => entry.command)
            waiting.clear()
            return commands
        },
        get size() {
            return waiting.size
        },
    }
}

/** Which command ids a leader has run, so one sent twice is run once. `first` is true the first time an id is seen. */
export function createSeen(limit = 500): { first: (id: string) => boolean } {
    const seen = new Set<string>()
    return {
        first(id) {
            if (seen.has(id)) return false
            seen.add(id)
            if (seen.size > limit) seen.delete(seen.values().next().value as string)
            return true
        },
    }
}

/** Another window as last heard: when, when it was opened, and whether it was in sight. */
export interface Peer {
    at: number
    born: number
    visible: boolean
}

/** How long after it was last heard a window is still counted as open, in milliseconds. */
export const PEER_HEARD = 5000

/**
 * Whether a leader should hand over: it is out of sight, where a browser slows its timers, and a
 * window heard lately is in sight. It is asked whenever a window announces itself and on a timer,
 * not only when the leader goes out of sight, so a window opened after that is served too.
 */
export function shouldHandOff(hidden: boolean, peers: Iterable<Peer>, now: number): boolean {
    if (!hidden) return false
    for (const peer of peers) if (peer.visible && now - peer.at <= PEER_HEARD) return true
    return false
}
