import type { Meta, StoryObj } from '@storybook/react-vite'
import { Crosshair, History, List, Map as MapIcon, Pause, Plane, Settings } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { FilterBar, type Filter, type FilterField } from '@winterop-com/sokkel-ui/FilterBar'
import { Freshness } from '@winterop-com/sokkel-ui/Freshness'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TrackCard } from '@winterop-com/sokkel-ui/TrackCard'
import { TrackGlyph } from '@winterop-com/sokkel-ui/TrackGlyph'
import { TrackRoster, type TrackRosterItem } from '@winterop-com/sokkel-ui/TrackRoster'
import { filterRows } from '@winterop-com/sokkel-ui/lib/filters'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { formatCoordinates } from '@winterop-com/sokkel-ui-maps/geodesy'
import { MapCompass } from '@winterop-com/sokkel-ui-maps/MapCompass'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapFollow } from '@winterop-com/sokkel-ui-maps/MapFollow'
import { MapGoTo } from '@winterop-com/sokkel-ui-maps/MapGoTo'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapRuler } from '@winterop-com/sokkel-ui-maps/MapRuler'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { TrackLayer, trackCounts, trackLegendEntries, type Track } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import {
    ALTITUDE_BANDS,
    altitudeBand,
    parseReadsb,
    verticalTrend,
    type AltitudeBand,
    type VerticalTrend,
} from '@winterop-com/sokkel-ui-tracking/adsb'
import { FOOT, KNOT, type Track as Flight, type TrackAffiliation } from '@winterop-com/sokkel-ui-tracking/track'
import { FLIGHTS_NOW, FLIGHTS_POINT } from '../fixtures/flights'
import { TidevannMark } from '../fixtures/TidevannMark'

const BAND_COLORS: Record<AltitudeBand, string> = {
    ground: 'var(--muted-foreground)',
    low: 'var(--chart-3)',
    medium: 'var(--chart-2)',
    high: 'var(--chart-4)',
}
const BAND_NAMES: Record<AltitudeBand, string> = {
    ground: 'On the ground',
    low: 'Below 10,000 ft',
    medium: '10,000 to 25,000 ft',
    high: 'Above 25,000 ft',
}
const PHASE_NAMES: Record<VerticalTrend | 'ground', string> = {
    ground: 'On the ground',
    climbing: 'Climbing',
    level: 'Cruising',
    descending: 'Descending',
}
const SIDES: readonly TrackAffiliation[] = ['friend', 'unknown']
const SIDE_WORDS = { friend: 'Tidevann', unknown: 'No callsign' }

/** The flights of the readsb answer: Tidevann's own are friends, one giving no callsign is unknown. */
const FLIGHTS: readonly Flight[] = parseReadsb(FLIGHTS_POINT, {
    classify: (track) => (typeof track.properties?.callsign === 'string' ? 'friend' : 'unknown'),
})

const nameOf = (flight: Flight) => (typeof flight.properties?.callsign === 'string' ? flight.properties.callsign : flight.id.toUpperCase())
const phaseOf = (flight: Flight) => (altitudeBand(flight) === 'ground' ? 'ground' : verticalTrend(flight))
const feet = (flight: Flight) =>
    altitudeBand(flight) === 'ground' ? 'Ground' : `${Math.round((flight.altitude ?? 0) / FOOT).toLocaleString('en-US')} ft`
const knots = (flight: Flight) => (flight.speed === undefined ? '' : `${String(Math.round(flight.speed / KNOT))} kn`)
const heading = (flight: Flight) => (flight.heading === undefined ? '' : `${String(Math.round(flight.heading)).padStart(3, '0')}°`)
const motionOf = (flight: Flight) => [knots(flight), heading(flight), feet(flight)].filter((part) => part !== '').join(' · ')

