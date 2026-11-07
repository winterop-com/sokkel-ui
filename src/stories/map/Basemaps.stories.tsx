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
import { useDark } from '@winterop-com/sokkel-ui/hooks/use-dark'
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
export const Light: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Light',
    render: () => <Over title="Light" basemap={LIGHT_BASEMAP} />,
}
export const Dark: StoryObj = { parameters: { frame: 'none' }, name: 'Dark', render: () => <Over title="Dark" basemap={DARK_BASEMAP} /> }
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
/** The ground alone in the token colors, which reaches no network. */
export const Blank: StoryObj = {
    parameters: { frame: 'none' },
    name: 'Blank',
    render: () => <Over title="Blank" basemap={BLANK_BASEMAP} />,
}
export const Switcher: StoryObj = { parameters: { frame: 'none' }, name: 'Switcher', render: () => <SwitcherOpen /> }
/** The previews laid out in a panel, as the layer panel's basemap card shows them. */
export const Previews: StoryObj = { name: 'Gallery', render: () => <Gallery /> }
