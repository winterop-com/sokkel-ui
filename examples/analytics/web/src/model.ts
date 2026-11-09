/** What Tidevann's analytics are made of: its plans and prices, the world it sells in, its team, and the shapes the backend keeps. */

import type { SavedView } from '@winterop-com/sokkel-ui/SavedViews'

export const PEOPLE = ['ada', 'grace', 'linus', 'margaret'] as const
export type Person = (typeof PEOPLE)[number]

export const PLANS = ['free', 'team', 'business'] as const
export type Plan = (typeof PLANS)[number]
export const PAID: readonly Plan[] = ['team', 'business']

export const PLAN_NAMES: Record<Plan, string> = { free: 'Free', team: 'Team', business: 'Business' }

/** Dollars a seat costs each month. */
export const PRICE: Record<Plan, number> = { free: 0, team: 12, business: 30 }

/** The chart color token each plan is drawn in. */
export const PLAN_COLORS: Record<Plan, string> = { free: 'chart-3', team: 'chart-2', business: 'chart-4' }

/** The color token the period before is drawn in, beside the period itself. */
export const BEFORE_COLOR = 'muted-foreground'

export const REGIONS = ['europe', 'north-america', 'south-america', 'asia-pacific', 'middle-east-africa'] as const
export type Region = (typeof REGIONS)[number]

export const REGION_NAMES: Record<Region, string> = {
    europe: 'Europe',
    'north-america': 'North America',
    'south-america': 'South America',
    'asia-pacific': 'Asia Pacific',
    'middle-east-africa': 'Middle East and Africa',
}

/** Who looks after the paying teams of each region. */
export const REGION_OWNER: Record<Region, Person> = {
    europe: 'ada',
    'north-america': 'grace',
    'south-america': 'margaret',
    'asia-pacific': 'linus',
    'middle-east-africa': 'margaret',
}

export interface Country {
    name: string
    region: Region
    /** Where its point stands on the map: longitude, latitude. */
    at: [number, number]
    /** Its share of its region's sign-ups. */
    weight: number
}

export const COUNTRIES: Country[] = [
    { name: 'United Kingdom', region: 'europe', at: [-2, 53.5], weight: 16 },
    { name: 'Germany', region: 'europe', at: [10.4, 51.2], weight: 18 },
    { name: 'France', region: 'europe', at: [2.5, 46.6], weight: 12 },
    { name: 'Netherlands', region: 'europe', at: [5.3, 52.1], weight: 8 },
    { name: 'Norway', region: 'europe', at: [9, 61], weight: 7 },
    { name: 'Sweden', region: 'europe', at: [16, 62.5], weight: 8 },
    { name: 'Denmark', region: 'europe', at: [9.5, 56], weight: 5 },
    { name: 'Finland', region: 'europe', at: [26, 63.5], weight: 4 },
    { name: 'Spain', region: 'europe', at: [-3.7, 40.2], weight: 8 },
    { name: 'Italy', region: 'europe', at: [12.5, 42.8], weight: 7 },
    { name: 'Poland', region: 'europe', at: [19.4, 52], weight: 5 },
    { name: 'Ireland', region: 'europe', at: [-8, 53.2], weight: 2 },
    { name: 'United States', region: 'north-america', at: [-98.5, 39.8], weight: 74 },
    { name: 'Canada', region: 'north-america', at: [-106, 56], weight: 16 },
    { name: 'Mexico', region: 'north-america', at: [-102.5, 23.6], weight: 10 },
    { name: 'Brazil', region: 'south-america', at: [-51.9, -10.8], weight: 48 },
    { name: 'Argentina', region: 'south-america', at: [-64, -34], weight: 20 },
    { name: 'Chile', region: 'south-america', at: [-71.2, -35.7], weight: 14 },
    { name: 'Colombia', region: 'south-america', at: [-74.3, 4.6], weight: 18 },
    { name: 'Japan', region: 'asia-pacific', at: [138.3, 36.2], weight: 22 },
    { name: 'Australia', region: 'asia-pacific', at: [134.5, -25.7], weight: 24 },
    { name: 'India', region: 'asia-pacific', at: [78.9, 21], weight: 22 },
    { name: 'Singapore', region: 'asia-pacific', at: [103.8, 1.35], weight: 10 },
    { name: 'South Korea', region: 'asia-pacific', at: [127.8, 36.5], weight: 12 },
    { name: 'New Zealand', region: 'asia-pacific', at: [172.5, -41.5], weight: 10 },
    { name: 'South Africa', region: 'middle-east-africa', at: [24, -29], weight: 30 },
    { name: 'Nigeria', region: 'middle-east-africa', at: [8.7, 9.1], weight: 18 },
    { name: 'Kenya', region: 'middle-east-africa', at: [37.9, 0.2], weight: 16 },
    { name: 'Egypt', region: 'middle-east-africa', at: [30.8, 26.8], weight: 14 },
    { name: 'United Arab Emirates', region: 'middle-east-africa', at: [54, 24], weight: 22 },
]

