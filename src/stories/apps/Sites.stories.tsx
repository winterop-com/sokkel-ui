import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { BookOpen, FolderTree, LayoutDashboard, MapPin, Play, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Fill, Row } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { SubNav } from '@winterop-com/sokkel-ui/SubNav'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { boundsOfIds, isReadable, type Bounds } from '@winterop-com/sokkel-ui-maps/geometry'
import { MapLegend, type MapLegendEntry } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { AREA_EMPHASIS, HIGHLIGHT_COLOR, SELECTION_COLOR } from '@winterop-com/sokkel-ui-maps/scale'
import { NUMBER, figures, places, regionName, regions, sites } from '../map/data'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * Tidevann's sites page: where each project's jobs run, as a hierarchy of the country, its regions
 * and their sites. The tree and the map share one selection: the selected place is drawn in the
 * selection color, what lies under it in the highlight color, and the map frames it. The side
 * panel holds the selected place's facts, and the notes under the map say what it could not draw
 * and how it frames a place with no geometry of its own.
 */
const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#' },
            { id: 'runs', label: 'Runs', icon: Play, href: '#' },
            { id: 'sites', label: 'Sites', icon: MapPin, href: '#', active: true },
            { id: 'files', label: 'Files', icon: FolderTree, href: '#' },
            { id: 'docs', label: 'Docs', icon: BookOpen, href: '#' },
        ],
    },
    { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '#' }] },
]

const COUNTRY = 'sierra-leone'
const PROJECTS = ['harbor', 'juniper', 'larkspur']
const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders']

/** One site whose position came back unreadable, as data from the field sometimes does. */
const UNPLACED: Feature<Point, { name: string; region: string }> = {
    type: 'Feature',
    id: 'bo/gerihun',
    properties: { name: 'Gerihun', region: 'bo' },
    geometry: { type: 'Point', coordinates: [Number.NaN, 7.9] },
}

const SITES: FeatureCollection<Point, { name: string; region: string }> = {
    type: 'FeatureCollection',
    features: [...places.features, UNPLACED],
}

const sitesIn = (region: string) => SITES.features.filter((site) => site.properties.region === region)

/** A number from 0 to 1 that is always the same for the same text. */
function hashed(text: string): number {
    let hash = 2166136261
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0
    return hash / 0xffffffff
}

/** The projects that run jobs from a place, picked by its id so they are the same every time. */
const projectsAt = (id: string) => PROJECTS.filter((project) => hashed(`${id}:${project}`) < 0.55)
const jobsAt = (id: string) => JOBS.filter((job) => hashed(`${id}:${job}`) < 0.4)

const LEVEL = { country: 'Country', region: 'Region', site: 'Site' }

const TREE: TreeNode[] = [
    {
        id: COUNTRY,
        label: 'Sierra Leone',
        meta: LEVEL.country,
        children: [...regions.features]
            .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
            .map((region) => ({
                id: String(region.id),
                label: region.properties.name,
                meta: LEVEL.region,
                children: sitesIn(String(region.id))
                    .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
                    .map((site) => ({ id: String(site.id), label: site.properties.name, meta: LEVEL.site })),
            })),
    },
]

type Place =
    | { kind: 'country' }
    | { kind: 'region'; region: Feature }
    | { kind: 'site'; site: Feature<Point, { name: string; region: string }> }

function placeOf(id: string): Place {
    const region = regions.features.find((feature) => feature.id === id)
    if (region !== undefined) return { kind: 'region', region }
    const site = SITES.features.find((feature) => feature.id === id)
    if (site !== undefined) return { kind: 'site', site }
    return { kind: 'country' }
}

function nameOf(place: Place): string {
    if (place.kind === 'country') return 'Sierra Leone'
    if (place.kind === 'region') return regionName[String(place.region.id)]
    return place.site.properties.name
}

