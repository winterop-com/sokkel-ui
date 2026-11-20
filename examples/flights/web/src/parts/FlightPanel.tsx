import { DescriptionList, type Description } from '@winterop-com/sokkel-ui/DescriptionList'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { TrackCard } from '@winterop-com/sokkel-ui/TrackCard'
import { TrackRoster, type TrackRosterItem } from '@winterop-com/sokkel-ui/TrackRoster'
import { formatCoordinates } from '@winterop-com/sokkel-ui-maps/geodesy'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Crosshair, List, Plane } from 'lucide-react'
import { useState } from 'react'

import {
    altitudeBand,
    bandName,
    callsignOf,
    formatAltitude,
    formatHeading,
    formatRate,
    formatSpeed,
    motionOf,
    nameOf,
    phaseOf,
    PHASE_NAMES,
    type Flight,
} from '../flights'
import type { Settings } from '../settings'
import { routeOf } from '../sim'

/** A flight as a roster lists it. */
export function rosterItem(flight: Flight, units: Settings['units']): TrackRosterItem {
    const phase = phaseOf(flight)
    return {
        id: flight.id,
        name: nameOf(flight),
        code: callsignOf(flight) === undefined ? undefined : flight.id,
        kind: flight.kind,
        affiliation: flight.affiliation,
        heading: flight.heading,
        states: phase === undefined ? undefined : [PHASE_NAMES[phase]],
        detail: motionOf(flight, units),
        updatedAt: flight.updatedAt ?? null,
    }
}

/** What is known of one flight: its card, then its values in the chosen units. */
function Details({ flight, at, options }: { flight: Flight; at: number; options: Settings }) {
    const band = altitudeBand(flight)
    const route = flight.source === 'simulated' ? routeOf(callsignOf(flight)) : undefined
    const type = flight.properties?.aircraftType
    const squawk = flight.properties?.squawk
    const items: Description[] = [
        ...(route === undefined ? [] : [{ term: 'Route', value: `${route.from} to ${route.to}` }]),
        { term: 'Altitude', value: formatAltitude(flight, options.units), numeric: true },
        ...(band === undefined ? [] : [{ term: 'Band', value: bandName(band, options.units) }]),
        { term: 'Speed', value: formatSpeed(flight.speed, options.units), numeric: true },
        { term: 'Vertical rate', value: formatRate(flight, options.units) || undefined, numeric: true },
        { term: 'Track', value: formatHeading(flight.heading) || undefined, numeric: true },
        { term: 'Squawk', value: typeof squawk === 'string' ? squawk : undefined, code: true },
        { term: 'Type', value: typeof type === 'string' ? type : undefined, code: true },
        { term: 'Address', value: flight.id, code: true },
        { term: 'Position', value: formatCoordinates([flight.lon, flight.lat], options.coordinates), code: true },
        { term: 'Source', value: flight.source === 'simulated' ? 'Simulated' : 'adsb.lol' },
    ]
    const item = rosterItem(flight, options.units)
    return (
        <>
            <TrackCard
                name={item.name}
                code={item.code}
                kind={item.kind}
                affiliation={item.affiliation}
                heading={item.heading}
                states={[flight.source === 'simulated' ? 'Simulated' : { label: 'Live', tone: 'info' }, ...(item.states ?? [])]}
                detail={item.detail}
                updatedAt={item.updatedAt}
                now={at}
            />
            <DescriptionList size="sm" items={items} />
        </>
    )
}

/**
 * The map's side panel: the flight picked, with Follow, and the aircraft in view as a roster whose
 * press picks one on the map.
 */
export function FlightPanel({
    flight,
    inView,
    at,
    options,
    followed,
    onFollow,
    onSelect,
}: {
    flight: Flight | undefined
    inView: readonly Flight[]
    at: number
    options: Settings
    followed: string | null
    onFollow: (id: string | null) => void
    onSelect: (id: string | null) => void
}) {
    const [tab, setTab] = useState<string>('flight')
    const following = flight !== undefined && followed === flight.id
    return (
        <SidePanel
            active={tab}
            onActiveChange={setTab}
            tabs={[
                {
                    id: 'flight',
                    label: 'Flight',
                    icon: Plane,
                    content:
                        flight === undefined ? (
                            <PageState loading={false} empty emptyMessage="Pick an aircraft on the map, or in the aircraft in view.">
                                {null}
                            </PageState>
                        ) : (
                            <PanelSection
                                title={nameOf(flight)}
                                actions={
                                    <Button
                                        variant={following ? 'secondary' : 'outline'}
                                        size="sm"
                                        onClick={() => onFollow(following ? null : flight.id)}
                                    >
                                        <Crosshair aria-hidden />
                                        {following ? 'Following' : 'Follow'}
                                    </Button>
                                }
                            >
                                <Details flight={flight} at={at} options={options} />
                            </PanelSection>
                        ),
                },
                {
                    id: 'in-view',
                    label: `In view (${String(inView.length)})`,
                    icon: List,
                    content: (
                        <TrackRoster
                            framed={false}
                            className="h-full"
                            tracks={inView.map((one) => rosterItem(one, options.units))}
                            now={at}
                            selected={flight?.id ?? null}
                            onSelect={(id) => {
                                onSelect(id)
                                setTab('flight')
                            }}
                        />
                    ),
                },
            ]}
        />
    )
}
