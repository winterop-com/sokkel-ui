/** What several pages draw with: the bar of the range and segment, the span it names, the words for a change, and the feed's rows. */

import type { DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TimeRangePicker } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { VariablesBar, type Variable } from '@winterop-com/sokkel-ui/dashboard/VariablesBar'
import type { StatusMap } from '@winterop-com/sokkel-ui/lib/status'
import { ArrowDownRight, ArrowUpRight, LogOut, Plus, UserPlus, type LucideIcon } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'

import { EVERYONE, type Segment } from './metrics'
import { PLAN_NAMES, PLANS, PRICE, REGION_NAMES, REGIONS, dateOfDay, dayOf, type Change, type Plan, type Region, type Team } from './model'
import { useApp, useLoaded } from './state'
import { fromPicker, pickerValue, previousOf, PRESETS, spanOf, type Span } from './view'

/** The words and colors of plans, team states and invoice states, for `StatusChip`. */
export const STATUSES: StatusMap = {
    free: { label: 'Free', color: 'neutral' },
    team: { label: 'Team', color: 'info' },
    business: { label: 'Business', color: 'good' },
    active: { label: 'Active', color: 'good' },
    dormant: { label: 'Dormant', color: 'neutral' },
    churned: { label: 'Churned', color: 'critical' },
    paid: { label: 'Paid', color: 'good' },
    open: { label: 'Open', color: 'info' },
    failed: { label: 'Failed', color: 'critical' },
    refunded: { label: 'Refunded', color: 'warning' },
}

const ALL = 'all'

/** The range, the comparison and the segment every panel of a page reads, as the address holds them. */
export function ViewBar({ extra = [], end }: { extra?: Variable[]; end?: ReactNode }) {
    const { view, setView, world } = useLoaded()
    const variables: Variable[] = [
        {
            kind: 'select',
            id: 'plan',
            label: 'Plan',
            value: view.plan,
            options: [{ value: ALL, label: 'All plans' }, ...PLANS.map((plan) => ({ value: plan, label: PLAN_NAMES[plan] }))],
            onChange: (plan) => setView({ plan: plan as Plan | 'all' }),
        },
        {
            kind: 'select',
            id: 'region',
            label: 'Region',
            value: view.region,
            options: [{ value: ALL, label: 'Everywhere' }, ...REGIONS.map((region) => ({ value: region, label: REGION_NAMES[region] }))],
            onChange: (region) => setView({ region: region as Region | 'all' }),
        },
        { kind: 'toggle', id: 'compare', label: 'Compare', checked: view.compare, onChange: (compare) => setView({ compare }) },
        ...extra,
    ]
    const today = dateOfDay(dayOf(world.now))
    return (
        <VariablesBar
            variables={variables}
            end={
                <>
                    {end}
                    <TimeRangePicker
                        value={pickerValue(view.range)}
                        onChange={(value) => setView({ range: fromPicker(value) })}
                        presets={PRESETS}
                        today={today}
                        defaultMonth={new Date(today.getFullYear(), today.getMonth() - 1, 1)}
                    />
                </>
            }
        />
    )
}

/** The segment the address names. */
export function useSegment(): Segment {
    const { view } = useApp()
    return useMemo(() => ({ plan: view.plan, region: view.region }), [view.plan, view.region])
}

/** The span the address names and the one before it, moving on as the world does. */
export function useSpans(): { span: Span; previous: Span } {
    const { view, world } = useLoaded()
    return useMemo(() => {
        const span = spanOf(view.range, world.now)
        return { span, previous: previousOf(span) }
    }, [view.range, world.now])
}

/** The change from one figure to another, for a reader: `+4.2%`. */
export function change(now: number, before: number): string | undefined {
    if (before === 0) return now === 0 ? '0%' : undefined
    const percent = ((now - before) / Math.abs(before)) * 100
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`
}

/** The change between two percentages, in points: `+1.2 pts`. */
export function points(now: number, before: number): string {
    const diff = now - before
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pts`
}

/** Where a team stands now, as `StatusChip` says it. */
export function PlanChip({ plan }: { plan: Plan }) {
    return <StatusChip status={plan} statuses={STATUSES} />
}