/** What the map draws for a place: the ids it highlights under it, what it frames, and a note when the place has no geometry. */
function framing(place: Place): { highlighted: string[]; bounds: Bounds | undefined; note?: string } {
    if (place.kind === 'country') {
        return {
            highlighted: regions.features.map((region) => String(region.id)),
            bounds: undefined,
            note: 'Sierra Leone has no boundary of its own here, so the map frames the regions under it.',
        }
    }
    if (place.kind === 'region') {
        const id = String(place.region.id)
        return { highlighted: sitesIn(id).map((site) => String(site.id)), bounds: boundsOfIds(regions, [id]) ?? undefined }
    }
    const region = place.site.properties.region
    if (isReadable(place.site.geometry)) return { highlighted: [], bounds: boundsOfIds(SITES, [String(place.site.id)]) ?? undefined }
    return {
        highlighted: [],
        bounds: boundsOfIds(regions, [region]) ?? undefined,
        note: `${place.site.properties.name} has no position that can be read, so the map frames ${regionName[region]}, the region it is in.`,
    }
}

/** The key to what the map lights for a place: the place, what is under it, and the rest. */
function legendOf(place: Place): MapLegendEntry[] {
    const others = { label: 'Other places', ...AREA_EMPHASIS.plain }
    if (place.kind === 'site') return [{ label: 'Selected site', color: SELECTION_COLOR, shape: 'point' }, others]
    if (place.kind === 'region') {
        return [
            { label: 'Selected region', ...AREA_EMPHASIS.selected },
            { label: 'Sites in it', color: HIGHLIGHT_COLOR, shape: 'point' },
            others,
        ]
    }
    return [{ label: 'Regions in it', ...AREA_EMPHASIS.highlighted }, others]
}

function Facts({ id, place }: { id: string; place: Place }) {
    const projects = projectsAt(id)
    const jobs = jobsAt(id)
    const facts =
        place.kind === 'country'
            ? [
                  { term: 'Regions', value: NUMBER.format(regions.features.length), numeric: true },
                  { term: 'Sites', value: NUMBER.format(SITES.features.length), numeric: true },
              ]
            : place.kind === 'region'
              ? [
                    { term: 'Population', value: NUMBER.format(figures[id].population), numeric: true },
                    { term: 'Area', value: `${NUMBER.format(figures[id].area)} km²`, numeric: true },
                    { term: 'Sites', value: NUMBER.format(sitesIn(id).length), numeric: true },
                ]
              : [
                    { term: 'Region', value: regionName[place.site.properties.region] },
                    {
                        term: 'Capacity',
                        value:
                            sites[id]?.capacity === null || sites[id] === undefined
                                ? ''
                                : `${NUMBER.format(sites[id].capacity ?? 0)} people`,
                    },
                    {
                        term: 'Position',
                        value: isReadable(place.site.geometry)
                            ? place.site.geometry.coordinates.map((value) => value.toFixed(4)).join(', ')
                            : 'Could not be read',
                        code: isReadable(place.site.geometry),
                    },
                ]
    const path =
        place.kind === 'country'
            ? 'Sierra Leone'
            : place.kind === 'region'
              ? `Sierra Leone / ${nameOf(place)}`
              : `Sierra Leone / ${regionName[place.site.properties.region]} / ${nameOf(place)}`
    return (
        <>
            <PanelSection title={LEVEL[place.kind]}>
                <DescriptionList
                    termWidth="5.5rem"
                    items={[{ term: 'Code', value: id, code: true }, ...facts, { term: 'Path', value: path }]}
                />
            </PanelSection>
            <PanelSection title="Projects">
                {projects.length === 0 ? (
                    <p className="text-help text-muted-foreground">No project runs here.</p>
                ) : (
                    <TagChips tags={projects} />
                )}
            </PanelSection>
            <PanelSection title="Jobs">
                {jobs.length === 0 ? (
                    <p className="text-help text-muted-foreground">No job runs here.</p>
                ) : (
                    <TagChips tags={jobs} variant="outline" />
                )}
            </PanelSection>
        </>
    )
}

