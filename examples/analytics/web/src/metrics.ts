/**
 * The figures every panel draws, worked out from the world for a span and a segment: revenue,
 * MRR, teams, conversion and churn, as levels at moments and as flows over a stretch of time; the
 * sign-up funnel and any funnel built from steps; revenue by country and region; the top customers;
 * the MRR movements; retention by cohort; and a team's usage.
 */

import {
    COUNTRIES,
    DAY,
    PAID,
    PLANS,
    PRICE,
    REGIONS,
    STEP_NAMES,
    dayOf,
    monthName,
    startOf,
    type ChangeKind,
    type Invoice,
    type Plan,
    type Region,
    type Step,
    type Team,
} from './model'
import { hash, seeded } from './seed'
import type { Bucket, Span } from './view'
import type { World } from './world'

export interface Segment {
    plan: Plan | 'all'
    region: Region | 'all'
}

export const EVERYONE: Segment = { plan: 'all', region: 'all' }

/** What a team is between two changes, as the figures count it. */
interface State {
    plan: Plan
    mrr: number
    active: number
    paying: number
}

/** One change to a team, with what it was before and after. */
interface Entry {
    at: number
    team: Team
    kind: ChangeKind | 'dormant'
    before: State
    after: State
    /** Whether the team paid for the first time with it. */
    firstPaid: boolean
}

const NONE: State = { plan: 'free', mrr: 0, active: 0, paying: 0 }

const ledgers = new WeakMap<World, Entry[]>()

/** Every change of every team, oldest first, each with the state before and after it. */
function ledgerOf(world: World): Entry[] {
    const known = ledgers.get(world)
    if (known !== undefined) return known
    const entries: Entry[] = []
    for (const team of world.teams) {
        let state = NONE
        let paid = false
        let last = 0
        for (const change of team.changes) {
            const after: State =
                change.kind === 'churn'
                    ? { plan: change.plan, mrr: 0, active: 0, paying: 0 }
                    : {
                          plan: change.plan,
                          mrr: PRICE[change.plan] * change.seats,
                          active: 1,
                          paying: change.plan === 'free' ? 0 : 1,
                      }
            const firstPaid = !paid && after.paying === 1
            if (after.paying === 1) paid = true
            entries.push({ at: change.at, team, kind: change.kind, before: state, after, firstPaid })
            state = after
            last = change.at
        }
        if (team.dormant !== null && state.plan === 'free' && state.active === 1) {
            const at = startOf(team.dormant)
            if (at > last && at <= world.now)
                entries.push({ at, team, kind: 'dormant', before: state, after: { ...state, active: 0 }, firstPaid: false })
        }
    }
    entries.sort((left, right) => left.at - right.at)
    ledgers.set(world, entries)
    return entries
}

/** The first entry at or after a moment. */
function firstAt(entries: readonly Entry[], at: number): number {
    let low = 0
    let high = entries.length
    while (low < high) {
        const middle = (low + high) >> 1
        if ((entries[middle]?.at ?? 0) < at) low = middle + 1
        else high = middle
    }
    return low
}

const inRegion = (team: { region: Region }, segment: Segment) => segment.region === 'all' || team.region === segment.region
const counts = (state: State, segment: Segment) => segment.plan === 'all' || state.plan === segment.plan

/** MRR, paying teams and active teams at each of the moments, which come in order. */
export function levels(world: World, segment: Segment, moments: readonly number[]): { mrr: number[]; paying: number[]; active: number[] } {
    const entries = ledgerOf(world)
    const mrr: number[] = []
    const paying: number[] = []
    const active: number[] = []
    let sum = { mrr: 0, paying: 0, active: 0 }
    let index = 0
    for (const moment of moments) {
        while (index < entries.length && (entries[index]?.at ?? Infinity) <= moment) {
            const entry = entries[index] as Entry
            index += 1
            if (!inRegion(entry.team, segment)) continue
            const was = counts(entry.before, segment)
            const now = counts(entry.after, segment)
            sum = {
                mrr: sum.mrr - (was ? entry.before.mrr : 0) + (now ? entry.after.mrr : 0),
                paying: sum.paying - (was ? entry.before.paying : 0) + (now ? entry.after.paying : 0),
                active: sum.active - (was ? entry.before.active : 0) + (now ? entry.after.active : 0),
            }
        }
        mrr.push(sum.mrr)
        paying.push(sum.paying)
        active.push(sum.active)
    }
    return { mrr, paying, active }
}

