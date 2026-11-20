import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState, type ReactNode } from 'react'

import { CoverageLayer } from '@winterop-com/sokkel-ui-maps/CoverageLayer'
import { formatBearing, formatCoordinates, parseCoordinates } from '@winterop-com/sokkel-ui-maps/geodesy'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import { LinkLayer } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { MapCompass } from '@winterop-com/sokkel-ui-maps/MapCompass'
import { MapCoordinates } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MapFollow } from '@winterop-com/sokkel-ui-maps/MapFollow'
import { MapGoTo } from '@winterop-com/sokkel-ui-maps/MapGoTo'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapRuler } from '@winterop-com/sokkel-ui-maps/MapRuler'
import { MapOverlay, MapView, type MapCamera } from '@winterop-com/sokkel-ui-maps/MapView'
import { TRACK_COLORS, TRACK_WORDS, TrackLayer, trackCounts, trackLegendEntries, type Track } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { ZoneLayer, zoneLegendEntry } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import { parseMgrs, toMgrs } from '@winterop-com/sokkel-ui-tracking/geo'
import { Page } from './Page'
import {
    APPROACH_CAMERA,
    AREAS_CAMERA,
    HARBOR_CAMERA,
    HARBOR_RINGS,
    HARBORS,
    RADAR_CONES,
    RADAR_LINKS,
    WATCH_CAMERA,
    ZONES,
    denseRoutes,
    objectiveLinks,
    speedOf,
    trackCone,
    useWatchClock,
    watchAt,
} from './tracks'

/** A dark map of the coast with no tile server: the countries drawn from the geometry the maps package carries. */
function Watch({
    title,
    description,
    camera = WATCH_CAMERA,
    selected,
    onSelectedChange,
    rotate = false,
    children,
}: {
    title: string
    description: string
    camera?: MapCamera
    selected?: string | null
    onSelectedChange?: (id: string | null) => void
    rotate?: boolean
    children: ReactNode
}) {
    return (
        <Page title={title} period={description}>
            <MapView
                label={title}
                defaultBasemap={WORLD_BASEMAP}
                basemaps={[WORLD_BASEMAP]}
                camera={camera}
                rotate={rotate}
                selected={selected}
                onSelectedChange={onSelectedChange === undefined ? undefined : (id) => onSelectedChange(id)}
                className="flex-1"
            >
                {children}
            </MapView>
        </Page>
    )
}

/** The legend of the affiliations, with how many tracks each has. */
function Legend({ tracks }: { tracks: readonly Track[] }) {
    return (
        <MapOverlay corner="bottom-right">
            <MapLegend title="Affiliation" entries={trackLegendEntries()} counts={trackCounts(tracks)} shape="point" className="w-40" />
        </MapOverlay>
    )
}

/** A track's card: what it is, whose it is, how fast and which way it goes, and where it is. */
function TrackPopup({ track, onClose, onFollow }: { track: Track; onClose: () => void; onFollow?: () => void }) {
    const speed = speedOf(track.id)
    return (
        <MapPopup
            at={track.position}
            title={track.label ?? track.id}
            description={TRACK_WORDS[track.kind]}
            rows={[
                { label: 'Affiliation', value: TRACK_WORDS[track.affiliation], color: TRACK_COLORS[track.affiliation] },
                ...(speed === undefined || speed === 0 ? [] : [{ label: 'Speed', value: `${String(Math.round(speed))} kn` }]),
                ...(track.heading === undefined ? [] : [{ label: 'Heading', value: formatBearing(track.heading) }]),
                { label: 'Position', value: formatCoordinates(track.position) },
            ]}
            action={onFollow === undefined ? undefined : { label: 'Follow', onClick: onFollow }}
            onClose={onClose}
        />
    )
}

function Plain({ trails }: { trails: boolean }) {
    const tracks = useMemo(() => watchAt(0, trails), [trails])
    return (
        <Watch title="Harbor watch" description="Vessels and aircraft near harbor, juniper and larkspur">
            <TrackLayer id="tracks" tracks={tracks} />
            <Legend tracks={tracks} />
        </Watch>
    )
}

function Selected() {
    const tracks = useMemo(() => watchAt(0), [])
    const [selected, setSelected] = useState<string | null>('contact-14')
    const track = tracks.find((each) => each.id === selected)
    return (
        <Watch title="Harbor watch" description="One contact picked" selected={selected} onSelectedChange={setSelected}>
            <TrackLayer id="tracks" tracks={tracks} />
            <Legend tracks={tracks} />
            {track !== undefined && <TrackPopup track={track} onClose={() => setSelected(null)} />}
        </Watch>
    )
}

