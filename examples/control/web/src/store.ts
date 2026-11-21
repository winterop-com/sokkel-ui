/**
 * The control site's one state, shared by every window and tab of it: the engine's state and what
 * its sources read, what is selected, which alerts are acknowledged and where the playback stands.
 *
 * One window leads: it runs the engine, reading the sources, and sends each change to the others
 * over a BroadcastChannel. The others follow: they take what the leader sends as their own engine's
 * state, and send it their commands. Leadership is a Web Lock every window asks for, so when the
 * leader closes the lock passes to the next, which runs on from the state it already holds. Where
 * there are no Web Locks, the window heard longest leads, and one not heard for a few seconds is
 * taken to have closed.
 *
 * Each leadership has a term, one past the last heard of, and each snapshot a place in what its
 * leader has sent, so a snapshot from a leader since replaced, or one that comes late, is not taken
 * (`sync.ts`). A new leader claims its term, waits a moment for the old one's parting snapshot, and
 * only then reads. A command is sent until the leader acknowledges it, again after a change of
 * leader, and run once. What is selected, acknowledged and played back is sent by whichever window
 * changed it and taken by all, the latest change winning and the same one winning in every window.
 */
import { createSourceEngine, type EngineSnapshot, type EngineState } from '@winterop-com/sokkel-ui-tracking/sources'
import { useSyncExternalStore } from 'react'
import { storageKey } from 'tidevann-shared/backend'

import { settings } from './settings'
import { hasCredentials, releaseStreams, setCredentials, SOURCES } from './sources'
import { createLeadGate, createOutbox, createSeen, shouldHandOff, supersedes, type Lead, type Peer, type Sent } from './sync'

/** What every window agrees on beside the engine: the selection, the acknowledged alerts and the playback. */
export interface Shared {
    /** What is selected, as `source:id`, or a source alone as `source:`. */
    selected: string | null
    /** The ids of the alerts acknowledged. */
    acknowledged: string[]
    /** The moment played back, in milliseconds since the epoch; null while live. */
    playhead: number | null
    /** Whether the server's checks are made with a sign-in, which only the leader holds. */
    signedIn: boolean
    /** Counts the changes, and names the window that made the last, so the latest wins and the same one wins everywhere. */
    revision: number
    author: string
}

type Command =
    | { do: 'enable'; id: string; on: boolean }
    | { do: 'live'; id: string; on: boolean }
    | { do: 'refresh'; id: string }
    | { do: 'credentials'; username: string; password: string }

type Message =
    | { type: 'hello'; from: string }
    | { type: 'alive'; from: string; born: number; visible: boolean }
    | { type: 'bye'; from: string }
    | { type: 'claim'; from: string; term: number }
    | ({ type: 'engine'; from: string; snapshot: EngineSnapshot } & Lead)
    | { type: 'shared'; from: string; shared: Shared }
    | { type: 'command'; from: string; sent: Sent<Command> }
    | { type: 'done'; from: string; id: string }

const me = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const born = Date.now()

/** How long a new leader waits for the old one's parting snapshot before it reads, in milliseconds. */
const SYNC_WAIT = 300

const saved = settings.get()
export const engine = createSourceEngine({
    sources: SOURCES,
    failures: 3,
    window: 3_600_000,
    disabled: SOURCES.filter((source) => saved.sources[source.id]?.on === false).map((source) => source.id),
    simulated: SOURCES.filter((source) => saved.sources[source.id]?.live === false).map((source) => source.id),
})

let shared: Shared = { selected: null, acknowledged: [], playhead: null, signedIn: false, revision: 0, author: '' }
let leading = false
let started = false
const listeners = new Set<() => void>()
const tell = () => {
    for (const listener of listeners) listener()
}

const channel: BroadcastChannel | undefined = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(storageKey('sync'))
const post = (message: Message) => channel?.postMessage(message)

const gate = createLeadGate()
const seen = createSeen()
const outbox = createOutbox<Command>((sent) => post({ type: 'command', from: me, sent }), { prefix: me })

