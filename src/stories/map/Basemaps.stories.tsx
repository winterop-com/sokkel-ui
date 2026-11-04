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
} from '../../components/map/basemap'
import { BasemapGallery, BasemapSwitcher } from '../../components/map/BasemapSwitcher'
import { BoundaryLayer } from '../../components/map/BoundaryLayer'
import { MapOverlay, MapView } from '../../components/map/MapView'
import { useDark } from '../../hooks/use-dark'
import { regions } from './data'
import { Page } from './Page'

/** The regions over one basemap, which opens on the light or dark street map by the scheme unless given one. */
function Over({ title, basemap }: { title: string; basemap?: Basemap }) {
    return (
        <Page title={title} period="Thirteen regions">
            <MapView label={`Regions over the ${title.toLowerCase()} basemap`} defaultBasemap={basemap} className="flex-1">
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
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="w-72 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                <h3 className="text-sm font-medium">Basemap</h3>
                <BasemapGallery basemaps={BASEMAPS} value={STREETS_BASEMAP.id} onValueChange={() => undefined} className="-mx-1 mt-2" />
            </div>
        </div>
    )
}

const meta: Meta = { title: 'Maps/Basemaps' }
export default meta

/** The light street map in the light scheme and the dark one in the dark scheme, until one is picked. */
export const ByScheme: StoryObj = { name: 'By scheme', render: () => <Over title="Street map" /> }
export const Light: StoryObj = { name: 'Light', render: () => <Over title="Light" basemap={LIGHT_BASEMAP} /> }
export const Dark: StoryObj = { name: 'Dark', render: () => <Over title="Dark" basemap={DARK_BASEMAP} /> }
export const Streets: StoryObj = { name: 'Streets', render: () => <Over title="Streets" basemap={STREETS_BASEMAP} /> }
/** NASA's Blue Marble mosaic, public domain, sharp to about a region's scale. */
export const Satellite: StoryObj = { name: 'Satellite', render: () => <Over title="Satellite" basemap={SATELLITE_BASEMAP} /> }
/** The ground alone in the token colors, which reaches no network. */
export const Blank: StoryObj = { name: 'Blank', render: () => <Over title="Blank" basemap={BLANK_BASEMAP} /> }
export const Switcher: StoryObj = { name: 'Switcher', render: () => <SwitcherOpen /> }
/** The previews laid out in a panel, as the layer panel's basemap card shows them. */
export const Previews: StoryObj = { name: 'Gallery', render: () => <Gallery /> }
