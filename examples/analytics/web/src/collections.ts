/**
 * What the fake server keeps, in the shared backend: everything that changed after the seeded
 * history, and what people saved. Each collection starts from its seed and after a reset.
 */

import { EMPTY_VIEW } from '@winterop-com/sokkel-ui/lib/list-views'
import { collection } from 'tidevann-shared/backend'

import {
    DAY,
    DEFAULT_PREFS,
    dayOf,
    dayOfDate,
    isoDay,
    type Change,
    type Funnel,
    type Goal,
    type InvoiceChange,
    type InvoiceView,
    type Prefs,
    type Report,
    type TeamEdit,
    type TeamRecord,
} from './model'

/** Teams that signed up while the app was open. */
export const teams = collection<TeamRecord>('teams', () => [])
/** Changes to plans made by the live stream or by a person, after the history. */
export const changes = collection<Change>('changes', () => [])
export const invoiceChanges = collection<InvoiceChange>('invoice-changes', () => [])
export const teamEdits = collection<TeamEdit>('team-edits', () => [])
export const prefs = collection<Prefs>('prefs', () => [{ ...DEFAULT_PREFS, feedSeen: Date.now() }])

export const invoiceViews = collection<InvoiceView>('invoice-views', () => [
    { id: 'all', name: 'All invoices', state: EMPTY_VIEW, locked: true },
    {
        id: 'failed',
        name: 'Failed payments',
        state: {
            ...EMPTY_VIEW,
            filters: [{ field: 'status', operator: 'oneOf', values: ['failed'] }],
            sort: { column: 'date', direction: 'desc' },
        },
    },
    {
        id: 'refunds',
        name: 'Refunds',
        state: { ...EMPTY_VIEW, filters: [{ field: 'status', operator: 'oneOf', values: ['refunded'] }], hidden: ['kind'] },
    },
    {
        id: 'large-business',
        name: 'Large Business invoices',
        state: {
            ...EMPTY_VIEW,
            filters: [
                { field: 'plan', operator: 'oneOf', values: ['business'] },
                { field: 'amount', operator: 'atLeast', values: ['1500'] },
            ],
            sort: { column: 'amount', direction: 'desc' },
        },
    },
])

export const funnels = collection<Funnel>('funnels', () => [
    {
        id: 'signup-to-paid',
        name: 'Sign-up to paid',
        steps: ['visited', 'signedUp', 'project', 'invited', 'upgraded'],
        window: 60,
        by: 'grace',
        updated: Date.now() - 6 * DAY,
    },
    {
        id: 'team-to-business',
        name: 'Team to Business',
        steps: ['signedUp', 'upgraded', 'seats', 'business'],
        window: 365,
        by: 'ada',
        updated: Date.now() - 20 * DAY,
    },
    {
        id: 'activation',
        name: 'Activation',
        steps: ['signedUp', 'project', 'invited'],
        window: 14,
        by: 'linus',
        updated: Date.now() - 2 * DAY,
    },
])

export const reports = collection<Report>('reports', () => [
    {
        id: 'monthly-board',
        name: 'Monthly board report',
        panels: ['kpis', 'revenue', 'movements', 'cohorts', 'countries'],
        by: 'margaret',
        updated: Date.now() - 3 * DAY,
    },
    {
        id: 'weekly-growth',
        name: 'Weekly growth',
        panels: ['kpis', 'funnel', 'regions', 'customers'],
        by: 'grace',
        updated: Date.now() - 9 * DAY,
    },
])

export const goals = collection<Goal>('goals', () => {
    const today = dayOf(Date.now())
    const date = new Date()
    const quarterEnd = dayOfDate(new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + 3, 0))
    const monthStart = dayOfDate(new Date(date.getFullYear(), date.getMonth(), 1))
    const monthEnd = dayOfDate(new Date(date.getFullYear(), date.getMonth() + 1, 0))
    return [
        {
            id: 'mrr-quarter',
            name: 'MRR this quarter',
            metric: 'mrr',
            target: 615_000,
            start: isoDay(today - 40),
            due: isoDay(quarterEnd),
            plan: 'all',
            region: 'all',
            by: 'margaret',
        },
        {
            id: 'business-europe',
            name: 'Business teams in Europe',
            metric: 'paying',
            target: 210,
            start: isoDay(today - 60),
            due: isoDay(quarterEnd),
            plan: 'business',
            region: 'europe',
            by: 'ada',
        },
        {
            id: 'signups-month',
            name: 'Sign-ups this month',
            metric: 'signups',
            target: 700,
            start: isoDay(monthStart),
            due: isoDay(monthEnd),
            plan: 'all',
            region: 'all',
            by: 'grace',
        },
    ]
})