/** The term this window leads in, and how many snapshots it has sent in it. */
let term = 0
let sequence = 0

/** The versions of each source's data the followers were last sent, so only what changed is sent again. */
let sent: Record<string, number> = {}
let sending: ReturnType<typeof setTimeout> | undefined

function send(full = false): void {
    if (!leading) return
    const snapshot = engine.snapshot(full ? undefined : sent)
    sent = Object.fromEntries(snapshot.state.sources.map((source) => [source.id, source.version]))
    sequence += 1
    post({ type: 'engine', from: me, snapshot, term, leader: me, sequence })
}

/** Sends the engine's changes to the followers, gathered so a burst of reads is one message. */
function sendSoon(): void {
    if (!leading || sending !== undefined) return
    sending = setTimeout(() => {
        sending = undefined
        send()
    }, 200)
}

let timer: ReturnType<typeof setInterval> | undefined
let syncing: ReturnType<typeof setTimeout> | undefined

/** Whether the vessel stream is wanted: only while its source is on and read live. */
function streamWanted(): boolean {
    const vessels = engine.state().sources.find((source) => source.id === 'vessels')
    return vessels !== undefined && vessels.enabled && vessels.live
}

function run(command: Command): void {
    if (command.do === 'enable') engine.setEnabled(command.id, command.on)
    else if (command.do === 'live') engine.setLive(command.id, command.on)
    else if (command.do === 'refresh') engine.refresh(command.id, Date.now())
    else {
        setCredentials(command.username === '' ? undefined : { username: command.username, password: command.password })
        change({ signedIn: hasCredentials() })
        engine.refresh('server', Date.now())
    }
    // Switched off or to its simulation, the vessels' stream is let go, whichever of the two it was.
    if (!streamWanted()) releaseStreams()
}

/**
 * Takes the lead: claims the term past the last heard of, so every window stops taking the old
 * leader's snapshots, waits a moment for that leader's parting one, and then reads the sources and
 * sends the whole state. Commands this window sent and never had acknowledged it runs itself.
 */
function lead(): void {
    if (leading || syncing !== undefined) return
    const claimed = gate.term() + 1
    post({ type: 'claim', from: me, term: claimed })
    syncing = setTimeout(() => {
        syncing = undefined
        if (!gate.claim({ term: claimed, leader: me })) return
        term = claimed
        sequence = 0
        leading = true
        for (const command of outbox.drain()) run(command)
        engine.poll(Date.now(), { hidden: document.hidden })
        timer = setInterval(() => engine.poll(Date.now(), { hidden: document.hidden }), 1000)
        send(true)
        tell()
    }, SYNC_WAIT)
}

/** Gives the lead up, sending the whole state once more first, so the next leader runs on from it. */
function follow(): void {
    clearTimeout(syncing)
    syncing = undefined
    if (!leading) return
    clearTimeout(sending)
    sending = undefined
    send(true)
    leading = false
    clearInterval(timer)
    releaseStreams()
    tell()
}

/** Has the leader do something: this window when it leads, the leader otherwise, sent until it says it has it. */
export function command(given: Command): void {
    if (leading) run(given)
    else outbox.push(given)
}

/** Changes what the windows agree on, here and in every other. */
export function change(patch: Partial<Omit<Shared, 'revision' | 'author'>>): void {
    shared = { ...shared, ...patch, revision: shared.revision + 1, author: me }
    post({ type: 'shared', from: me, shared })
    tell()
}

/** The windows heard lately, by id: when, when each was opened, and whether it was in sight. */
const peers = new Map<string, Peer>()

/** Hands the lock on, when this window leads by one; set while it holds the lock. */
let handOver: (() => void) | undefined

/** Hands over when this window leads out of sight and another in sight could; asked on every announcement and on a timer. */
function considerHandOff(): void {
    if (leading && handOver !== undefined && shouldHandOff(document.hidden, peers.values(), Date.now())) handOver()
}

