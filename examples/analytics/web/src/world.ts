/**
 * Everything the analytics read, as it stands now: the seeded history joined with what the
 * backend keeps, each team with its changes, the invoices those changes bill, and the latest
 * changes for the live feed. It is built again whenever the backend's collections change.
 */

import { useSyncExternalStore } from 'react'

import { changes, invoiceChanges, teamEdits, teams } from './collections'
import {
    DAY,
    PRICE,
    dayOf,
    type Change,
    type Invoice,
    type InvoiceChange,
    type InvoiceStatus,
    type Standing,
    type Team,
    type TeamEdit,
    type TeamRecord,
} from './model'
import { hash, history, seeded, type Names } from './seed'

export interface World {
    /** Counts each build, so work done on one can be kept until the next. */
    version: number
    /** When it was built. */
    now: number
    /** Every team, oldest first. */
    teams: Team[]
    byId: ReadonlyMap<string, Team>
    /** Every invoice, oldest first. */
    invoices: Invoice[]
    invoicesOf: ReadonlyMap<string, Invoice[]>
    /** The latest changes of all, newest first. */
    latest: Change[]
    /** How many changes the live stream and people made, out of the history. */
    liveCount: number
    names: Names
}

/** What a team is at a moment: its plan and seats then, what it paid a month, and whether it is still with us. */
export function standing(team: Team, at: number): Standing {
    let last: Change | undefined
    for (const change of team.changes) {
        if (change.at > at) break
        last = change
    }
    if (last === undefined) return { plan: 'free', seats: 1, mrr: 0, status: 'active' }
    if (last.kind === 'churn') return { plan: last.plan, seats: 0, mrr: 0, status: 'churned' }
    const dormant = last.plan === 'free' && team.dormant !== null && dayOf(at) >= team.dormant
    return { plan: last.plan, seats: last.seats, mrr: PRICE[last.plan] * last.seats, status: dormant ? 'dormant' : 'active' }
}

const CYCLE = 30 * DAY

/** A day's invoices numbered in the order they were made: `INV-261108-014`. */
function numberOf(day: number, index: number): string {
    const date = new Date(day * DAY)
    const yy = String(date.getUTCFullYear() % 100).padStart(2, '0')
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(date.getUTCDate()).padStart(2, '0')
    return `INV-${yy}${mm}${dd}-${String(index + 1).padStart(3, '0')}`
}

interface Bill {
    key: string
    kind: Invoice['kind']
    plan: Invoice['plan']
    seats: number
    amount: number
    at: number
}

/** What a team's changes bill up to `now`: a month of its plan every thirty days, a move to a dearer plan at once, and seats added for what is left of the month. */
function billsOf(team: Team, now: number): Bill[] {
    const bills: Bill[] = []
    let mrr = 0
    let anchor: number | null = null
    let plan: Bill['plan'] = 'free'
    let seats = 0
    const renew = (until: number) => {
        if (anchor === null || mrr === 0) return
        while (anchor + CYCLE <= until) {
            anchor += CYCLE
            bills.push({ key: `${team.id}/r${String(anchor)}`, kind: 'renewal', plan, seats, amount: mrr, at: anchor })
        }
    }
    for (const change of team.changes) {
        renew(change.at)
        const next = change.kind === 'churn' ? 0 : PRICE[change.plan] * change.seats
        if (change.kind === 'churn') {
            anchor = null
        } else if (next > mrr) {
            if (anchor === null || mrr === 0) {
                anchor = change.at
                bills.push({
                    key: `${team.id}/${change.id}`,
                    kind: 'upgrade',
                    plan: change.plan,
                    seats: change.seats,
                    amount: next,
                    at: change.at,
                })
            } else {
                const left = Math.max(1 / 30, (anchor + CYCLE - change.at) / CYCLE)
                bills.push({
                    key: `${team.id}/${change.id}`,
                    kind: change.plan === plan ? 'seats' : 'upgrade',
                    plan: change.plan,
                    seats: change.seats,
                    amount: Math.round((next - mrr) * left),
                    at: change.at,
                })
            }
        }
        mrr = next
        plan = change.plan
        seats = change.seats
    }
    renew(now)
    return bills
}

/** How an invoice stands before anyone touches it: mostly paid, a few failed or refunded, and some of today's renewals still open. */
function statusOf(bill: Bill, today: number): InvoiceStatus {
    const roll = seeded(hash(bill.at, bill.amount, bill.key.length))()
    if (bill.kind !== 'renewal') return 'paid'
    if (dayOf(bill.at) >= today && roll < 0.25) return 'open'
    if (roll < 0.018) return 'failed'
    if (roll < 0.028) return 'refunded'
    return 'paid'
}

const billCache = new Map<string, { key: string; bills: Bill[] }>()

function firstsOf(changes: readonly Change[]): Team['firsts'] {
    let paid: number | null = null
    let more: number | null = null
    let business: number | null = null
    let seats = 0
    for (const change of changes) {
        if (paid === null && change.plan !== 'free' && change.kind !== 'churn') paid = change.at
        if (business === null && change.plan === 'business' && change.kind !== 'churn') business = change.at
        if (more === null && change.kind === 'seats' && change.seats > seats) more = change.at
        seats = change.seats
    }
    return { paid, seats: more, business }
}