function Dense() {
    const routes = useMemo(() => denseRoutes(), [])
    const tracks = useMemo(() => watchAt(0, false, routes), [routes])
    return (
        <Watch title="Harbor watch" description={`${String(tracks.length)} tracks on a busy day`} camera={APPROACH_CAMERA}>
            <TrackLayer id="tracks" tracks={tracks} cluster labels={false} />
            <Legend tracks={tracks} />
        </Watch>
    )
}

function Live() {
    const minute = useWatchClock()
    const tracks = useMemo(() => watchAt(minute), [minute])
    return (
        <Watch title="Harbor watch" description="Live, a minute a second">
            <TrackLayer id="tracks" tracks={tracks} />
            <Legend tracks={tracks} />
        </Watch>
    )
}

function Ruler() {
    const tracks = useMemo(() => watchAt(0), [])
    const contact = tracks.find((track) => track.id === 'contact-14')
    return (
        <Watch title="Harbor watch" description="From harbor to a contact" camera={APPROACH_CAMERA}>
            <TrackLayer id="tracks" tracks={tracks} />
            <MapRuler defaultActive defaultPoints={contact === undefined ? undefined : [HARBORS.harbor, contact.position]} />
            <MapCoordinates />
        </Watch>
    )
}

/** A position read as latitude, longitude or as an MGRS reference, whichever it is written as. */
const readPosition = (text: string): LngLat | null => parseCoordinates(text) ?? parseMgrs(text, { center: true }) ?? null

function Grid() {
    const tracks = useMemo(() => watchAt(0), [])
    return (
        <Watch title="Harbor watch" description="Positions as MGRS references" camera={APPROACH_CAMERA}>
            <TrackLayer id="tracks" tracks={tracks} />
            <MapGoTo
                parse={readPosition}
                words={{ placeholder: 'Lat, lon or MGRS', invalid: 'Write a position as latitude, longitude or an MGRS reference.' }}
            />
            <MapCoordinates formatPosition={(position) => toMgrs(position) ?? formatCoordinates(position)} />
        </Watch>
    )
}

function Follow() {
    const minute = useWatchClock()
    const tracks = useMemo(() => watchAt(minute), [minute])
    const [followed, setFollowed] = useState<string | null>('patrol-7')
    const track = tracks.find((each) => each.id === followed)
    return (
        <Watch title="Harbor watch" description="Following a patrol" camera={HARBOR_CAMERA} selected={followed}>
            <TrackLayer id="tracks" tracks={tracks} />
            {track !== undefined && (
                <MapFollow position={track.position} name={track.label ?? track.id} zoom={8} onRelease={() => setFollowed(null)} />
            )}
        </Watch>
    )
}

/** The watch's areas keyed by how each is drawn. */
const ZONE_ENTRIES = ZONES.map((zone) => zoneLegendEntry(zone.label ?? zone.id, zone.tone ?? 'plain', zone.fill))

function Zones() {
    const tracks = useMemo(() => watchAt(0, false), [])
    const [selected, setSelected] = useState<string | null>('closed-area')
    return (
        <Watch
            title="Harbor watch"
            description="The areas the watch keeps"
            camera={AREAS_CAMERA}
            selected={selected}
            onSelectedChange={setSelected}
        >
            <ZoneLayer id="zones" zones={ZONES} />
            <TrackLayer id="tracks" tracks={tracks} labels={false} />
            <MapOverlay corner="bottom-right">
                <MapLegend title="Areas" entries={ZONE_ENTRIES} shape="area" className="w-40" />
            </MapOverlay>
        </Watch>
    )
}

function Coverage() {
    const tracks = useMemo(() => watchAt(0, false), [])
    return (
        <Watch title="Harbor watch" description="What the three radars cover">
            <CoverageLayer id="radars" cones={RADAR_CONES} />
            <TrackLayer id="tracks" tracks={tracks} />
            <Legend tracks={tracks} />
        </Watch>
    )
}

function Rings() {
    const tracks = useMemo(() => watchAt(0, false), [])
    return (
        <Watch title="Harbor watch" description="Every 20 km from harbor" camera={APPROACH_CAMERA}>
            <CoverageLayer id="rings" rings={[HARBOR_RINGS]} />
            <TrackLayer id="tracks" tracks={tracks} />
            <MapCoordinates />
        </Watch>
    )
}

function Links() {
    const tracks = useMemo(() => watchAt(0, false), [])
    const links = useMemo(() => [...RADAR_LINKS, ...objectiveLinks(tracks)], [tracks])
    return (
        <Watch title="Harbor watch" description="Who goes after whom, and the radars harbor reads">
            <LinkLayer id="links" links={links} />
            <TrackLayer id="tracks" tracks={tracks} />
            <Legend tracks={tracks} />
        </Watch>
    )
}