/** Without Web Locks: leads when no window heard lately is older than this one. */
function elect(): void {
    const now = Date.now()
    for (const [id, other] of peers) if (now - other.at > 3500) peers.delete(id)
    const older = [...peers].some(([id, other]) => other.born < born || (other.born === born && id < me))
    if (older) follow()
    else lead()
}

const announce = () => post({ type: 'alive', from: me, born, visible: !document.hidden })

function receive(message: Message): void {
    if (message.from === me) return
    if (message.type === 'hello') {
        if (leading) {
            send(true)
            post({ type: 'shared', from: me, shared })
        }
    } else if (message.type === 'claim') {
        // A leader replaced steps down; a follower sends again what the old leader never acknowledged.
        if (gate.claim({ term: message.term, leader: message.from }) && (leading || syncing !== undefined) && handOver === undefined)
            follow()
        outbox.resend()
    } else if (message.type === 'engine') {
        // Without a lock to settle it, a leader that hears one that outranks it steps down and follows.
        if (leading && handOver === undefined && message.term >= term && gate.claim(message)) follow()
        if (!leading && gate.accept(message)) engine.adopt(message.snapshot)
    } else if (message.type === 'shared') {
        if (supersedes(message.shared, shared)) {
            shared = message.shared
            tell()
        }
    } else if (message.type === 'command') {
        if (!leading) return
        post({ type: 'done', from: me, id: message.sent.id })
        if (seen.first(message.sent.id)) run(message.sent.command)
    } else if (message.type === 'done') outbox.acknowledged(message.id)
    else if (message.type === 'alive') {
        peers.set(message.from, { at: Date.now(), born: message.born, visible: message.visible })
        considerHandOff()
    } else peers.delete(message.from)
}

/** Starts the state in this window, once: joins the channel, asks to lead, and follows until it does. */
export function startControl(): void {
    if (started) return
    started = true
    engine.subscribe(() => {
        sendSoon()
        tell()
    })
    if (channel !== undefined) channel.onmessage = (event: MessageEvent<Message>) => receive(event.data)
    post({ type: 'hello', from: me })
    announce()
    document.addEventListener('visibilitychange', () => {
        announce()
        considerHandOff()
    })
    window.addEventListener('pagehide', () => post({ type: 'bye', from: me }))
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
    setInterval(() => {
        announce()
        outbox.resend()
        if (channel !== undefined && locks === undefined) elect()
        else considerHandOff()
    }, 1000)
    if (channel === undefined) lead()
    else if (locks !== undefined) {
        const ask = () => {
            void locks.request(storageKey('leader'), () => {
                lead()
                // Held until this window closes, or hands over to a window in sight while it is out of sight itself.
                return new Promise<void>((resolve) => {
                    handOver = () => {
                        handOver = undefined
                        follow()
                        resolve()
                        ask()
                    }
                })
            })
        }
        ask()
    } else setTimeout(elect, 600)
    // The sources switched in Settings reach the leader, whichever window they were switched in.
    settings.subscribe(() => {
        const wanted = settings.get().sources
        for (const source of engine.state().sources) {
            const want = wanted[source.id] ?? { on: true, live: true }
            if (want.on !== source.enabled) command({ do: 'enable', id: source.id, on: want.on })
            if (want.live !== source.live && SOURCES.find((each) => each.id === source.id)?.read !== undefined)
                command({ do: 'live', id: source.id, on: want.live })
        }
    })
}

/** Everything a view reads: the engine's state, what the windows agree on, and whether this window leads. */
export interface Control {
    state: EngineState
    shared: Shared
    leading: boolean
}

let view: Control | undefined
let viewOf: [EngineState, Shared, boolean] | undefined

function current(): Control {
    const state = engine.state()
    if (view === undefined || viewOf === undefined || viewOf[0] !== state || viewOf[1] !== shared || viewOf[2] !== leading) {
        view = { state, shared, leading }
        viewOf = [state, shared, leading]
    }
    return view
}

const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

/** The control site's state, followed as it changes in this window or any other. */
export function useControl(): Control {
    return useSyncExternalStore(subscribe, current, current)
}
