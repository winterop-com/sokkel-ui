/** A report's figures as CSV, panel by panel, and the download that hands the file to the person. */

import {
    cohorts,
    countries,
    flows,
    funnel,
    kpis,
    levels,
    revenueByPlan,
    revenueByRegion,
    revenueSeries,
    SIGNUP_FUNNEL,
    topCustomers,
    type Segment,
} from './metrics'
import { PANEL_NAMES, PLAN_NAMES, RATES, REGION_NAMES, REGIONS, dayOf, isoDay, type Currency, type PanelId } from './model'
import { rangeName, type Range, type Span } from './view'
import type { World } from './world'

type Cell = string | number
interface Table {
    head: Cell[]
    rows: Cell[][]
}

/** A cell as CSV writes it: quoted when it holds a comma, a quote or a line break. */
function cell(value: Cell): string {
    const text = typeof value === 'number' ? String(Math.round(value * 100) / 100) : value
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const line = (cells: readonly Cell[]) => cells.map(cell).join(',')

export interface ReportContext {
    world: World
    segment: Segment
    span: Span
    previous: Span
    compare: boolean
    range: Range
    currency: Currency
}

function tableOf(id: PanelId, context: ReportContext): Table {
    const { world, segment, span, previous, compare } = context
    const rate = RATES[context.currency]
    const cash = (dollars: number) => dollars * rate
    switch (id) {
        case 'kpis': {
            const now = kpis(world, segment, span)
            const then = kpis(world, segment, previous)
            const rows: Cell[][] = [
                ['Revenue', cash(now.revenue), cash(then.revenue)],
                ['MRR', cash(now.mrr), cash(then.mrr)],
                ['Active teams', now.active, then.active],
                ['Sign-ups', now.signups, then.signups],
                ['Conversion (%)', now.conversion, then.conversion],
                ['Churn (%)', now.churn, then.churn],
            ]
            return {
                head: compare ? ['Figure', 'Value', 'Period before'] : ['Figure', 'Value'],
                rows: compare ? rows : rows.map((row) => row.slice(0, 2)),
            }
        }
        case 'revenue': {
            const byPlan = revenueByPlan(world, segment, span)
            const then = revenueSeries(world, segment, previous)
            return {
                head: ['Step', PLAN_NAMES.team, PLAN_NAMES.business, 'Total', ...(compare ? ['Period before'] : [])],
                rows: span.buckets.map((bucket, index) => {
                    const team = byPlan.team[index] ?? 0
                    const business = byPlan.business[index] ?? 0
                    return [bucket.label, cash(team), cash(business), cash(team + business), ...(compare ? [cash(then[index] ?? 0)] : [])]
                }),
            }
        }
        case 'funnel': {
            const stages = funnel(world, segment, span.from, span.to, SIGNUP_FUNNEL, 90)
            return {
                head: ['Step', 'Reached', 'Of the first (%)', 'Of the step before (%)'],
                rows: stages.map((stage) => [stage.name, stage.count, stage.ofFirst, stage.ofPrevious]),
            }
        }
        case 'countries':
            return {
                head: ['Country', 'Region', 'Revenue', ...(compare ? ['Period before'] : [])],
                rows: countries(world, segment, span, previous)
                    .sort((left, right) => right.revenue - left.revenue)
                    .map((country) => [
                        country.name,
                        REGION_NAMES[country.region],
                        cash(country.revenue),
                        ...(compare ? [cash(country.before)] : []),
                    ]),
            }
        case 'customers':
            return {
                head: ['Team', 'Country', 'Plan', 'Seats', 'MRR', 'MRR at the start'],
                rows: topCustomers(world, segment, span, 25).map((row) => [
                    row.team.name,
                    row.team.country,
                    PLAN_NAMES[row.plan],
                    row.seats,
                    cash(row.mrr),
                    cash(row.before),
                ]),
            }
        case 'movements': {
            const start = levels(world, segment, [span.from]).mrr[0] ?? 0
            const flow = flows(world, segment, span.from, span.to)
            const net = flow.newMrr + flow.expansion - flow.contraction - flow.churnMrr
            return {
                head: ['Movement', 'MRR'],
                rows: [
                    ['At the start', cash(start)],
                    ['New', cash(flow.newMrr)],
                    ['Expansion', cash(flow.expansion)],
                    ['Contraction', cash(-flow.contraction)],
                    ['Churn', cash(-flow.churnMrr)],
                    ['Net', cash(net)],
                    ['At the end', cash(start + net)],
                ],
            }
        }
        case 'regions': {
            const now = revenueByRegion(world, segment, span.from, span.to)
            const then = revenueByRegion(world, segment, previous.from, previous.to)
            return {
                head: ['Region', 'Revenue', ...(compare ? ['Period before'] : [])],
                rows: REGIONS.filter((region) => segment.region === 'all' || region === segment.region).map((region) => [
                    REGION_NAMES[region],
                    cash(now[region]),
                    ...(compare ? [cash(then[region])] : []),
                ]),
            }
        }
        case 'cohorts': {
            const grid = cohorts(world, segment, span.last)
            return {
                head: ['Cohort', ...grid.months.map((month) => `${month} (%)`)],
                rows: grid.order.map((cohort) => [
                    cohort,
                    ...grid.months.map((month) => grid.cells.find((one) => one.cohort === cohort && one.month === month)?.retained ?? ''),
                ]),
            }
        }
    }
}

/** A report as one CSV file: what it covers, then each panel's figures under its name. */
export function reportCsv(name: string, panels: readonly PanelId[], context: ReportContext): string {
    const { span, segment } = context
    const lines = [
        line([name]),
        line(['Range', `${rangeName(context.range)}, ${isoDay(span.first)} to ${isoDay(span.last)}`]),
        line(['Plan', segment.plan === 'all' ? 'All plans' : PLAN_NAMES[segment.plan]]),
        line(['Region', segment.region === 'all' ? 'Everywhere' : REGION_NAMES[segment.region]]),
        line(['Currency', context.currency]),
        line(['Made', new Date(context.world.now).toISOString()]),
    ]
    for (const id of panels) {
        const table = tableOf(id, context)
        lines.push('', line([PANEL_NAMES[id]]), line(table.head), ...table.rows.map(line))
    }
    return `${lines.join('\n')}\n`
}

/** A file name from a report's name and the day: `monthly-board-report-2026-11-09.csv`. */
export function fileName(name: string, now: number): string {
    const slug =
        name
            .trim()
            .toLowerCase()
            .replaceAll(/[^a-z0-9]+/g, '-')
            .replaceAll(/^-|-$/g, '') || 'report'
    return `${slug}-${isoDay(dayOf(now))}.csv`
}

/** Hands the person a file to keep, as a download. */
export function download(name: string, text: string, type = 'text/csv'): void {
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.rel = 'noopener'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
