/**
 * Tidevann's analytics server, faked in the page: the calls that change what the backend keeps,
 * and a live stream that sends a sign-up, an order of seats, an upgrade or a team leaving every
 * second or two while the app is open.
 */

import { changes, invoiceChanges, prefs, teamEdits, teams } from './collections'
import {
    DEFAULT_PREFS,
    PRICE,
    REGION_OWNER,
    dayOf,
    type Change,
    type Invoice,
    type InvoiceStatus,
    type Pace,
    type Person,
    type Plan,
    type Prefs,
    type Team,
    type TeamRecord,
} from './model'
import { hash, pick, placeOf, seeded } from './seed'
import { standing, world, type World } from './world'

let made = 0
const changeId = () => {
    made += 1
    return `c-${Date.now().toString(36)}-${String(made)}`
}

/** Moves a team to a plan and a number of seats: an upgrade, a downgrade or seats bought or let go, as the move is. */
export function changePlan(team: Team, plan: Plan, seats: number, by: Person | null, live = false): Promise<Change> {
    const at = Date.now()
    const was = standing(team, at)
    const kind: Change['kind'] =
        was.status === 'churned' || PRICE[plan] > PRICE[was.plan] ? 'upgrade' : PRICE[plan] < PRICE[was.plan] ? 'downgrade' : 'seats'
    const change: Change = { id: changeId(), team: team.id, kind, at, plan, seats, by, ...(live ? { live } : {}) }
    return changes.insert([change]).then(() => change)
}

/** Ends a team's paid plan: it leaves, keeping the plan it had. */
export function cancelPlan(team: Team, by: Person | null, live = false): Promise<Change> {
    const at = Date.now()
    const was = standing(team, at)
    const change: Change = { id: changeId(), team: team.id, kind: 'churn', at, plan: was.plan, seats: 0, by, ...(live ? { live } : {}) }
    return changes.insert([change]).then(() => change)
}

/** Hands a team to someone else to look after. */
export async function setOwner(team: Team, owner: Person): Promise<void> {
    const known = await teamEdits.list()
    if (known.some((edit) => edit.id === team.id)) await teamEdits.update(team.id, { owner })
    else await teamEdits.create({ owner }, team.id)
}

/** Sets an invoice's state by hand: refunded, or paid. */
export async function setInvoiceStatus(invoice: Invoice, status: InvoiceStatus, by: Person): Promise<void> {
    const known = await invoiceChanges.list()
    if (known.some((one) => one.id === invoice.id)) await invoiceChanges.update(invoice.id, { status, by, at: Date.now() })
    else await invoiceChanges.create({ status, by, at: Date.now() }, invoice.id)
}

/** Charges a failed or open invoice again: most cards go through, and about one in five is declined again. */
export async function retryCharge(invoice: Invoice, by: Person): Promise<InvoiceStatus> {
    const status: InvoiceStatus = seeded(hash(Date.now(), 5))() < 0.8 ? 'paid' : 'failed'
    await setInvoiceStatus(invoice, status, by)
    return status
}

export function setPrefs(patch: Partial<Omit<Prefs, 'id'>>): Promise<Prefs> {
    return prefs.update(DEFAULT_PREFS.id, patch)
}

/** How long the stream waits between events at each pace, in milliseconds: the shortest and the longest. */
export const PACES: Record<Pace, readonly [number, number] | null> = { fast: [1000, 2000], slow: [5000, 10_000], off: null }

/** The most live changes the demo keeps; the stream stops there until the demo data is reset. */
export const LIVE_LIMIT = 5000

/** What the stream tells the app as it sends an event. */
export interface StreamEvent {
    change: Change
    team: Team
    /** What it billed at once, in dollars: a move to a paid plan, or seats bought. */
    billed: number
}

type Listener = (event: StreamEvent) => void
const listeners = new Set<Listener>()