/** What happened over a stretch of time. */
export interface Flows {
    signups: number
    /** Teams that paid for the first time. */
    converted: number
    /** Paying teams that left. */
    churned: number
    /** MRR from teams that started paying, from leaving, and from teams that pay more or less than before. */
    newMrr: number
    expansion: number
    contraction: number
    churnMrr: number
}

export function flows(world: World, segment: Segment, from: number, to: number): Flows {
    const entries = ledgerOf(world)
    const out: Flows = { signups: 0, converted: 0, churned: 0, newMrr: 0, expansion: 0, contraction: 0, churnMrr: 0 }
    for (let index = firstAt(entries, from); index < entries.length; index += 1) {
        const entry = entries[index] as Entry
        if (entry.at >= to) break
        if (!inRegion(entry.team, segment)) continue
        if (entry.kind === 'signup') {
            out.signups += 1
            continue
        }
        const was = counts(entry.before, segment) ? entry.before.mrr : 0
        const now = counts(entry.after, segment) ? entry.after.mrr : 0
        if (entry.firstPaid && counts(entry.after, segment)) out.converted += 1
        if (entry.kind === 'churn' && was > 0) {
            out.churned += 1
            out.churnMrr += was
        } else if (was === 0 && now > 0) out.newMrr += now
        else if (now > was) out.expansion += now - was
        else if (now < was && now > 0) out.contraction += was - now
        else if (now === 0 && was > 0) out.churnMrr += was
    }
    return out
}

/** The paid invoices of a segment between two moments, as the invoices are sorted by time. */
function paidIn(world: World, segment: Segment, from: number, to: number, each: (invoice: Invoice) => void): void {
    const list = world.invoices
    let low = 0
    let high = list.length
    while (low < high) {
        const middle = (low + high) >> 1
        if ((list[middle]?.at ?? 0) < from) low = middle + 1
        else high = middle
    }
    for (let index = low; index < list.length; index += 1) {
        const invoice = list[index] as Invoice
        if (invoice.at >= to) break
        if (invoice.status !== 'paid') continue
        if (segment.region !== 'all' && invoice.region !== segment.region) continue
        if (segment.plan !== 'all' && invoice.plan !== segment.plan) continue
        each(invoice)
    }
}

export function revenue(world: World, segment: Segment, from: number, to: number): number {
    let sum = 0
    paidIn(world, segment, from, to, (invoice) => {
        sum += invoice.amount
    })
    return sum
}

/** Refunds between two moments: how many, and how much. */
export function refunds(world: World, segment: Segment, from: number, to: number): { count: number; amount: number } {
    let count = 0
    let amount = 0
    for (const invoice of world.invoices) {
        if (invoice.at < from || invoice.at >= to || invoice.status !== 'refunded') continue
        if (!inRegion(invoice, segment) || (segment.plan !== 'all' && invoice.plan !== segment.plan)) continue
        count += 1
        amount += invoice.amount
    }
    return { count, amount }
}

/** A bucket that has not begun yet draws no figure. */
const later = (bucket: Bucket, now: number) => bucket.from > now

/** Revenue in each bucket for each paid plan. */
export function revenueByPlan(world: World, segment: Segment, span: Span): Record<'team' | 'business', (number | null)[]> {
    const team: (number | null)[] = []
    const business: (number | null)[] = []
    for (const bucket of span.buckets) {
        if (later(bucket, world.now)) {
            team.push(null)
            business.push(null)
            continue
        }
        let onTeam = 0
        let onBusiness = 0
        paidIn(world, segment, bucket.from, Math.min(bucket.to, world.now + 1), (invoice) => {
            if (invoice.plan === 'business') onBusiness += invoice.amount
            else onTeam += invoice.amount
        })
        team.push(onTeam)
        business.push(onBusiness)
    }
    return { team, business }
}

