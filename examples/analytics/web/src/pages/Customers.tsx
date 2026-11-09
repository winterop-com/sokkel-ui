import { DataTable, type DataColumn, type DataSort } from '@winterop-com/sokkel-ui/DataTable'
import { FilterBar, type Filter, type FilterField } from '@winterop-com/sokkel-ui/FilterBar'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { filterRows } from '@winterop-com/sokkel-ui/lib/filters'
import { Banknote, CalendarDays, CircleDot, Earth, Flag, Layers, Users, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'

import { COUNTRIES, PEOPLE, PLAN_NAMES, PLANS, REGION_NAMES, REGIONS, dayOf, isoDay, shortDay, type Standing, type Team } from '../model'
import { PlanChip, STATUSES, useSegment, useSpans, ViewBar } from '../parts'
import { useLoaded } from '../state'
import { go, rangeName } from '../view'
import { standing } from '../world'

/** A team with where it stands now and what it paid in the range. */
interface CustomerRow {
    team: Team
    now: Standing
    paid: number
}

const ICON = 'size-4 text-muted-foreground'

const FIELDS: FilterField<CustomerRow>[] = [
    {
        id: 'plan',
        label: 'Plan',
        type: 'set',
        options: PLANS.map((plan) => ({ value: plan, label: PLAN_NAMES[plan] })),
        icon: <Layers className={ICON} aria-hidden />,
        value: (row) => row.now.plan,
    },
    {
        id: 'status',
        label: 'State',
        type: 'set',
        options: (['active', 'dormant', 'churned'] as const).map((value) => ({ value, label: STATUSES[value]?.label ?? value })),
        icon: <CircleDot className={ICON} aria-hidden />,
        value: (row) => row.now.status,
    },
    {
        id: 'region',
        label: 'Region',
        type: 'set',
        options: REGIONS.map((region) => ({ value: region, label: REGION_NAMES[region] })),
        icon: <Earth className={ICON} aria-hidden />,
        value: (row) => row.team.region,
    },
    {
        id: 'country',
        label: 'Country',
        type: 'set',
        options: COUNTRIES.map((country) => ({ value: country.name })),
        icon: <Flag className={ICON} aria-hidden />,
        value: (row) => row.team.country,
    },
    {
        id: 'owner',
        label: 'Looked after by',
        type: 'set',
        options: PEOPLE.map((person) => ({ value: person })),
        icon: <UserRound className={ICON} aria-hidden />,
        value: (row) => row.team.owner,
    },
    {
        id: 'seats',
        label: 'Seats',
        type: 'number',
        operators: ['atLeast', 'atMost', 'between'],
        icon: <Users className={ICON} aria-hidden />,
        value: (row) => row.now.seats,
    },
    {
        id: 'mrr',
        label: 'MRR',
        type: 'number',
        unit: 'USD',
        operators: ['atLeast', 'atMost', 'between'],
        icon: <Banknote className={ICON} aria-hidden />,
        value: (row) => row.now.mrr,
    },
    {
        id: 'signedUp',
        label: 'Signed up',
        type: 'date',
        icon: <CalendarDays className={ICON} aria-hidden />,
        value: (row) => isoDay(dayOf(row.team.created)),
    },
]

/** Every team: where it stands, what it pays and paid in the range, and who looks after it; a press opens its page. */
export function Customers() {
    const { world, money, href, view } = useLoaded()
    const segment = useSegment()
    const { span } = useSpans()
    const [filters, setFilters] = useState<readonly Filter[]>([])
    const [sort, setSort] = useState<DataSort | null>({ column: 'mrr', direction: 'desc' })
    const [query, setQuery] = useState('')

    const all = useMemo((): CustomerRow[] => {
        const paid = new Map<string, number>()
        for (const invoice of world.invoices) {
            if (invoice.at < span.from || invoice.at >= span.to || invoice.status !== 'paid') continue
            paid.set(invoice.team, (paid.get(invoice.team) ?? 0) + invoice.amount)
        }
        return world.teams
            .map((team) => ({ team, now: standing(team, world.now), paid: paid.get(team.id) ?? 0 }))
            .filter(
                (row) =>
                    (segment.region === 'all' || row.team.region === segment.region) &&
                    (segment.plan === 'all' || row.now.plan === segment.plan),
            )
    }, [world, span, segment])
    const rows = useMemo(() => {
        const kept = filterRows(all, filters, FIELDS)
        const wanted = query.trim().toLowerCase()
        return wanted === '' ? kept : kept.filter((row) => `${row.team.name} ${row.team.country}`.toLowerCase().includes(wanted))
    }, [all, filters, query])

    const columns: DataColumn<CustomerRow>[] = [
        { id: 'team', header: 'Team', width: 'minmax(11rem,1fr)', cell: (row) => row.team.name, sortValue: (row) => row.team.name },
        {
            id: 'plan',
            header: 'Plan',
            width: '6.5rem',
            cell: (row) => <PlanChip plan={row.now.plan} />,
            sortValue: (row) => PLANS.indexOf(row.now.plan),
        },
        {
            id: 'status',
            header: 'State',
            width: '7rem',
            cell: (row) => <StatusChip status={row.now.status} statuses={STATUSES} />,
            sortValue: (row) => row.now.status,
        },
        {
            id: 'seats',
            header: 'Seats',
            width: '4.5rem',
            align: 'end',
            cell: (row) => <span className="tabular-nums">{row.now.seats}</span>,
            sortValue: (row) => row.now.seats,
        },
        {
            id: 'mrr',
            header: 'MRR',
            width: '6rem',
            align: 'end',
            cell: (row) => <span className="tabular-nums">{money(row.now.mrr)}</span>,
            sortValue: (row) => row.now.mrr,
        },
        {
            id: 'paid',
            header: 'Paid in range',
            width: '7.5rem',
            align: 'end',
            cell: (row) => <span className="text-muted-foreground tabular-nums">{money(row.paid)}</span>,
            sortValue: (row) => row.paid,
        },
        { id: 'country', header: 'Country', width: '9rem', cell: (row) => row.team.country, sortValue: (row) => row.team.country },
        {
            id: 'owner',
            header: 'Looked after by',
            width: '8.5rem',
            cell: (row) => (
                <Row gap="2xs" inline>
                    <PersonAvatar name={row.team.owner} size="2xs" />
                    {row.team.owner}
                </Row>
            ),
            sortValue: (row) => row.team.owner,
        },
        {
            id: 'signedUp',
            header: 'Signed up',
            width: '6.5rem',
            cell: (row) => <span className="tabular-nums">{shortDay(dayOf(row.team.created))}</span>,
            sortValue: (row) => row.team.created,
        },
    ]
    const paying = all.filter((row) => row.now.mrr > 0).length
    return (
        <>
            <PageHeader title="Customers" count={`${all.length.toLocaleString('en-US')} teams, ${paying.toLocaleString('en-US')} paying`} />
            <ViewBar />
            <DataTable
                className="min-h-0 flex-1"
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={<FilterBar fields={FIELDS} filters={filters} onFiltersChange={setFilters} />}
                columns={columns}
                rows={rows}
                rowKey={(row) => row.team.id}
                sort={sort}
                onSortChange={setSort}
                onOpen={(row) => go(href(`customers/${row.team.id}`))}
                foot={`Paid in range: ${rangeName(view.range).toLowerCase()}`}
                words={{ rows: (count) => `${count.toLocaleString('en-US')} ${count === 1 ? 'team' : 'teams'}` }}
                minWidth="60rem"
                stackLayout="compact"
                empty="No team matches."
            />
        </>
    )
}
