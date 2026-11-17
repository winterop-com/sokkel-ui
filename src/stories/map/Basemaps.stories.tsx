import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import {
    BASEMAPS,
    BLANK_BASEMAP,
    DARK_BASEMAP,
    LIGHT_BASEMAP,
    SATELLITE_BASEMAP,
    SCHEME_BASEMAPS,
    STREETS_BASEMAP,
    resolveBasemap,
    type Basemap,
    type SchemeBasemaps,
} from '@winterop-com/sokkel-ui-maps/basemap'
import { BasemapGallery, BasemapSwitcher } from '@winterop-com/sokkel-ui-maps/BasemapSwitcher'
import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'
import { useDark } from '@winterop-com/sokkel-ui/hooks/use-dark'
import { regions } from './data'
import { Page } from './Page'

/** The regions over one basemap, which opens on the light or dark street map by the scheme unless given one; the switcher offers the World basemap too. */
function Over({ title, basemap }: { title: string; basemap?: Basemap }) {
    return (
        <Page title={title} period="Fifteen regions">
            <MapView
                label={`Regions over the ${title.toLowerCase()} basemap`}
                defaultBasemap={basemap}
                basemaps={[...BASEMAPS, WORLD_BASEMAP]}
                className="flex-1"
            >
                <BoundaryLayer id="regions" data={regions} />
            </MapView>
        </Page>
    )
}

/** The regions with no basemap offered: the ground alone, no switcher, and no network. */
function Unoffered() {
    return (
        <Page title="No basemap" period="None offered">
            <MapView label="Regions with no basemap offered" basemaps={[]} className="flex-1">
                <BoundaryLayer id="regions" data={regions} />
            </MapView>
        </Page>
    )
}

/** A street map whose host cannot be reached, here a style that is not there, so the map draws its fallback. */
const UNREACHABLE: Basemap = { id: 'unreachable', name: 'Streets', style: 'offline/style.json' }

/** The regions over a street map that cannot be had: the World basemap drawn in its place, with no network. */
function Offline() {
    return (
        <Page title="Offline" period="The street map cannot be reached">
            <MapView
                label="Regions over the World basemap, drawn in place of a street map that cannot be reached"
                defaultBasemap={UNREACHABLE}
                basemaps={[UNREACHABLE, WORLD_BASEMAP]}
                fallbackBasemap={WORLD_BASEMAP}
                className="flex-1"
            >
                <BoundaryLayer id="regions" data={regions} />
            </MapView>
        </Page>
    )
}

/** The switcher open over the map, every basemap with its preview and the drawn one checked. */
function SwitcherOpen() {
    const dark = useDark()
    const [basemap, setBasemap] = useState<Basemap | SchemeBasemaps>(SCHEME_BASEMAPS)
    return (
        <Page title="Choosing a basemap" period="The switcher, open">
            <MapView label="Regions with the basemap switcher open" basemap={basemap} basemaps={[]} className="flex-1">
                <BoundaryLayer id="regions" data={regions} />
                <MapOverlay corner="top-right">
                    <BasemapSwitcher
                        basemaps={BASEMAPS}
                        value={resolveBasemap(basemap, dark).id}
                        onValueChange={(id) => setBasemap(BASEMAPS.find((option) => option.id === id) ?? SCHEME_BASEMAPS)}
                        defaultOpen
                    />
                </MapOverlay>
            </MapView>
        </Page>
    )
}

/** The previews laid out in a panel. */
function Gallery() {
    return (
        <div className="w-72 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <h3 className="text-sm font-medium">Basemap</h3>
            <BasemapGallery basemaps={BASEMAPS} value={STREETS_BASEMAP.id} onValueChange={() => undefined} className="-mx-1 mt-2" />
        </div>
    )
}

const meta: Meta = { title: 'Maps/Basemaps', parameters: { frame: 'padded' } }
export default meta

/** The light street map in the light scheme and the dark one in the dark scheme, until one is picked. */
export const ByScheme: StoryObj = { parameters: { frame: 'none' }, name: 'By scheme', render: () => <Over title="Street map" /> }
/** The pale street map, chosen. */
export const Light: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Light',
    render: () => <Over title="Light" basemap={LIGHT_BASEMAP} />,
}
/** The dark street map, chosen. */
export const Dark: StoryObj = { parameters: { frame: 'none' }, name: 'Dark', render: () => <Over title="Dark" basemap={DARK_BASEMAP} /> }
/** The street map in color, with roads, water, parks and buildings. */
export const Streets: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Streets',
    render: () => <Over title="Streets" basemap={STREETS_BASEMAP} />,
}
/** NASA's Blue Marble mosaic, public domain, sharp to about a region's scale. */
export const Satellite: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Satellite',
    render: () => <Over title="Satellite" basemap={SATELLITE_BASEMAP} />,
}
/** The world's countries drawn as land from the geometry the package carries, which reaches no network. */
export const World: StoryObj = {
    parameters: { frame: 'none' },
    name: 'World',
    render: () => <Over title="World" basemap={WORLD_BASEMAP} />,
}
/** The ground alone in the token colors, which reaches no network. */
export const Blank: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Blank',
    render: () => <Over title="Blank" basemap={BLANK_BASEMAP} />,
}
/** An app that offers no basemap: whatever the default, the map draws the ground alone and reaches no network. */
export const NoneOffered: StoryObj = { parameters: { frame: 'none' }, name: 'None offered', render: () => <Unoffered /> }
/** A street map that cannot be had, as offline: the map draws its `fallbackBasemap`, the World basemap, in its place. */
export const Fallback: StoryObj = { parameters: { frame: 'none' }, name: 'Offline', render: () => <Offline /> }
/** The basemap switcher open in the map's corner, each basemap with its preview. */
export const Switcher: StoryObj = { parameters: { frame: 'none' }, name: 'Switcher', render: () => <SwitcherOpen /> }
/** The previews laid out in a panel, as the layer panel's basemap card shows them. */
export const Previews: StoryObj = { name: 'Gallery', render: () => <Gallery /> }
