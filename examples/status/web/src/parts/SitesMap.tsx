import type { Bounds } from '@winterop-com/sokkel-ui-maps/geometry'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { categoricalScale, classCounts } from '@winterop-com/sokkel-ui-maps/scale'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { useMemo } from 'react'

import { type Incident, SITE_BY_ID, SITES } from '../data'
import type { LiveState } from '../live'
import { type Health, HEALTH_WORDS, healthCss, formatMs } from '../status'

const SCALE = categoricalScale(
    (['operational', 'degraded', 'outage'] as const).map((health) => ({
        value: health,
        label: HEALTH_WORDS[health],
        color: healthCss(health),
    })),
)

const healthOfPoint = (feature: Feature) => (feature.properties as { health?: Health } | null)?.health

/**
 * Tidevann's sites on a map, each a point in its state's color, followed live. Choosing one opens
 * its card: where it is, its state, its round trip now, and the incident that covers it.
 */
export function SitesMap({
    state,
    open,
    selected,
    onSelectedChange,
    onIncident,
    bounds,
    className,
}: {
    state: LiveState
    /** The open incidents, for the card of a site one covers. */
    open: readonly Incident[]
    selected: string | null
    onSelectedChange: (id: string | null) => void
    onIncident: (incident: Incident) => void
    /** What the map frames, such as a region's sites; every site when left out. */
    bounds?: Bounds
    className?: string
}) {
    // The points change only when a site's state does, so the map is not redrawn every reading.
    const signature = SITES.map((site) => state.siteHealth[site.id]).join(' ')
    const data = useMemo<FeatureCollection<Point, { name: string; health: Health }>>(
        () => ({
            type: 'FeatureCollection',
            features: SITES.map((site) => ({
                type: 'Feature',
                id: site.id,
                geometry: { type: 'Point', coordinates: site.at },
                properties: { name: site.city, health: (signature.split(' ')[SITES.indexOf(site)] ?? 'operational') as Health },
            })),
        }),
        [signature],
    )
    const tally = classCounts(
        SCALE,
        data.features.map((feature) => feature.properties.health),
    )
    const site = selected === null ? undefined : SITE_BY_ID[selected]
    const feature = data.features.find((one) => one.id === selected)
    const latencies = selected === null ? undefined : state.sites[selected]
    const now = latencies?.[latencies.length - 1]
    const covering = site === undefined ? undefined : open.find((incident) => incident.sites.includes(site.id))
    const health = site === undefined ? undefined : state.siteHealth[site.id]
    return (
        <MapView
            label="Sites by state"
            framed={false}
            bounds={bounds}
            selected={selected}
            onSelectedChange={(id) => onSelectedChange(id)}
            className={className}
        >
            <PointLayer id="sites" data={data} scale={SCALE} value={healthOfPoint} radius={7} />
            <MapOverlay corner="bottom-left">
                <MapLegend title="Sites" description={`${String(SITES.length)} cities`} scale={SCALE} shape="point" counts={tally.counts} />
            </MapOverlay>
            {site !== undefined && feature !== undefined && health !== undefined && (
                <MapPopup
                    feature={feature as Feature}
                    title={site.city}
                    description={`${site.country}, ${site.region}`}
                    rows={[
                        { label: 'State', value: HEALTH_WORDS[health], color: healthCss(health) },
                        { label: 'Round trip', value: now === undefined ? '-' : formatMs(now) },
                        { label: 'Usually', value: formatMs(site.latency) },
                        ...(covering === undefined ? [] : [{ label: 'Incident', value: covering.code }]),
                    ]}
                    action={covering === undefined ? undefined : { label: `Open ${covering.code}`, onClick: () => onIncident(covering) }}
                    onClose={() => onSelectedChange(null)}
                />
            )}
        </MapView>
    )
}