/** Hears each event the live stream sends; returns the call that stops it. */
export function onStream(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

const random = seeded(hash(Date.now(), 1))

/** A team at random that `keep` takes, from the latest `recent` teams. */
function anyOf(state: World, keep: (team: Team) => boolean, recent = Infinity): Team | undefined {
    const from = Math.max(0, state.teams.length - recent)
    for (let tries = 0; tries < 80; tries += 1) {
        const team = state.teams[from + Math.floor(random() * (state.teams.length - from))]
        if (team !== undefined && keep(team)) return team
    }
    return undefined
}

const EVENT_WEIGHT = { signup: 42, order: 33, upgrade: 15, churn: 10 } as const

/** Sends one event of the live stream: a sign-up, an order of seats, an upgrade or a team leaving. */
async function send(state: World): Promise<StreamEvent | undefined> {
    const at = Date.now()
    const kind = pick(random, ['signup', 'order', 'upgrade', 'churn'] as const, (one) => EVENT_WEIGHT[one])
    if (kind === 'signup') {
        const place = placeOf(random)
        const today = dayOf(at)
        made += 1
        const record: TeamRecord = {
            id: `live-${at.toString(36)}-${String(made)}`,
            name: state.names.take(Math.floor(random() * 1_000_000)),
            country: place.name,
            region: place.region,
            owner: REGION_OWNER[place.region],
            created: at,
            project: random() < 0.7 ? today : null,
            invited: random() < 0.4 ? today : null,
            dormant: null,
            live: true,
        }
        const change: Change = {
            id: changeId(),
            team: record.id,
            kind: 'signup',
            at,
            plan: 'free',
            seats: 1 + Math.floor(random() * 4),
            by: null,
            live: true,
        }
        await teams.insert([record])
        await changes.insert([change])
        return { change, team: { ...record, changes: [change], firsts: { paid: null, seats: null, business: null } }, billed: 0 }
    }
    const onPlan = (team: Team, plans: readonly Plan[]) => {
        const now = standing(team, at)
        return now.status === 'active' && plans.includes(now.plan)
    }
    if (kind === 'upgrade') {
        const moving =
            random() < 0.25
                ? anyOf(state, (team) => onPlan(team, ['team']))
                : anyOf(state, (team) => onPlan(team, ['free']) && team.invited !== null, 4000)
        if (moving === undefined) return undefined
        const was = standing(moving, at)
        const plan: Plan = was.plan === 'team' || random() < 0.2 ? 'business' : 'team'
        const seats = plan === 'business' ? Math.max(was.seats, 8 + Math.floor(random() * 16)) : 3 + Math.floor(random() * 8)
        const change = await changePlan(moving, plan, seats, null, true)
        return { change, team: moving, billed: Math.max(0, PRICE[plan] * seats - was.mrr) }
    }
    const team = anyOf(state, (one) => onPlan(one, ['team', 'business']))
    if (team === undefined) return undefined
    const was = standing(team, at)
    if (kind === 'order') {
        const added = was.plan === 'team' ? 1 + Math.floor(random() * 3) : 1 + Math.floor(random() * 5)
        const change = await changePlan(team, was.plan, was.seats + added, null, true)
        return { change, team, billed: Math.round(PRICE[was.plan] * added * 0.5) }
    }
    const change = await cancelPlan(team, null, true)
    return { change, team, billed: 0 }
}

/** Whether the stream is sending, and why not when it is not. */
export type StreamState = 'live' | 'off' | 'hidden' | 'full'

/**
 * Starts the live stream: an event every second or two at the `fast` pace, every five to ten
 * seconds at `slow`, none at `off`, and none while the page is hidden or once the demo holds
 * `LIVE_LIMIT` live changes. `onState` hears where it stands. Returns the call that stops it.
 */
export function startStream(pace: () => Pace, onState: (state: StreamState) => void): () => void {
    let timer: number | undefined
    let stopped = false
    const next = () => {
        if (stopped) return
        const [low, high] = PACES[pace()] ?? [1000, 1000]
        timer = window.setTimeout(() => void tick(), low + random() * (high - low))
    }
    const tick = async () => {
        const state = world.get()
        if (PACES[pace()] === null) onState('off')
        else if (document.hidden) onState('hidden')
        else if (state !== undefined && state.liveCount >= LIVE_LIMIT) onState('full')
        else {
            onState('live')
            const event = state === undefined ? undefined : await send(state).catch(() => undefined)
            if (event !== undefined) for (const listener of listeners) listener(event)
        }
        next()
    }
    next()
    return () => {
        stopped = true
        window.clearTimeout(timer)
    }
}