/** Revenue in each bucket, the last one up to the span's end. */
export function revenueSeries(world: World, segment: Segment, span: Span): (number | null)[] {
    return span.buckets.map((bucket) =>
        later(bucket, world.now) ? null : revenue(world, segment, bucket.from, Math.min(bucket.to, span.to)),
    )
}

/** The key figures of a span, each with its trend over the span's buckets. */
export interface Kpis {
    revenue: number
    mrr: number
    active: number
    paying: number
    signups: number
    /** Teams that paid for the first time, as a share of the teams that signed up, in percent. */
    conversion: number
    /** Paying teams that left, as a share of those paying at the start, in percent. */
    churn: number
    trend: { revenue: number[]; mrr: number[]; active: number[]; signups: number[]; conversion: number[]; churn: number[] }
}

const share = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100)

export function kpis(world: World, segment: Segment, span: Span): Kpis {
    const shown = span.buckets.filter((bucket) => !later(bucket, world.now))
    const ends = shown.map((bucket) => Math.min(bucket.to, span.to))
    const level = levels(world, segment, [span.from, ...ends, span.to])
    const start = { mrr: level.mrr[0] ?? 0, paying: level.paying[0] ?? 0 }
    const end = {
        mrr: level.mrr[level.mrr.length - 1] ?? 0,
        active: level.active[level.active.length - 1] ?? 0,
        paying: level.paying[level.paying.length - 1] ?? 0,
    }
    const flow = flows(world, segment, span.from, span.to)
    const perBucket = shown.map((bucket) => flows(world, segment, bucket.from, Math.min(bucket.to, span.to)))
    const payingAt = level.paying.slice(0, -1)
    return {
        revenue: revenue(world, segment, span.from, span.to),
        mrr: end.mrr,
        active: end.active,
        paying: end.paying,
        signups: flow.signups,
        conversion: share(flow.converted, flow.signups),
        churn: share(flow.churned, start.paying),
        trend: {
            revenue: shown.map((bucket) => revenue(world, segment, bucket.from, Math.min(bucket.to, span.to))),
            mrr: level.mrr.slice(1, -1),
            active: level.active.slice(1, -1),
            signups: perBucket.map((one) => one.signups),
            conversion: perBucket.map((one) => share(one.converted, one.signups)),
            churn: perBucket.map((one, index) => share(one.churned, payingAt[index] ?? 0)),
        },
    }
}

/** How many people saw the sign-up page for every team that signed up, on a day in a region: about 2.5 to 4. */
const visitsPerSignup = (day: number, region: number) => 2.5 + 1.5 * seeded(hash(day, region, 17))()

/** The moments a team took each funnel step, or null for a step it has not taken. */
function stepAt(team: Team, step: Step, plan: Plan | 'all'): number | null {
    switch (step) {
        case 'visited':
        case 'signedUp':
            return team.created
        case 'project':
            return team.project === null ? null : Math.max(team.created, startOf(team.project) + 12 * 3_600_000)
        case 'invited':
            return team.invited === null ? null : Math.max(team.created, startOf(team.invited) + 14 * 3_600_000)
        case 'upgraded':
            if (plan === 'business') return team.firsts.business
            if (plan === 'team') return team.changes.find((change) => change.plan === 'team' && change.kind !== 'churn')?.at ?? null
            return team.firsts.paid
        case 'seats':
            return team.firsts.seats
        case 'business':
            return team.firsts.business
    }
}

/** One stage of a funnel: its step, how many reached it, and its share of the first and of the stage before. */
export interface Stage {
    step: Step
    name: string
    count: number
    ofFirst: number
    ofPrevious: number
}

/**
 * A funnel over the teams that signed up in a stretch of time: each step counts the teams that took
 * it after the step before, within `window` days of signing up. Visiting the site, as a first step,
 * counts the visitors of those days.
 */
