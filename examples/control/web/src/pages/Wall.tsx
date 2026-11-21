import { AlertTicker } from '@winterop-com/sokkel-ui/AlertTicker'
import { Chip } from '@winterop-com/sokkel-ui/Chip'
import { Kiosk } from '@winterop-com/sokkel-ui/Kiosk'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { StatusTile, StatusWall } from '@winterop-com/sokkel-ui/StatusWall'
import { DARK_BASEMAP } from '@winterop-com/sokkel-ui-maps/basemap'
import { MapOverlay } from '@winterop-com/sokkel-ui-maps/MapView'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { LayoutDashboard } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { TidevannMark } from 'tidevann-shared/mark'
import { go } from 'tidevann-shared/router'

import { ControlMap } from '../parts/ControlMap'
import { SOURCE_ICONS } from '../parts/words'
import { boxRound, type Picture } from '../picture'
import { clockTime, lastLatency, latencySeries, sourceNote, tickerItems, type Watch } from '../watch'

const WALL_BASEMAPS = [DARK_BASEMAP]

/** One place the wall's camera stops at. */
interface Region {
    name: string
    bounds: [number, number, number, number]
}

/** The places the camera goes round: the world, the coast the tracks are on, and wherever the gravest things are now. */
function regionsOf(picture: Picture): Region[] {
    const regions: Region[] = [
        { name: 'The world', bounds: [-140, -50, 160, 72] },
        { name: 'The coast', bounds: [-3, 55.5, 15, 65.5] },
    ]
    const quake = picture.incidents
        .filter((incident) => incident.kind === 'earthquake')
        .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))[0]
    if (quake !== undefined) regions.push({ name: quake.label, bounds: boxRound([quake.lon, quake.lat], 14) })
    const station = picture.satellites.find((track) => track.affiliation === 'friend')
    if (station !== undefined) regions.push({ name: 'Under the station', bounds: boxRound(station.position as [number, number], 22) })
    const disaster = picture.incidents.find((incident) => incident.key.startsWith('disasters:'))
    if (disaster !== undefined) regions.push({ name: disaster.label, bounds: boxRound([disaster.lon, disaster.lat], 12) })
    return regions
}

/**
 * The wall: the map large, every source's status as a tile beside it, the counts over it and the
 * alerts along the foot, with no rail and no top bar, for a screen nobody sits at. Its camera goes
 * from one region of interest to the next by itself.
 */
export function Wall({ watch }: { watch: Watch }) {
    const { picture, options, state, shared, open, at } = watch
    const [stop, setStop] = useState(0)
    const live = shared.playhead === null
    useEffect(() => {
        if (!options.cycle || !live) return
        const timer = setInterval(() => setStop((was) => was + 1), options.dwell * 1000)
        return () => clearInterval(timer)
    }, [options.cycle, options.dwell, live])
    // Where the camera stops is worked out as it moves on, not as the picture moves under it.
    const region = useMemo(() => {
        const regions = regionsOf(picture)
        return regions[stop % regions.length]
    }, [stop])
    const up = state.sources.filter((source) => source.status === 'up').length
    const on = state.sources.filter((source) => source.enabled).length
    return (
        <Kiosk
            className="h-svh"
            asideWidth="lg"
            label="Control wall"
            mark={<TidevannMark />}
            title="Control site"
            clock={clockTime(at, options.zone)}
            actions={
                <Button variant="ghost" size="sm" onClick={() => go('/operator')}>
                    <LayoutDashboard aria-hidden />
                    Console
                </Button>
            }
            figures={
                <>
                    <Stat label="Vessels" value={picture.counts.vessels.toLocaleString('en-US')} size="lg" dot="var(--track-neutral)" />
                    <Stat label="Aircraft" value={picture.counts.aircraft.toLocaleString('en-US')} size="lg" dot="var(--chart-4)" />
                    <Stat
                        label="Satellites"
                        value={picture.counts.satellites.toLocaleString('en-US')}
                        size="lg"
                        dot="var(--track-friend)"
                    />
                    <Stat label="Incidents" value={picture.counts.incidents.toLocaleString('en-US')} size="lg" dot="var(--warning)" />
                    <Stat label="Open alerts" value={open.length.toLocaleString('en-US')} size="lg" dot="var(--critical)" />
                    <Stat label="Sources up" value={String(up)} unit={`of ${String(on)}`} size="lg" dot="var(--good)" />
                </>
            }
            aside={
                <StatusWall label="Sources" tile="sm">
                    {state.sources.map((source) => {
                        const Icon = SOURCE_ICONS[source.id]
                        return (
                            <StatusTile
                                key={source.id}
                                name={source.label}
                                icon={Icon === undefined ? undefined : <Icon aria-hidden />}
                                status={source.status}
                                value={lastLatency(source)?.toLocaleString('en-US')}
                                unit={lastLatency(source) === undefined ? undefined : 'ms'}
                                detail={sourceNote(source)}
                                series={latencySeries(source)}
                                seriesLabel={`${source.label}, latency over the last reads`}
                                flag={source.mode === 'simulated' ? 'Simulated' : undefined}
                                selected={shared.selected === `${source.id}:`}
                                onSelect={() => watch.select(`${source.id}:`)}
                            />
                        )
                    })}
                </StatusWall>
            }
            foot={<AlertTicker label="Alerts" items={tickerItems(open.length > 0 ? open : state.alerts.slice(0, 5), options.zone)} />}
        >
            <ControlMap
                picture={picture}
                selected={shared.selected}
                onSelect={watch.select}
                projection={options.globe ? 'globe' : 'mercator'}
                bounds={options.cycle && live ? region.bounds : undefined}
                camera={options.cycle && live ? undefined : { center: [8, 50], zoom: 1.6 }}
                controls={false}
                basemaps={WALL_BASEMAPS}
                labels={false}
                trails={options.trails}
            >
                {options.cycle && live && (
                    <MapOverlay corner="top-left">
                        <Chip>{region.name}</Chip>
                    </MapOverlay>
                )}
            </ControlMap>
        </Kiosk>
    )
}