export const COUNTRY = new Map(COUNTRIES.map((country) => [country.name, country]))

/** What a change to a team's plan was. */
export type ChangeKind = 'signup' | 'upgrade' | 'downgrade' | 'seats' | 'churn'

/** One change to a team's plan: its sign-up, a move between plans, seats bought or let go, or its leaving. */
export interface Change {
    id: string
    team: string
    kind: ChangeKind
    /** The moment, in milliseconds. */
    at: number
    /** The plan after the change; a team that left keeps the plan it left. */
    plan: Plan
    /** Seats after the change; none once the team has left. */
    seats: number
    /** Who made it from the app, or null for the team itself. */
    by: Person | null
    /** Whether the live stream made it, rather than the history or a person. */
    live?: boolean
}

/** A team as the backend keeps one: who it is and the steps it took; its plans are its changes. */
export interface TeamRecord {
    id: string
    name: string
    country: string
    region: Region
    owner: Person
    /** When it signed up, in milliseconds. */
    created: number
    /** The day it made its first project, as a day number, or null. */
    project: number | null
    /** The day it first invited a teammate, or null. */
    invited: number | null
    /** The day a free team stopped using it, or null while it still does. */
    dormant: number | null
    live?: boolean
}

/** A team with its changes in order, and when it first took the steps after signing up that a funnel counts. */
export interface Team extends TeamRecord {
    changes: Change[]
    /** The moments it first paid, first bought more seats and first moved to Business, or null. */
    firsts: { paid: number | null; seats: number | null; business: number | null }
}

/** What a team is now. */
export interface Standing {
    plan: Plan
    seats: number
    /** Dollars a month. */
    mrr: number
    status: 'active' | 'dormant' | 'churned'
}

export type InvoiceStatus = 'paid' | 'open' | 'failed' | 'refunded'

export interface Invoice {
    id: string
    team: string
    name: string
    country: string
    region: Region
    /** What it bills: a month of the plan, a move to a plan, or seats added. */
    kind: 'renewal' | 'upgrade' | 'seats'
    plan: Plan
    seats: number
    amount: number
    at: number
    day: number
    status: InvoiceStatus
}

/** A person's change to an invoice: refunded, marked paid, a charge tried again. */
export interface InvoiceChange {
    id: string
    status: InvoiceStatus
    by: Person
    at: number
}

/** A person's change to a team itself: who looks after it. */
export interface TeamEdit {
    id: string
    owner: Person
}

/** The steps a funnel is built from. */
export const STEPS = ['visited', 'signedUp', 'project', 'invited', 'upgraded', 'seats', 'business'] as const
export type Step = (typeof STEPS)[number]

export const STEP_NAMES: Record<Step, string> = {
    visited: 'Saw the sign-up page',
    signedUp: 'Signed up',
    project: 'Made a project',
    invited: 'Invited a teammate',
    upgraded: 'Moved to a paid plan',
    seats: 'Bought more seats',
    business: 'Moved to Business',
}

export interface Funnel {
    id: string
    name: string
    steps: Step[]
    /** Days after signing up a team has to take every step. */
    window: number
    by: Person
    updated: number
}

/** The panels a report is composed from. */
export const PANELS = ['kpis', 'revenue', 'funnel', 'countries', 'customers', 'movements', 'regions', 'cohorts'] as const
export type PanelId = (typeof PANELS)[number]