export function funnel(world: World, segment: Segment, from: number, to: number, steps: readonly Step[], window: number): Stage[] {
    const cohort = world.teams.filter((team) => team.created >= from && team.created < to && inRegion(team, segment))
    const reach: number[] = steps.map(() => 0)
    for (const team of cohort) {
        let previous = team.created
        const limit = team.created + window * DAY
        for (const [index, step] of steps.entries()) {
            if (step === 'visited') {
                if (index === 0) continue
                break
            }
            const at = stepAt(team, step, segment.plan)
            if (at === null || at < previous || at > limit || at > world.now) break
            reach[index] = (reach[index] ?? 0) + 1
            previous = at
        }
    }
    if (steps[0] === 'visited') {
        const signed = new Map<string, number>()
        for (const team of cohort) {
            const key = `${String(dayOf(team.created))}:${team.region}`
            signed.set(key, (signed.get(key) ?? 0) + 1)
        }
        let visits = 0
        for (const [key, count] of signed) {
            const [day = '0', region = 'europe'] = key.split(':')
            visits += Math.round(count * visitsPerSignup(Number(day), REGIONS.indexOf(region as Region)))
        }
        reach[0] = visits
    }
    const first = reach[0] ?? 0
    return steps.map((step, index) => {
        const count = reach[index] ?? 0
        const before = index === 0 ? count : (reach[index - 1] ?? 0)
        return { step, name: STEP_NAMES[step], count, ofFirst: share(count, first), ofPrevious: share(count, before) }
    })
}

/** The steps of the sign-up funnel on the overview. */
export const SIGNUP_FUNNEL: readonly Step[] = ['visited', 'signedUp', 'project', 'invited', 'upgraded']

/** Paid revenue by country between two moments, with the country's place and its region. */
export function revenueByCountry(world: World, segment: Segment, from: number, to: number): Map<string, number> {
    const totals = new Map<string, number>()
    paidIn(world, segment, from, to, (invoice) => totals.set(invoice.country, (totals.get(invoice.country) ?? 0) + invoice.amount))
    return totals
}

/** Paid revenue by region between two moments. */
export function revenueByRegion(world: World, segment: Segment, from: number, to: number): Record<Region, number> {
    const totals = Object.fromEntries(REGIONS.map((region) => [region, 0])) as Record<Region, number>
    paidIn(world, segment, from, to, (invoice) => {
        totals[invoice.region] += invoice.amount
    })
    return totals
}

/** One of the teams paying most. */
export interface TopCustomer {
    team: Team
    plan: Plan
    seats: number
    mrr: number
    /** What it paid a month at the span's start. */
    before: number
}

/** The teams paying most at the span's end, with what they paid at its start. */
export function topCustomers(world: World, segment: Segment, span: Span, count = 8): TopCustomer[] {
    const found: TopCustomer[] = []
    for (const team of world.teams) {
        if (!inRegion(team, segment) || team.firsts.paid === null || team.firsts.paid > span.to) continue
        let now: { plan: Plan; seats: number; mrr: number } | undefined
        let before = 0
        for (const change of team.changes) {
            if (change.at <= span.from) before = change.kind === 'churn' ? 0 : PRICE[change.plan] * change.seats
            if (change.at <= span.to)
                now =
                    change.kind === 'churn' ? undefined : { plan: change.plan, seats: change.seats, mrr: PRICE[change.plan] * change.seats }
        }
        if (now === undefined || now.mrr === 0) continue
        if (segment.plan !== 'all' && now.plan !== segment.plan) continue
        found.push({ team, ...now, before })
    }
    return found.sort((left, right) => right.mrr - left.mrr).slice(0, count)
}

/** Each country's point, with its revenue now and before, for the map. */
export interface CountryFigure {
    name: string
    region: Region
    at: [number, number]
    revenue: number
    before: number
}