function rosterItem(flight: Flight): TrackRosterItem {
    const phase = phaseOf(flight)
    return {
        id: flight.id,
        name: nameOf(flight),
        code: typeof flight.properties?.callsign === 'string' ? flight.id : undefined,
        kind: flight.kind,
        affiliation: flight.affiliation,
        heading: flight.heading,
        states: phase === undefined ? undefined : [PHASE_NAMES[phase]],
        detail: motionOf(flight),
        updatedAt: flight.updatedAt ?? null,
    }
}

const GROUPS = (active: string): RailGroup[] =>
    [
        {
            id: 'watch',
            entries: [
                { id: 'map', label: 'Map', icon: MapIcon, href: '#', description: 'Aircraft in the area' },
                { id: 'flights', label: 'Flights', icon: Plane, href: '#', description: 'Searched and filtered', count: 14 },
                { id: 'history', label: 'History', icon: History, href: '#', description: 'The last hour played back' },
            ],
        },
        { id: 'system', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '#', description: 'Source, map, units' }] },
    ].map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry, active: entry.id === active })) }))

/** The details of one flight: its card, then what the feed says of it. */
function Details({ flight }: { flight: Flight }) {
    const item = rosterItem(flight)
    const band = altitudeBand(flight)
    return (
        <>
            <TrackCard
                name={item.name}
                code={item.code}
                kind={item.kind}
                affiliation={item.affiliation}
                heading={item.heading}
                states={['Simulated', ...(item.states ?? [])]}
                detail={item.detail}
                updatedAt={item.updatedAt}
                now={FLIGHTS_NOW}
            />
            <DescriptionList
                size="sm"
                items={[
                    { term: 'Altitude', value: feet(flight), numeric: true },
                    { term: 'Band', value: band === undefined ? undefined : BAND_NAMES[band] },
                    { term: 'Speed', value: knots(flight), numeric: true },
                    { term: 'Track', value: heading(flight), numeric: true },
                    { term: 'Squawk', value: String(flight.properties?.squawk ?? ''), code: true },
                    { term: 'Type', value: String(flight.properties?.aircraftType ?? ''), code: true },
                    { term: 'Address', value: flight.id, code: true },
                    { term: 'Position', value: formatCoordinates([flight.lon, flight.lat]), code: true },
                ]}
            />
        </>
    )
}

/** The frame every page of the watch stands in: the rail, the top bar with Pause, and the foot strip counting the aircraft. */
function Frame({ active, trail, panel, children }: { active: string; trail: string; panel?: ReactNode; children: ReactNode }) {
    const airborne = FLIGHTS.filter((flight) => altitudeBand(flight) !== 'ground').length
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        markHref="#"
                        name="Flight watch"
                        groups={GROUPS(active)}
                        foot={<AccountMenu name="margaret" where="tidevann.example.org" />}
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Flight watch', href: '#' }, { label: trail }]}
                        actions={
                            <Button variant="ghost" size="sm">
                                <Pause aria-hidden />
                                Pause
                            </Button>
                        }
                    />
                }
                panel={panel}
                foot={
                    <StatusLine live tone="live" note="Simulated, 14:30:00 UTC">
                        <StatusItem label="airborne">{airborne}</StatusItem>
                        <StatusItem label="on the ground">{FLIGHTS.length - airborne}</StatusItem>
                    </StatusLine>
                }
            >
                {children}
            </Shell>
        </TooltipProvider>
    )
}