export const PANEL_NAMES: Record<PanelId, string> = {
    kpis: 'Key figures',
    revenue: 'Revenue over time',
    funnel: 'Sign-up funnel',
    countries: 'Revenue by country',
    customers: 'Top customers',
    movements: 'MRR movements',
    regions: 'Revenue by region',
    cohorts: 'Retention by cohort',
}

export interface Report {
    id: string
    name: string
    panels: PanelId[]
    by: Person
    updated: number
}

export const METRICS = ['mrr', 'revenue', 'paying', 'active', 'signups'] as const
export type Metric = (typeof METRICS)[number]

export const METRIC_NAMES: Record<Metric, string> = {
    mrr: 'MRR',
    revenue: 'Revenue',
    paying: 'Paying teams',
    active: 'Active teams',
    signups: 'Sign-ups',
}

/** Whether a goal's figure is a level now (MRR) or a sum since the goal started (revenue). */
export const METRIC_SUMS: Record<Metric, boolean> = { mrr: false, revenue: true, paying: false, active: false, signups: true }

export interface Goal {
    id: string
    name: string
    metric: Metric
    target: number
    /** The day it counts from and the day it is due, as `YYYY-MM-DD`. */
    start: string
    due: string
    plan: Plan | 'all'
    region: Region | 'all'
    by: Person
}

export type InvoiceView = SavedView

export type Currency = 'USD' | 'EUR' | 'NOK'

/** What a dollar is in each currency the figures can be read in. */
export const RATES: Record<Currency, number> = { USD: 1, EUR: 0.92, NOK: 10.8 }

export type Pace = 'fast' | 'slow' | 'off'

export interface Prefs {
    id: string
    /** How often the live stream sends an event. */
    pace: Pace
    currency: Currency
    /** The range a dashboard opens on when its address names none. */
    range: string
    /** Whether a dashboard compares with the period before when its address does not say. */
    compare: boolean
    /** A note in the corner for each order of at least this many dollars; 0 for none. */
    bigOrder: number
    /** A note in the corner for each team that leaves. */
    notifyChurn: boolean
    /** The name the workspace goes by in the rail. */
    workspace: string
    /** When the live feed was last marked read; what came after is new. */
    feedSeen: number
}

export const DEFAULT_PREFS: Prefs = {
    id: 'me',
    pace: 'fast',
    currency: 'USD',
    range: '30d',
    compare: true,
    bigOrder: 500,
    notifyChurn: false,
    workspace: 'Tidevann',
    feedSeen: 0,
}

/** A day in milliseconds. */
export const DAY = 86_400_000

/** The local day a moment falls on, counted in days from 1970. */
export function dayOf(at: number): number {
    return Math.floor((at - new Date(at).getTimezoneOffset() * 60_000) / DAY)
}

/** Local midnight of a day number, in milliseconds. */
export function startOf(day: number): number {
    const guess = day * DAY
    return guess + new Date(guess).getTimezoneOffset() * 60_000
}

/** A day number as `YYYY-MM-DD`. */
export function isoDay(day: number): string {
    return new Date(day * DAY).toISOString().slice(0, 10)
}

/** `YYYY-MM-DD` as a day number. */
export function dayFrom(iso: string): number {
    return Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY)
}

/** The local date of a day number, for a calendar. */
export function dateOfDay(day: number): Date {
    const [year = 1970, month = 1, date = 1] = isoDay(day).split('-').map(Number)
    return new Date(year, month - 1, date)
}

/** A calendar date as a day number. */
export function dayOfDate(date: Date): number {
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY)
}

const SHORT_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const LONG_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const CLOCK = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

/** `Nov 8`. */
export const shortDay = (day: number) => SHORT_DAY.format(day * DAY)
/** `Nov 8, 2026`. */
export const longDay = (day: number) => LONG_DAY.format(day * DAY)
/** `Nov 2026`. */
export const monthName = (day: number) => MONTH.format(day * DAY)
/** `14:05`. */
export const clock = (at: number) => CLOCK.format(at)

/** `3 teams`, `1 team`. */
export function counted(count: number, word: string, plural = `${word}s`): string {
    return `${count.toLocaleString('en-US')} ${count === 1 ? word : plural}`
}
