import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { MAP_TONE_COLORS } from '@winterop-com/sokkel-ui-maps/tone'
import { UNIT_METERS, UNIT_SYMBOLS, type DistanceUnit } from '@winterop-com/sokkel-ui-maps/geodesy'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Eye, EyeOff, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'

import { entries, ME, zones, type ZoneRow } from '../data'
import { EDGES, FILLS, TONES, ZoneDialog } from '../parts/ZoneDialog'
import { WatchMap } from '../parts/WatchMap'
import { mapTrack, picked, useWatch } from '../watch'
import { zonesOf } from './Watch'

const EARTH = 6_371_008.8

/** A zone's area in square meters, on the sphere, from its outline. */
function areaOf(ring: readonly (readonly [number, number])[]): number {
    const radians = Math.PI / 180
    let sum = 0
    for (let index = 0; index < ring.length; index += 1) {
        const [x1, y1] = ring[index]
        const [x2, y2] = ring[(index + 1) % ring.length]
        sum += (x2 - x1) * radians * (2 + Math.sin(y1 * radians) + Math.sin(y2 * radians))
    }
    return Math.abs((sum * EARTH * EARTH) / 2)
}

/** An area in the square of the unit: `1,240 NM²`. */
function formatArea(meters: number, unit: DistanceUnit): string {
    const value = meters / UNIT_METERS[unit] ** 2
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)} ${UNIT_SYMBOLS[unit]}²`
}

const label = <T extends string>(items: readonly { value: T; label: string }[], value: T) =>
    items.find((item) => item.value === value)?.label ?? value

/** Shows or hides a zone on the maps, and logs it. */
function setShown(zone: ZoneRow, visible: boolean, at: number): void {
    void zones.update(zone.id, { visible })
    void entries.create({ at, kind: 'zone', name: zone.label, detail: `${visible ? 'Showed' : 'Hid'} the zone ${zone.label}`, by: ME })
}

/** The watch's zones in a table beside a map of them: each with its tone, how it is drawn, its size and what is in it now, shown or hidden and edited. */
export function Zones() {
    const watch = useWatch()
    const selected = useStore(picked)
    const [search, setSearch] = useState('')
    const [editing, setEditing] = useState<ZoneRow | undefined>(undefined)
    const rows = watch.zones ?? []
    const unit = watch.options.unit
    const counts = useMemo(() => {
        const inside = new Map<string, number>()
        for (const track of watch.picture.tracks)
            for (const zone of zonesOf(track, rows)) inside.set(zone.id, (inside.get(zone.id) ?? 0) + 1)
        return inside
    }, [watch.picture.tracks, rows])
    const tracks = useMemo(() => watch.picture.tracks.map((track) => mapTrack(track, { trails: false })), [watch.picture.tracks])
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const listed = rows.filter((zone) => words.every((word) => `${zone.label} ${zone.note} ${zone.tone}`.toLowerCase().includes(word)))

    const columns: DataColumn<ZoneRow>[] = [
        {
            id: 'name',
            header: 'Zone',
            width: 'minmax(9rem,1.2fr)',
            cell: (zone) => (
                <Row as="span" gap="sm">
                    <Dot color={MAP_TONE_COLORS[zone.tone]} />
                    {zone.label}
                </Row>
            ),
            sortValue: (zone) => zone.label,
        },
        {
            id: 'tone',
            header: 'Tone',
            width: '5.5rem',
            cell: (zone) => label(TONES, zone.tone),
            sortValue: (zone) => zone.tone,
            stack: 'secondary',
        },
        {
            id: 'drawn',
            header: 'Drawn',
            width: 'minmax(7rem,1fr)',
            cell: (zone) => `${label(FILLS, zone.fill)}, ${label(EDGES, zone.edge).toLowerCase()}`,
            stack: 'secondary',
        },
        {
            id: 'area',
            header: 'Area',
            width: '6.5rem',
            align: 'end',
            cell: (zone) => formatArea(areaOf(zone.area), unit),
            sortValue: (zone) => areaOf(zone.area),
            stack: 'secondary',
        },
        {
            id: 'inside',
            header: 'Tracks',
            width: '5rem',
            align: 'end',
            cell: (zone) => String(counts.get(zone.id) ?? 0),
            sortValue: (zone) => counts.get(zone.id) ?? 0,
            stack: 'secondary',
        },
        {
            id: 'shown',
            header: 'Shown',
            width: '5rem',
            cell: (zone) => (
                <Switch
                    aria-label={`Show ${zone.label}`}
                    checked={zone.visible}
                    onCheckedChange={(visible) => setShown(zone, visible, watch.now)}
                />
            ),
            sortValue: (zone) => Number(zone.visible),
        },
    ]

    return (
        <Stack gap="section" className="h-full">
            <PageHeader title="Zones" count={`${String(rows.filter((zone) => zone.visible).length)} of ${String(rows.length)} shown`} />
            <SplitPane
                className="min-h-0 flex-1"
                defaultShare={0.6}
                minShare={0.35}
                maxShare={0.7}
                first={
                    <DataTable
                        className="h-full"
                        columns={columns}
                        rows={listed}
                        rowKey={(zone) => zone.id}
                        loading={watch.zones === undefined && watch.error === undefined}
                        error={watch.error}
                        search={<SearchField value={search} onChange={setSearch} placeholder="Search" />}
                        onOpen={(zone) => picked.set(zone.id)}
                        opened={(zone) => zone.id === selected}
                        rowActions={(zone) => [
                            { id: 'edit', label: 'Edit', icon: <Pencil />, inline: true, onSelect: () => setEditing(zone) },
                            {
                                id: 'shown',
                                label: zone.visible ? 'Hide' : 'Show',
                                icon: zone.visible ? <EyeOff /> : <Eye />,
                                onSelect: () => setShown(zone, !zone.visible, watch.now),
                            },
                        ]}
                        empty="No zone matches."
                    />
                }
                second={
                    <WatchMap
                        label="Zones"
                        className="h-full"
                        tracks={tracks}
                        zones={rows}
                        options={watch.options}
                        selected={selected}
                        onSelectedChange={(id) => picked.set(id)}
                        tools={false}
                    />
                }
            />
            <ZoneDialog zone={editing} onOpenChange={(open) => !open && setEditing(undefined)} now={watch.now} />
        </Stack>
    )
}
