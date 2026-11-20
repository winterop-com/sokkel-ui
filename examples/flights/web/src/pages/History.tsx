import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PlaybackTimeline } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { TrackLayer, trackCounts, trackLegendEntries } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import type { TrackAffiliation } from '@winterop-com/sokkel-ui-tracking/track'
import { useEffect, useMemo, useState } from 'react'

import { FALLBACK_BASEMAP, FLIGHTS_BASEMAPS } from '../basemaps'
import { REGION, replayAt, simulatedAt } from '../feed'
import { ALTITUDE_BANDS, BAND_COLORS, bandName, onGround, toMapTrack } from '../flights'
import { formatTime } from '../parts/time'
import type { Settings } from '../settings'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
/** The activity strip's bins: one bar for every two minutes of the hour. */
const BIN = 2 * MINUTE

const SIDES: readonly TrackAffiliation[] = ['friend', 'unknown']
const SIDE_WORDS = { friend: 'Tidevann', unknown: 'No callsign' }

/** The clock the page plays back up to, moving on every two seconds. */
function useNow(): number {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 2 * SECOND)
        return () => clearInterval(timer)
    }, [])
    return now
}

/** How many aircraft were airborne in each two minutes of the hour before `to`, from the simulation. */
function activityOf(to: number): number[] {
    const from = to - HOUR
    return Array.from(
        { length: HOUR / BIN },
        (_, index) => simulatedAt(from + (index + 0.5) * BIN).filter((flight) => !onGround(flight)).length,
    )
}

/**
 * The last hour of the simulation played back: the map as it was at the moment the playhead
 * stands on, trails included, over the timeline with its strip of how busy each two minutes was.
 * Live reads are not kept, so with live on the history is still the simulation's.
 */
export function History({ options, live }: { options: Settings; live: boolean }) {
    const now = useNow()
    const [shownAt, setShownAt] = useState<number | null>(null)
    const minute = Math.floor(now / MINUTE) * MINUTE
    const activity = useMemo(() => activityOf(minute + MINUTE), [minute])
    // The moment drawn, to the second, so playing back does not work the map out again every frame.
    const moment = Math.floor((shownAt ?? now) / SECOND) * SECOND
    const flights = useMemo(() => replayAt(moment, options.trail), [moment, options.trail])
    const tracks = useMemo(() => flights.map((flight) => toMapTrack(flight, options)), [flights, options])
    const airborne = flights.filter((flight) => !onGround(flight)).length
    const zone = options.zone === 'utc' ? 'UTC' : undefined
    const byAltitude = options.colorBy === 'altitude'

    return (
        <Page className="h-full">
            <PageHeader
                title="History"
                description={`${shownAt === null ? 'Now' : formatTime(moment, zone)}: ${String(airborne)} airborne, ${String(flights.length - airborne)} on the ground${live ? '. Live reads are not kept, so this plays back the simulation.' : ''}`}
            />
            <MapView
                label="Flight history"
                basemaps={FLIGHTS_BASEMAPS}
                fallbackBasemap={FALLBACK_BASEMAP}
                camera={{ center: REGION.center, zoom: REGION.zoom - 0.3 }}
                file="flight-history"
                className="min-h-0 flex-1"
            >
                <TrackLayer
                    id="history"
                    tracks={tracks}
                    trails={options.trail > 0}
                    labels={options.labels}
                    bands={byAltitude ? BAND_COLORS : undefined}
                    transition={shownAt === null ? 1600 : 0}
                />
                <MapCoordinates format={options.coordinates} />
                <MapOverlay corner="bottom-right">
                    {byAltitude ? (
                        <MapLegend
                            title="Altitude"
                            entries={ALTITUDE_BANDS.map((band) => ({ label: bandName(band, options.units), color: BAND_COLORS[band] }))}
                            counts={ALTITUDE_BANDS.map((band) => tracks.filter((track) => track.band === band).length)}
                            shape="point"
                            className="w-52"
                        />
                    ) : (
                        <MapLegend
                            title="Affiliation"
                            entries={trackLegendEntries(SIDE_WORDS, SIDES)}
                            counts={trackCounts(tracks, SIDES)}
                            shape="point"
                            className="w-44"
                        />
                    )}
                </MapOverlay>
            </MapView>
            <PlaybackTimeline
                label="Flight watch"
                from={now - HOUR}
                to={now}
                value={shownAt}
                onValueChange={setShownAt}
                activity={activity}
                timeZone={zone}
            />
        </Page>
    )
}
