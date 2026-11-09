import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Fill, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { Inspector, InspectorSection } from '@winterop-com/sokkel-ui/Inspector'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { SubNav } from '@winterop-com/sokkel-ui/SubNav'
import { Tree } from '@winterop-com/sokkel-ui/Tree'
import { BoundaryLayer } from '@winterop-com/sokkel-ui-maps/BoundaryLayer'
import { boundsOfIds, type Bounds } from '@winterop-com/sokkel-ui-maps/geometry'
import { MapLegend, type MapLegendEntry } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { AREA_EMPHASIS, HIGHLIGHT_COLOR, SELECTION_COLOR } from '@winterop-com/sokkel-ui-maps/scale'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { useMemo, useState } from 'react'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { receipts, STATES, STATE_WORDS } from '../data/backend'
import { FORMS, KIND } from '../data/forms'
import { childrenOf, COUNTRY, LEVEL_LABEL, pathOf, PLACE_TREE, placeOf, regions, sites, under, type Place } from '../data/geo'
import { count, NUMBER, StateChip, useFoot, when } from '../ui'

/** What the map lights for a place: what lies under it, what it frames, and a note when it has no geometry of its own. */
function framing(place: Place): { highlighted: string[]; bounds: Bounds | undefined; note?: string } {
    if (place.level === 'country')
        return {
            highlighted: regions.features.map((region) => String(region.id)),
            bounds: undefined,
            note: `${place.name} has no boundary of its own here, so the map frames the regions under it.`,
        }
    if (place.level === 'region')
        return { highlighted: childrenOf(place.id).map((site) => site.id), bounds: boundsOfIds(regions, [place.id]) ?? undefined }
    if (place.position !== null) return { highlighted: [], bounds: boundsOfIds(sites, [place.id]) ?? undefined }
    return {
        highlighted: [],
        bounds: place.parent === null ? undefined : (boundsOfIds(regions, [place.parent]) ?? undefined),
        note: `${place.name} has no position that can be read, so the map frames ${placeOf(place.parent)?.name ?? 'its region'}, the region it is in.`,
    }
}

function legendOf(place: Place): MapLegendEntry[] {
    const others = { label: 'Other places', ...AREA_EMPHASIS.plain }
    if (place.level === 'site') return [{ label: 'Selected site', color: SELECTION_COLOR, shape: 'point' }, others]
    if (place.level === 'region')
        return [
            { label: 'Selected region', ...AREA_EMPHASIS.selected },
            { label: 'Sites in it', color: HIGHLIGHT_COLOR, shape: 'point' },
            others,
        ]
    return [{ label: 'Regions in it', ...AREA_EMPHASIS.highlighted }, others]
}

/** The forms a place reports: periodic reports from a region or a site, events and visits from a site. */
function formsAt(place: Place) {
    return FORMS.filter((form) =>
        place.level === 'country' ? false : form.id === 'FRM-STOCK' ? place.level === 'region' : place.level === 'site',
    )
}

