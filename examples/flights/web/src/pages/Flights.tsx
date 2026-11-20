import { DataTable, type DataColumn, type DataSort } from '@winterop-com/sokkel-ui/DataTable'
import { FilterBar, type Filter, type FilterField } from '@winterop-com/sokkel-ui/FilterBar'
import { Freshness } from '@winterop-com/sokkel-ui/Freshness'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { TrackGlyph } from '@winterop-com/sokkel-ui/TrackGlyph'
import { filterRows } from '@winterop-com/sokkel-ui/lib/filters'
import { useMemo, useState } from 'react'

import {
    ALTITUDE_BANDS,
    altitudeBand,
    bandName,
    callsignOf,
    formatAltitude,
    formatHeading,
    formatRate,
    formatSpeed,
    matches,
    nameOf,
    phaseOf,
    PHASE_NAMES,
    type Flight,
    type Phase,
} from '../flights'
import type { Settings } from '../settings'

const PHASES: readonly Phase[] = ['ground', 'climbing', 'level', 'descending']
const SIDES = [
    { value: 'friend', label: 'Tidevann' },
    { value: 'neutral', label: 'Other' },
    { value: 'unknown', label: 'No callsign' },
]

const count = (value: number) => `${String(value)} aircraft`

function fieldsOf(flights: readonly Flight[], units: Settings['units']): FilterField<Flight>[] {
    const types = [...new Set(flights.map((flight) => flight.properties?.aircraftType).filter((type) => typeof type === 'string'))].sort()
    return [
        {
            id: 'band',
            label: 'Altitude',
            type: 'set',
            options: ALTITUDE_BANDS.map((band) => ({ value: band, label: bandName(band, units) })),
            value: (flight) => {
                const band = altitudeBand(flight)
                return band === undefined ? [] : [band]
            },
        },
        {
            id: 'ground',
            label: 'On the ground',
            type: 'set',
            options: [
                { value: 'ground', label: 'On the ground' },
                { value: 'airborne', label: 'Airborne' },
            ],
            value: (flight) => [altitudeBand(flight) === 'ground' ? 'ground' : 'airborne'],
        },
        {
            id: 'phase',
            label: 'Phase',
            type: 'set',
            options: PHASES.map((phase) => ({ value: phase, label: PHASE_NAMES[phase] })),
            value: (flight) => {
                const phase = phaseOf(flight)
                return phase === undefined ? [] : [phase]
            },
        },
        {
            id: 'side',
            label: 'Affiliation',
            type: 'set',
            options: SIDES,
            value: (flight) => [flight.affiliation],
        },
        {
            id: 'type',
            label: 'Type',
            type: 'set',
            options: types.map((type) => ({ value: String(type) })),
            value: (flight) => (typeof flight.properties?.aircraftType === 'string' ? [flight.properties.aircraftType] : []),
        },
    ]
}

function columnsOf(now: number, units: Settings['units']): DataColumn<Flight>[] {
    return [
        {
            id: 'flight',
            header: 'Flight',
            width: 'minmax(9rem,1fr)',
            cell: (flight) => (
                <Row gap="xs">
                    <TrackGlyph kind={flight.kind} affiliation={flight.affiliation} heading={flight.heading} />
                    <span className={callsignOf(flight) === undefined ? 'text-muted-foreground' : undefined}>
                        {callsignOf(flight) ?? 'No callsign'}
                    </span>
                </Row>
            ),
            sortValue: nameOf,
            stack: 'lead',
        },
        {
            id: 'hex',
            header: 'Address',
            width: '6.5rem',
            cell: (flight) => <span className="font-mono">{flight.id}</span>,
            sortValue: (flight) => flight.id,
            stack: 'secondary',
        },
        {
            id: 'type',
            header: 'Type',
            width: '5rem',
            cell: (flight) => <span className="font-mono">{String(flight.properties?.aircraftType ?? '')}</span>,
            sortValue: (flight) => String(flight.properties?.aircraftType ?? ''),
            stack: 'secondary',
        },
        {
            id: 'altitude',
            header: 'Altitude',
            width: '8rem',
            align: 'end',
            cell: (flight) => <span className="tabular-nums">{formatAltitude(flight, units)}</span>,
            sortValue: (flight) => flight.altitude ?? -1,
        },
        {
            id: 'phase',
            header: 'Phase',
            width: '8rem',
            cell: (flight) => {
                const phase = phaseOf(flight)
                return phase === undefined ? '' : PHASE_NAMES[phase]
            },
            sortValue: (flight) => PHASES.indexOf(phaseOf(flight) ?? 'level'),
        },
        {
            id: 'rate',
            header: 'Vertical rate',
            width: '8.5rem',
            align: 'end',
            cell: (flight) => <span className="tabular-nums">{formatRate(flight, units)}</span>,
            sortValue: (flight) => Number(flight.properties?.verticalRate ?? 0),
            stack: 'none',
        },
        {
            id: 'speed',
            header: 'Speed',
            width: '7rem',
            align: 'end',
            cell: (flight) => <span className="tabular-nums">{formatSpeed(flight.speed, units)}</span>,
            sortValue: (flight) => flight.speed ?? -1,
        },
        {
            id: 'track',
            header: 'Track',
            width: '5rem',
            align: 'end',
            cell: (flight) => <span className="tabular-nums">{formatHeading(flight.heading)}</span>,
            sortValue: (flight) => flight.heading ?? -1,
            stack: 'none',
        },
        {
            id: 'squawk',
            header: 'Squawk',
            width: '5.5rem',
            cell: (flight) => <span className="font-mono">{String(flight.properties?.squawk ?? '')}</span>,
            sortValue: (flight) => String(flight.properties?.squawk ?? ''),
            stack: 'none',
        },
        {
            id: 'seen',
            header: 'Seen',
            width: '7rem',
            cell: (flight) => <Freshness at={flight.updatedAt ?? null} now={now} />,
            sortValue: (flight) => -(flight.updatedAt ?? 0),
            stack: 'secondary',
        },
    ]
}

/** Every aircraft the feed names, searched by callsign or address and filtered by band, phase, side and type; a row opens it on the map. */
export function Flights({
    flights,
    now,
    options,
    onOpen,
}: {
    flights: readonly Flight[]
    now: number
    options: Settings
    onOpen: (id: string) => void
}) {
    const [query, setQuery] = useState('')
    const [filters, setFilters] = useState<readonly Filter[]>([])
    const [sort, setSort] = useState<DataSort | null>({ column: 'flight', direction: 'asc' })
    const fields = useMemo(() => fieldsOf(flights, options.units), [flights, options.units])
    const columns = useMemo(() => columnsOf(now, options.units), [now, options.units])
    const shown = useMemo(
        () => filterRows(flights, filters, fields).filter((flight) => matches(flight, query)),
        [flights, filters, fields, query],
    )
    return (
        <>
            <PageHeader title="Flights" count={count(flights.length)} />
            <DataTable
                className="min-h-0 flex-1"
                columns={columns}
                rows={shown}
                rowKey={(flight) => flight.id}
                search={<SearchField value={query} onChange={setQuery} label="Search by callsign or address" />}
                toolbar={<FilterBar fields={fields} filters={filters} onFiltersChange={setFilters} />}
                sort={sort}
                onSortChange={setSort}
                onOpen={(flight) => onOpen(flight.id)}
                empty={flights.length === 0 ? 'No aircraft yet.' : 'No aircraft match.'}
                words={{ rows: count }}
                minWidth="56rem"
            />
        </>
    )
}