export function countries(world: World, segment: Segment, span: Span, previous: Span): CountryFigure[] {
    const now = revenueByCountry(world, segment, span.from, span.to)
    const then = revenueByCountry(world, segment, previous.from, previous.to)
    return COUNTRIES.filter((country) => inRegion(country, segment)).map((country) => ({
        name: country.name,
        region: country.region,
        at: country.at,
        revenue: now.get(country.name) ?? 0,
        before: then.get(country.name) ?? 0,
    }))
}

/** One cell of the retention grid: a cohort, the months since it first paid, and the share still paying. */
export type CohortCell = {
    cohort: string
    month: string
    retained: number
}

/**
 * Retention by cohort: the teams that first paid in each of the last twelve months, and the share
 * of them still paying each month after. A month that has not come yet has no cell.
 */
export function cohorts(world: World, segment: Segment, last: number): { cells: CohortCell[]; order: string[]; months: string[] } {
    const end = new Date(last * DAY)
    const months = Array.from({ length: 12 }, (_, index) => `Month ${String(index)}`)
    const order: string[] = []
    const cells: CohortCell[] = []
    for (let back = 11; back >= 0; back -= 1) {
        const first = Math.floor(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - back, 1) / DAY)
        const next = Math.floor(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - back + 1, 1) / DAY)
        const name = monthName(first)
        order.push(name)
        const members = world.teams.filter((team) => {
            const paid = team.firsts.paid
            if (paid === null || !inRegion(team, segment)) return false
            const day = dayOf(paid)
            if (day < first || day >= next) return false
            if (segment.plan === 'all') return true
            return team.changes.find((change) => change.at === paid)?.plan === segment.plan
        })
        if (members.length === 0) continue
        for (let month = 0; month < 12; month += 1) {
            // Each team is read that many months after its own first payment, if that has come yet.
            let counted = 0
            let still = 0
            for (const team of members) {
                const moment = (team.firsts.paid ?? 0) + month * 30 * DAY
                if (moment > world.now) continue
                counted += 1
                let paying = false
                for (const change of team.changes) {
                    if (change.at > moment) break
                    paying = change.kind !== 'churn' && change.plan !== 'free'
                }
                if (paying) still += 1
            }
            if (counted === 0) break
            cells.push({ cohort: name, month: months[month] ?? '', retained: Math.round((still / counted) * 1000) / 10 })
        }
    }
    return { cells, order, months }
}

/** A team's members at work each day of a span: most of its seats on a weekday, fewer at weekends, none once it has left or gone quiet. */
export function usage(team: Team, span: Span, now: number): { labels: string[]; members: (number | null)[]; seats: (number | null)[] } {
    const labels: string[] = []
    const members: (number | null)[] = []
    const seats: (number | null)[] = []
    for (let day = span.first; day <= span.last; day += 1) {
        labels.push(new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(day * DAY))
        const at = Math.min(startOf(day + 1) - 1, now)
        if (startOf(day) > now || at < team.created) {
            members.push(null)
            seats.push(null)
            continue
        }
        let held = 0
        let gone = false
        for (const change of team.changes) {
            if (change.at > at) break
            held = change.seats
            gone = change.kind === 'churn'
        }
        const quiet = team.dormant !== null && day >= team.dormant
        const weekday = new Date(day * DAY).getUTCDay()
        const weekend = weekday === 0 || weekday === 6
        const busy = (weekend ? 0.25 : 0.62) + 0.25 * seeded(hash(day, team.created % 9973))()
        members.push(gone || quiet ? 0 : Math.max(held > 0 ? 1 : 0, Math.round(held * busy)))
        seats.push(gone ? 0 : held)
    }
    return { labels, members, seats }
}

/** Every plan's share of the MRR at a moment. */
export function mrrByPlan(world: World, segment: Segment, at: number): Record<Plan, number> {
    const out = Object.fromEntries(PLANS.map((plan) => [plan, 0])) as Record<Plan, number>
    for (const plan of PAID) out[plan] = levels(world, { ...segment, plan }, [at]).mrr[0] ?? 0
    return out
}