/** What a change says in the live feed, with the icon and the tone it is drawn in, and what it did to MRR. */
export function describe(
    change: Change,
    team: Team | undefined,
): { text: string; icon: LucideIcon; tone: 'good' | 'info' | 'critical' | 'warning'; mrr: number } {
    const name = team?.name ?? change.team
    const index = team?.changes.findIndex((one) => one.id === change.id) ?? -1
    const before = index > 0 ? team?.changes[index - 1] : undefined
    const was = before === undefined || before.kind === 'churn' ? 0 : PRICE[before.plan] * before.seats
    const now = change.kind === 'churn' ? 0 : PRICE[change.plan] * change.seats
    const by = change.by === null ? '' : `, by ${change.by}`
    switch (change.kind) {
        case 'signup':
            return { text: `${name} signed up from ${team?.country ?? 'somewhere'}`, icon: UserPlus, tone: 'info', mrr: 0 }
        case 'upgrade':
            return {
                text: `${name} moved to ${PLAN_NAMES[change.plan]} with ${String(change.seats)} seats${by}`,
                icon: ArrowUpRight,
                tone: 'good',
                mrr: now - was,
            }
        case 'downgrade':
            return { text: `${name} moved down to ${PLAN_NAMES[change.plan]}${by}`, icon: ArrowDownRight, tone: 'warning', mrr: now - was }
        case 'seats': {
            const added = change.seats - (before?.seats ?? 0)
            return added >= 0
                ? {
                      text: `${name} bought ${String(added)} more ${added === 1 ? 'seat' : 'seats'}${by}`,
                      icon: Plus,
                      tone: 'good',
                      mrr: now - was,
                  }
                : {
                      text: `${name} let ${String(-added)} ${added === -1 ? 'seat' : 'seats'} go${by}`,
                      icon: ArrowDownRight,
                      tone: 'warning',
                      mrr: now - was,
                  }
        }
        case 'churn':
            return { text: `${name} left ${PLAN_NAMES[change.plan]}${by}`, icon: LogOut, tone: 'critical', mrr: -was }
    }
}

const INK: Record<'good' | 'info' | 'critical' | 'warning', string> = {
    good: 'text-good-ink',
    info: 'text-info-ink',
    critical: 'text-critical-ink',
    warning: 'text-warning-ink',
}

/** One row of the live feed. */
export interface FeedRow {
    change: Change
    team: Team | undefined
}

/** The feed's columns: what happened, what it did to MRR, and when. */
export function feedColumns(money: (dollars: number) => string, now: number): DataColumn<FeedRow>[] {
    return [
        {
            id: 'what',
            header: 'What happened',
            width: 'minmax(12rem,1fr)',
            cell: (row) => {
                const said = describe(row.change, row.team)
                return (
                    <span className="flex min-w-0 items-center gap-2">
                        <said.icon className={`size-4 shrink-0 ${INK[said.tone]}`} aria-hidden />
                        <span className="truncate">{said.text}</span>
                    </span>
                )
            },
        },
        {
            id: 'mrr',
            header: 'MRR',
            width: '5.5rem',
            align: 'end',
            cell: (row) => {
                const { mrr } = describe(row.change, row.team)
                if (mrr === 0) return <span className="text-faint">-</span>
                return (
                    <span
                        className={`tabular-nums ${mrr > 0 ? 'text-good-ink' : 'text-critical-ink'}`}
                    >{`${mrr > 0 ? '+' : '-'}${money(Math.abs(mrr))}`}</span>
                )
            },
        },
        {
            id: 'when',
            header: 'When',
            width: '6.5rem',
            align: 'end',
            cell: (row) => (
                <RelativeTime
                    date={row.change.at}
                    now={new Date(Math.max(now, row.change.at))}
                    length="short"
                    className="text-muted-foreground"
                />
            ),
        },
    ]
}

/** The latest changes, of the segment, newest first. */
export function useFeed(count = 40, segment: Segment = EVERYONE): FeedRow[] {
    const { world } = useLoaded()
    return useMemo(
        () =>
            world.latest
                .map((change) => ({ change, team: world.byId.get(change.team) }))
                .filter(
                    (row) =>
                        (segment.region === 'all' || row.team?.region === segment.region) &&
                        (segment.plan === 'all' || row.change.plan === segment.plan),
                )
                .slice(0, count),
        [world, count, segment],
    )
}