let base: ReturnType<typeof history> | undefined

function build(
    version: number,
    records: readonly TeamRecord[],
    kept: readonly Change[],
    statuses: readonly InvoiceChange[],
    edits: readonly TeamEdit[],
): World {
    const now = Date.now()
    if (base === undefined) {
        base = history(now)
        base.changes.sort((left, right) => left.at - right.at)
    }
    const names = base.names
    for (const record of records) names.keep(record.name)
    const byTeam = new Map<string, Change[]>()
    const add = (change: Change) => {
        const list = byTeam.get(change.team)
        if (list === undefined) byTeam.set(change.team, [change])
        else list.push(change)
    }
    for (const change of base.changes) add(change)
    const live = [...kept].sort((left, right) => left.at - right.at)
    for (const change of live) add(change)
    const owners = new Map(edits.map((edit) => [edit.id, edit.owner]))
    const all: Team[] = []
    for (const record of [...base.teams, ...[...records].sort((left, right) => left.created - right.created)]) {
        const own = byTeam.get(record.id) ?? []
        all.push({ ...record, owner: owners.get(record.id) ?? record.owner, changes: own, firsts: firstsOf(own) })
    }
    const byId = new Map(all.map((team) => [team.id, team]))

    const today = dayOf(now)
    const status = new Map(statuses.map((one) => [one.id, one.status]))
    const bills: { bill: Bill; team: Team }[] = []
    for (const team of all) {
        if (team.changes.length < 2) continue
        const last = team.changes[team.changes.length - 1]
        const key = `${String(team.changes.length)}:${last?.id ?? ''}:${String(Math.floor(now / DAY))}`
        let cached = billCache.get(team.id)
        if (cached?.key !== key) {
            cached = { key, bills: billsOf(team, now) }
            billCache.set(team.id, cached)
        }
        for (const bill of cached.bills) bills.push({ bill, team })
    }
    bills.sort((left, right) => left.bill.at - right.bill.at)
    const invoices: Invoice[] = []
    const invoicesOf = new Map<string, Invoice[]>()
    let day = Number.NaN
    let index = 0
    for (const { bill, team } of bills) {
        const on = dayOf(bill.at)
        index = on === day ? index + 1 : 0
        day = on
        const id = numberOf(on, index)
        const invoice: Invoice = {
            id,
            team: team.id,
            name: team.name,
            country: team.country,
            region: team.region,
            kind: bill.kind,
            plan: bill.plan,
            seats: bill.seats,
            amount: bill.amount,
            at: bill.at,
            day: on,
            status: status.get(id) ?? statusOf(bill, today),
        }
        invoices.push(invoice)
        const own = invoicesOf.get(team.id)
        if (own === undefined) invoicesOf.set(team.id, [invoice])
        else own.push(invoice)
    }

    const latest: Change[] = []
    const merged = [...base.changes.slice(-200), ...live].sort((left, right) => right.at - left.at)
    for (const change of merged) {
        if (latest.length >= 80) break
        latest.push(change)
    }
    return { version, now, teams: all, byId, invoices, invoicesOf, latest, liveCount: kept.length, names }
}

type Listener = () => void

/** The world as last built, and who hears it change. */
export const world = (() => {
    let current: World | undefined
    let error: string | undefined
    const listeners = new Set<Listener>()
    let version = 0
    let started = false
    const start = () => {
        if (started) return
        started = true
        let records: TeamRecord[] | undefined
        let kept: Change[] | undefined
        let statuses: InvoiceChange[] | undefined
        let edits: TeamEdit[] | undefined
        let timer: number | undefined
        const rebuild = () => {
            window.clearTimeout(timer)
            timer = window.setTimeout(() => {
                if (records === undefined || kept === undefined || statuses === undefined || edits === undefined) return
                version += 1
                current = build(version, records, kept, statuses, edits)
                for (const listener of listeners) listener()
            }, 20)
        }
        const fail = (failure: unknown) => {
            error = failure instanceof Error ? failure.message : String(failure)
            for (const listener of listeners) listener()
        }
        teams.list().then((rows) => {
            records = rows
            rebuild()
        }, fail)
        changes.list().then((rows) => {
            kept = rows
            rebuild()
        }, fail)
        invoiceChanges.list().then((rows) => {
            statuses = rows
            rebuild()
        }, fail)
        teamEdits.list().then((rows) => {
            edits = rows
            rebuild()
        }, fail)
        teams.subscribe((rows) => {
            records = rows
            rebuild()
        })
        changes.subscribe((rows) => {
            kept = rows
            rebuild()
        })
        invoiceChanges.subscribe((rows) => {
            statuses = rows
            rebuild()
        })
        teamEdits.subscribe((rows) => {
            edits = rows
            rebuild()
        })
    }
    return {
        get: () => current,
        error: () => error,
        subscribe: (listener: Listener) => {
            start()
            listeners.add(listener)
            return () => {
                listeners.delete(listener)
            }
        },
    }
})()

/** The world as it stands, undefined until the backend has first answered, drawn again as it changes. */
export function useWorld(): { world: World | undefined; error: string | undefined } {
    const current = useSyncExternalStore(world.subscribe, world.get)
    const error = useSyncExternalStore(world.subscribe, world.error)
    return { world: current, error }
}