/** The places records are made at: the country, its regions and their sites, in a tree and on a map that share one selection, the selected place's facts beside them. */
export function Places({ selected: given }: { selected?: string }) {
    const selected = placeOf(given) === undefined ? COUNTRY : (given as string)
    const place = placeOf(selected) as Place
    const [query, setQuery] = useState('')
    const { rows } = useCollection(receipts)
    const shown = useMemo(() => framing(place), [place])
    const path = pathOf(selected)
    const below = new Set([selected, ...under(selected).map((one) => one.id)])
    const here = (rows ?? []).filter((receipt) => below.has(receipt.place))
    const unplaced = sites.features.filter((site) => !site.geometry.coordinates.every(Number.isFinite)).length
    useFoot(path.map((one) => one.name).join(' / '), undefined, [selected])
    const select = (id: string | null) => go(id === null || id === COUNTRY ? '/places' : `/places/${id}`)

    const facts = (
        <>
            <InspectorSection title={LEVEL_LABEL[place.level]}>
                <DescriptionList
                    termWidth="5.5rem"
                    items={[
                        { term: 'Code', value: place.id, code: true },
                        ...(place.level === 'site'
                            ? [
                                  {
                                      term: 'Position',
                                      value:
                                          place.position === null
                                              ? 'Could not be read'
                                              : place.position.map((value) => value.toFixed(4)).join(', '),
                                      code: place.position !== null,
                                  },
                              ]
                            : [
                                  {
                                      term: place.level === 'country' ? 'Regions' : 'Sites',
                                      value: NUMBER.format(childrenOf(place.id).length),
                                      numeric: true,
                                  },
                                  ...(place.level === 'country'
                                      ? [{ term: 'Sites', value: NUMBER.format(sites.features.length), numeric: true }]
                                      : []),
                              ]),
                        {
                            term: 'Path',
                            value: (
                                <span>
                                    {path.map((one, index) => (
                                        <span key={one.id}>
                                            {index > 0 && ' / '}
                                            {one.id === selected ? (
                                                one.name
                                            ) : (
                                                <TextLink href={one.id === COUNTRY ? '#/places' : `#/places/${one.id}`}>
                                                    {one.name}
                                                </TextLink>
                                            )}
                                        </span>
                                    ))}
                                </span>
                            ),
                        },
                    ]}
                />
            </InspectorSection>
            <InspectorSection title={`Forms reported here (${String(formsAt(place).length)})`}>
                {formsAt(place).length === 0 ? (
                    <p className="text-help text-muted-foreground">Records are made at a region or a site; pick one to see its forms.</p>
                ) : (
                    <Stack gap="xs">
                        {formsAt(place).map((form) => (
                            <TextLink key={form.id} href={`#/forms/${form.id}`} className="text-sm">
                                {form.title} <span className="text-help text-muted-foreground">{KIND[form.kind].label}</span>
                            </TextLink>
                        ))}
                    </Stack>
                )}
            </InspectorSection>
            <InspectorSection title={`Recorded here (${String(here.length)})`}>
                {here.length === 0 ? (
                    <p className="text-help text-muted-foreground">No record the server holds names this place or a place under it.</p>
                ) : (
                    <Stack gap="sm">
                        <Row gap="xs" wrap>
                            {STATES.filter((state) => here.some((receipt) => receipt.state === state)).map((state) => (
                                <StatusChip
                                    key={state}
                                    status={state}
                                    label={`${String(here.filter((receipt) => receipt.state === state).length)} ${STATE_WORDS[state].label.toLowerCase()}`}
                                />
                            ))}
                        </Row>
                        {here.slice(0, 5).map((receipt) => (
                            <TextLink key={receipt.id} href={`#/responses/${receipt.receipt}`} className="text-sm">
                                {FORMS.find((form) => form.id === receipt.formId)?.title ?? receipt.formId}
                                <span className="block text-help text-muted-foreground">
                                    {when(receipt.receivedAt)} · <StateChip state={receipt.state} />
                                </span>
                            </TextLink>
                        ))}
                        <TextLink href="#/responses" className="text-sm">
                            All responses
                        </TextLink>
                    </Stack>
                )}
            </InspectorSection>
        </>
    )

    return (
        <Row gap="none" align="stretch" className="h-full min-h-0">
            <SubNav label="Hierarchy" search={<SearchField value={query} onChange={setQuery} placeholder="Search" />} defaultSize={272}>
                <Tree
                    label="Hierarchy"
                    nodes={PLACE_TREE}
                    selected={[selected]}
                    onSelect={(ids) => select(ids[0] ?? null)}
                    defaultExpanded={path
                        .slice(0, -1)
                        .map((one) => one.id)
                        .concat(place.level === 'site' ? [] : [selected])}
                    query={query}
                />
            </SubNav>
            <Fill>
                <Page className="h-full min-h-0">
                    <PageHeader
                        title="Places"
                        description="The places records are made at, in the hierarchy the server holds them in: where a record may be filed from, and which forms it may use."
                        actions={<ApiLink path={place.level === 'country' ? '/places' : `/places/${place.id}`} />}
                    />
                    <Row gap="inspector" align="stretch" stackBelow="xl" className="min-h-0 flex-1">
                        <Section
                            title="Map"
                            meta={`${count(regions.features.length, 'boundary', 'boundaries')}, ${count(sites.features.length - unplaced, 'point')}, no basemap offered`}
                            flush
                            fill
                            className="min-h-96 flex-1"
                        >
                            <MapView
                                label="Regions and sites"
                                framed={false}
                                basemaps={[]}
                                controls={{ zoom: true, projection: true }}
                                selected={selected === COUNTRY ? null : selected}
                                onSelectedChange={(id) => select(id)}
                                bounds={shown.bounds}
                                maxFitZoom={10}
                                notes={shown.note === undefined ? [] : [shown.note]}
                                className="h-full"
                            >
                                <BoundaryLayer id="regions" data={regions} highlighted={shown.highlighted} />
                                <PointLayer
                                    id="sites"
                                    data={sites}
                                    color="var(--muted-foreground)"
                                    radius={3}
                                    highlighted={place.level === 'region' ? shown.highlighted : []}
                                />
                                <MapOverlay corner="bottom-left">
                                    <MapLegend entries={legendOf(place)} className="w-48" />
                                </MapOverlay>
                            </MapView>
                        </Section>
                        <Row gap="none" align="stretch" className="self-stretch">
                            <Inspector title={place.name} code={place.id} status={<span>{LEVEL_LABEL[place.level]}</span>}>
                                {facts}
                            </Inspector>
                        </Row>
                    </Row>
                </Page>
            </Fill>
        </Row>
    )
}