function Console() {
    const minute = useWatchClock()
    const tracks = useMemo(() => watchAt(minute), [minute])
    const [selected, setSelected] = useState<string | null>('contact-14')
    const [followed, setFollowed] = useState<string | null>(null)
    const track = tracks.find((each) => each.id === selected)
    const followedTrack = tracks.find((each) => each.id === followed)
    const cones = useMemo(() => {
        const patrol = tracks.find((each) => each.id === 'patrol-7')
        return patrol === undefined ? RADAR_CONES : [...RADAR_CONES, trackCone(patrol)]
    }, [tracks])
    const links = useMemo(() => objectiveLinks(tracks, [['patrol-7', 'contact-14']]), [tracks])
    return (
        <Watch
            title="Harbor watch"
            description="Tracks, tools and a contact picked"
            selected={selected}
            onSelectedChange={setSelected}
            rotate
        >
            <ZoneLayer id="zones" zones={ZONES} />
            <CoverageLayer id="cover" cones={cones} />
            <LinkLayer id="links" links={links} />
            <TrackLayer id="tracks" tracks={tracks} />
            <MapRuler />
            <MapCompass />
            <MapGoTo />
            <MapCoordinates />
            <Legend tracks={tracks} />
            {followedTrack !== undefined && (
                <MapFollow
                    position={followedTrack.position}
                    name={followedTrack.label ?? followedTrack.id}
                    onRelease={() => setFollowed(null)}
                />
            )}
            {track !== undefined && (
                <TrackPopup
                    track={track}
                    onClose={() => setSelected(null)}
                    onFollow={followed === track.id ? undefined : () => setFollowed(track.id)}
                />
            )}
        </Watch>
    )
}

const meta: Meta = { title: 'Maps/Tracks', globals: { theme: 'dark' } }
export default meta

/** A few tracks off the coast, one of each affiliation, each turned to its heading and named beside it, with a legend that counts them. */
export const Tracks: StoryObj = { name: 'Tracks', render: () => <Plain trails={false} /> }
/** The same tracks with their trails behind them, fading into the past. */
export const Trails: StoryObj = { name: 'Trails', render: () => <Plain trails /> }
/** One contact picked: ringed in the selection color, its name marked, and its card open over it. */
export const Picked: StoryObj = { name: 'Selected', render: () => <Selected /> }
/** Two hundred and forty tracks gathered into counted clusters, a cluster ringed when it holds a hostile track; a click zooms in. */
export const Clustered: StoryObj = { name: 'Dense', render: () => <Dense /> }
/** The watch moving a minute a second from the same start every time, each track gliding to where it is now. */
export const Moving: StoryObj = { name: 'Live', render: () => <Live /> }
/** The ruler on, measuring from harbor to a contact: the distance along the great circle and the bearing, with the cursor's position under the map. */
export const Measuring: StoryObj = { name: 'Ruler', render: () => <Ruler /> }
/** The cursor's position written as an MGRS reference from the tracking add-on's `toMgrs`, and go to taking either latitude, longitude or a reference such as `32V KN 69 20`. */
export const GridReferences: StoryObj = { name: 'Grid references', render: () => <Grid /> }
/** The map keeping a patrol centered as it moves, with a banner that says so and lets it go. */
export const Following: StoryObj = { name: 'Follow', render: () => <Follow /> }
/** The watch's areas: a wash, diagonal lines or only an edge, solid or dashed, each in its tone and named at its middle; the closed area picked. */
export const Areas: StoryObj = { name: 'Zones', render: () => <Zones /> }
/** What the three harbor radars cover: each a wedge out to sea in the friend tone, fading out with distance to its range. */
export const Covered: StoryObj = { name: 'Coverage', render: () => <Coverage /> }
/** Dashed rings every 20 km from harbor out to 80, each written with its distance on the sea side. */
export const Ranges: StoryObj = { name: 'Range rings', render: () => <Rings /> }
/** Lines from harbor along the great circle to the radars it reads, and dashed straight lines from tracks to their objectives, each saying how far and which way. */
export const Linked: StoryObj = { name: 'Links', render: () => <Links /> }
/** Everything together: live tracks over the watch's areas and the radars' cover, a patrol's own sensor turning with it and a line to the contact it goes after, the ruler, a compass on a map that turns, go to coordinates, the cursor's position, the legend, and a picked contact's card, whose Follow keeps it centered. */
export const Full: StoryObj = { name: 'Console', render: () => <Console /> }