function MapPage({ colorBy, follow = false }: { colorBy: 'altitude' | 'affiliation'; follow?: boolean }) {
    const [selected, setSelected] = useState<string | null>('f07a01')
    const [followed, setFollowed] = useState<string | null>(follow ? 'f07a01' : null)
    const [tab, setTab] = useState('flight')
    const tracks: Track[] = useMemo(
        () =>
            FLIGHTS.map((flight) => ({
                id: flight.id,
                position: [flight.lon, flight.lat],
                heading: flight.heading,
                affiliation: flight.affiliation,
                kind: flight.kind,
                label: nameOf(flight),
                band: colorBy === 'altitude' ? altitudeBand(flight) : undefined,
            })),
        [colorBy],
    )
    const picked = FLIGHTS.find((flight) => flight.id === selected)
    const following = FLIGHTS.find((flight) => flight.id === followed)
    const panel = (
        <SidePanel
            active={tab}
            onActiveChange={setTab}
            tabs={[
                {
                    id: 'flight',
                    label: 'Flight',
                    icon: Plane,
                    content:
                        picked === undefined ? null : (
                            <PanelSection
                                title={nameOf(picked)}
                                actions={
                                    <Button
                                        variant={followed === picked.id ? 'secondary' : 'outline'}
                                        size="sm"
                                        onClick={() => setFollowed(followed === picked.id ? null : picked.id)}
                                    >
                                        <Crosshair aria-hidden />
                                        {followed === picked.id ? 'Following' : 'Follow'}
                                    </Button>
                                }
                            >
                                <Details flight={picked} />
                            </PanelSection>
                        ),
                },
                {
                    id: 'in-view',
                    label: `In view (${String(FLIGHTS.length)})`,
                    icon: List,
                    content: (
                        <TrackRoster
                            framed={false}
                            className="h-full"
                            tracks={FLIGHTS.map(rosterItem)}
                            now={FLIGHTS_NOW}
                            selected={selected}
                            onSelect={(id) => {
                                setSelected(id)
                                setTab('flight')
                            }}
                        />
                    ),
                },
            ]}
        />
    )
    return (
        <Frame active="map" trail={picked === undefined ? 'Map' : nameOf(picked)} panel={panel}>
            <MapView
                label="Flight watch"
                defaultBasemap={WORLD_BASEMAP}
                basemaps={[WORLD_BASEMAP]}
                camera={{ center: [6.8, 58.9], zoom: 4.8 }}
                selected={selected}
                onSelectedChange={(id) => setSelected(id)}
                rotate
                framed={false}
                className="h-full"
            >
                <TrackLayer id="flights" tracks={tracks} bands={colorBy === 'altitude' ? BAND_COLORS : undefined} />
                <MapRuler unit="nmi" />
                <MapCompass />
                <MapGoTo />
                <MapCoordinates scale unit="nmi" />
                {following !== undefined && (
                    <MapFollow
                        position={[following.lon, following.lat]}
                        name={nameOf(following)}
                        zoom={7}
                        onRelease={() => setFollowed(null)}
                    />
                )}
                <MapOverlay corner="bottom-right">
                    {colorBy === 'altitude' ? (
                        <MapLegend
                            title="Altitude"
                            entries={ALTITUDE_BANDS.map((band) => ({ label: BAND_NAMES[band], color: BAND_COLORS[band] }))}
                            counts={ALTITUDE_BANDS.map((band) => tracks.filter((track) => track.band === band).length)}
                            shape="point"
                            className="w-48"
                        />
                    ) : (
                        <MapLegend
                            title="Affiliation"
                            entries={trackLegendEntries(SIDE_WORDS, SIDES)}
                            counts={trackCounts(tracks, SIDES)}
                            shape="point"
                            className="w-40"
                        />
                    )}
                </MapOverlay>
            </MapView>
        </Frame>
    )
}