function SitesApp({ initial = COUNTRY, offerBasemaps = true }: { initial?: string; offerBasemaps?: boolean }) {
    const [selected, setSelected] = useState(initial)
    const [query, setQuery] = useState('')
    const [collapsed, setCollapsed] = useState(false)
    const place = placeOf(selected)
    const shown = useMemo(() => framing(placeOf(selected)), [selected])
    const trail =
        place.kind === 'country'
            ? []
            : place.kind === 'region'
              ? [nameOf(place)]
              : [regionName[place.site.properties.region], nameOf(place)]
    const expanded = [COUNTRY, ...(place.kind === 'site' ? [place.site.properties.region] : place.kind === 'region' ? [selected] : [])]
    const shapes = `${NUMBER.format(regions.features.length)} regions, ${NUMBER.format(places.features.length)} sites`
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={GROUPS}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        defaultSize={232}
                        foot={
                            <AccountMenu
                                name="margaret"
                                image={pictureOf('margaret')}
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSignOut={() => undefined}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Sites', href: '#' }, { label: 'Sierra Leone', href: '#' }, ...trail.map((label) => ({ label }))]}
                        onSearch={() => undefined}
                    />
                }
                foot={
                    <StatusLine
                        note={`${NUMBER.format(SITES.features.length)} sites in ${NUMBER.format(regions.features.length)} regions`}
                    />
                }
                panel={
                    <SidePanel
                        tabs={[{ id: 'place', label: nameOf(place), content: <Facts id={selected} place={place} /> }]}
                        width="22rem"
                    />
                }
            >
                <Row gap="none" align="stretch" className="h-full min-h-0">
                    <SubNav
                        label="Hierarchy"
                        search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                        defaultSize={272}
                    >
                        <Tree
                            label="Hierarchy"
                            nodes={TREE}
                            selected={[selected]}
                            onSelect={(ids) => setSelected(ids[0] ?? COUNTRY)}
                            defaultExpanded={expanded}
                            query={query}
                        />
                    </SubNav>
                    <Fill>
                        <Page className="h-full min-h-0">
                            <PageHeader
                                title="Sites"
                                description="Where each project's jobs run, in the country, its regions and their sites."
                                actions={<ApiLink path={place.kind === 'country' ? '/sites' : `/sites/${selected}`} />}
                            />
                            <Section
                                title="Map"
                                meta={offerBasemaps ? shapes : `${shapes}, no basemap offered`}
                                flush
                                fill
                                className="min-h-80 flex-1"
                            >
                                <MapView
                                    label="Regions and sites"
                                    framed={false}
                                    basemaps={offerBasemaps ? undefined : []}
                                    controls={{ zoom: false, projection: true }}
                                    selected={selected === COUNTRY ? null : selected}
                                    onSelectedChange={(id) => setSelected(id ?? COUNTRY)}
                                    bounds={shown.bounds}
                                    maxFitZoom={10}
                                    notes={shown.note === undefined ? [] : [shown.note]}
                                    className="h-full"
                                >
                                    <BoundaryLayer id="regions" data={regions} highlighted={shown.highlighted} />
                                    <PointLayer
                                        id="sites"
                                        data={SITES}
                                        color="var(--muted-foreground)"
                                        radius={3}
                                        highlighted={place.kind === 'region' ? shown.highlighted : []}
                                    />
                                    <MapOverlay corner="bottom-left">
                                        <MapLegend entries={legendOf(place)} className="w-48" />
                                    </MapOverlay>
                                </MapView>
                            </Section>
                        </Page>
                    </Fill>
                </Row>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Sites', parameters: { layout: 'fullscreen' } }
export default meta

/** The whole country selected: no boundary of its own, so the map frames the regions under it and says so. */
export const Country: StoryObj = { name: 'Country', render: () => <SitesApp /> }
/** One region selected in the tree: filled in the selection color, its sites highlighted, and framed. */
export const Region: StoryObj = { name: 'Region', render: () => <SitesApp initial="bo" /> }
/** No basemap offered: the map draws on the ground alone and reaches no network; a site whose position cannot be read is noted. */
export const NoBasemap: StoryObj = { name: 'No basemap', render: () => <SitesApp initial="bo/gerihun" offerBasemaps={false} /> }