const FIELDS: FilterField<Flight>[] = [
    {
        id: 'band',
        label: 'Altitude',
        type: 'set',
        options: ALTITUDE_BANDS.map((band) => ({ value: band, label: BAND_NAMES[band] })),
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
]

const COLUMNS: DataColumn<Flight>[] = [
    {
        id: 'flight',
        header: 'Flight',
        width: 'minmax(9rem,1fr)',
        cell: (flight) => (
            <Row gap="xs">
                <TrackGlyph kind={flight.kind} affiliation={flight.affiliation} heading={flight.heading} />
                {nameOf(flight)}
            </Row>
        ),
        sortValue: nameOf,
        stack: 'lead',
    },
    { id: 'hex', header: 'Address', width: '6.5rem', cell: (flight) => flight.id, sortValue: (flight) => flight.id, stack: 'secondary' },
    { id: 'type', header: 'Type', width: '5rem', cell: (flight) => String(flight.properties?.aircraftType ?? ''), stack: 'secondary' },
    { id: 'altitude', header: 'Altitude', width: '8rem', align: 'end', cell: feet, sortValue: (flight) => flight.altitude ?? -1 },
    {
        id: 'phase',
        header: 'Phase',
        width: '8rem',
        cell: (flight) => {
            const phase = phaseOf(flight)
            return phase === undefined ? '' : PHASE_NAMES[phase]
        },
    },
    { id: 'speed', header: 'Speed', width: '6rem', align: 'end', cell: knots, sortValue: (flight) => flight.speed ?? -1 },
    { id: 'track', header: 'Track', width: '5rem', align: 'end', cell: heading, stack: 'none' },
    { id: 'squawk', header: 'Squawk', width: '5.5rem', cell: (flight) => String(flight.properties?.squawk ?? ''), stack: 'none' },
    {
        id: 'seen',
        header: 'Seen',
        width: '7rem',
        cell: (flight) => <Freshness at={flight.updatedAt ?? null} now={FLIGHTS_NOW} />,
        stack: 'secondary',
    },
]

function FlightsPage({ query: initial = '', filters: initialFilters = [] }: { query?: string; filters?: Filter[] }) {
    const [query, setQuery] = useState(initial)
    const [filters, setFilters] = useState<readonly Filter[]>(initialFilters)
    const wanted = query.trim().toLowerCase()
    const shown = filterRows(FLIGHTS, filters, FIELDS).filter((flight) => `${nameOf(flight)} ${flight.id}`.toLowerCase().includes(wanted))
    return (
        <Frame active="flights" trail="Flights">
            <Page className="h-full">
                <PageHeader title="Flights" count={`${String(FLIGHTS.length)} aircraft`} />
                <DataTable
                    className="min-h-0 flex-1"
                    columns={COLUMNS}
                    rows={shown}
                    rowKey={(flight) => flight.id}
                    search={<SearchField value={query} onChange={setQuery} label="Search by callsign or address" />}
                    toolbar={<FilterBar fields={FIELDS} filters={filters} onFiltersChange={setFilters} />}
                    defaultSort={{ column: 'flight', direction: 'asc' }}
                    onOpen={() => undefined}
                    empty="No aircraft match."
                    words={{ rows: (count) => `${String(count)} aircraft` }}
                    minWidth="52rem"
                />
            </Page>
        </Frame>
    )
}

const meta: Meta = { title: 'Apps/Flight watch', parameters: { layout: 'fullscreen' }, globals: { theme: 'dark' } }
export default meta

/**
 * Tidevann's flight watch over southern Norway and the North Sea: the aircraft of a readsb answer
 * read through the tracking package, each painted by its altitude band, with the ruler, go to, the
 * compass and the cursor's position in the map's corners. A flight is picked, its card and values
 * in the side panel, whose In view tab lists every aircraft as a roster.
 */
export const MapStory: StoryObj = { name: 'Map', render: () => <MapPage colorBy="altitude" /> }
/** The same map painted by whose each aircraft is, Tidevann's own or one giving no callsign. */
export const Affiliation: StoryObj = { name: 'Affiliation', render: () => <MapPage colorBy="affiliation" /> }
/** The picked flight followed: the map keeps it in the middle, and a banner says so and lets it go. */
export const Following: StoryObj = { name: 'Following', render: () => <MapPage colorBy="altitude" follow /> }
/** Every aircraft as a table, searched by callsign or address and filtered by altitude band and by whether it is on the ground. */
export const Flights: StoryObj = { name: 'Flights', render: () => <FlightsPage /> }
/** The table filtered to the aircraft above 25,000 feet. */
export const Filtered: StoryObj = {
    name: 'Filtered',
    render: () => <FlightsPage filters={[{ field: 'band', operator: 'oneOf', values: ['high'] }]} />,
}
