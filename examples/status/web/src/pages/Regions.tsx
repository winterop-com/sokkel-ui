import { ChipBar } from '@winterop-com/sokkel-ui/ChipBar'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { Sparkline } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import type { Bounds } from '@winterop-com/sokkel-ui-maps/geometry'
import { Activity } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { type Site, SITES } from '../data'
import { type LiveState, trigger, useLive } from '../live'
import { SitesMap } from '../parts/SitesMap'
import { useRows } from '../rows'
import { formatMs } from '../status'

const REGIONS = ['All', ...new Set(SITES.map((site) => site.region))] as const

/** The box around some sites, with a margin, for the map to frame. */
function boundsOf(sites: readonly Site[]): Bounds | undefined {
    if (sites.length === 0) return undefined
    const lngs = sites.map((site) => site.at[0])
    const lats = sites.map((site) => site.at[1])
    return [Math.min(...lngs) - 6, Math.min(...lats) - 6, Math.max(...lngs) + 6, Math.max(...lats) + 6]
}

function columns(state: LiveState): DataColumn<Site>[] {
    const last = (site: Site) => state.sites[site.id][state.sites[site.id].length - 1] ?? 0
    return [
        { id: 'city', header: 'City', width: 'minmax(8rem,1fr)', cell: (site) => site.city, sortValue: (site) => site.city },
        {
            id: 'state',
            header: 'State',
            width: '8.5rem',
            cell: (site) => <StatusChip status={state.siteHealth[site.id]} />,
            sortValue: (site) => state.siteHealth[site.id],
            stack: 'secondary',
        },
        {
            id: 'country',
            header: 'Country',
            width: '8rem',
            cell: (site) => site.country,
            sortValue: (site) => site.country,
            stack: 'secondary',
        },
        {
            id: 'trend',
            header: 'Round trip',
            width: '7.5rem',
            resizable: false,
            cell: (site) => (
                <Sparkline
                    values={state.sites[site.id]}
                    width={96}
                    height={20}
                    tone={state.siteHealth[site.id] === 'operational' ? 'primary' : 'critical'}
                    label={`${site.city} round trip, the last minutes`}
                />
            ),
            stack: 'none',
        },
        {
            id: 'now',
            header: 'Now',
            width: '5.5rem',
            align: 'end',
            cell: (site) => formatMs(last(site)),
            sortValue: (site) => last(site),
            stack: 'secondary',
        },
    ]
}

/** Every site on a map and in a table, both live; a region frames its sites, and a site chosen in either is chosen in both. */
export function Regions() {
    const state = useLive()
    const rows = useRows()
    const [region, setRegion] = useState<(typeof REGIONS)[number]>('All')
    const [selected, setSelected] = useState<string | null>(null)
    const listed = region === 'All' ? SITES : SITES.filter((site) => site.region === region)
    const open = (rows.incidents ?? []).filter((incident) => incident.state !== 'resolved')
    const working = SITES.filter((site) => state.siteHealth[site.id] === 'operational').length
    return (
        <Stack gap="section" className="h-full">
            <PageHeader title="Regions" count={`${String(working)} of ${String(SITES.length)} sites operational`} />
            <ChipBar
                label="Region"
                value={region}
                onValueChange={(next) => {
                    setRegion(next)
                    setSelected(null)
                }}
                chips={REGIONS.map((value) => ({ value, label: value }))}
            />
            <SplitPane
                id="status-regions"
                className="min-h-0 flex-1"
                defaultShare={0.6}
                minShare={0.35}
                maxShare={0.75}
                narrow="stack"
                first={
                    <SitesMap
                        state={state}
                        open={open}
                        selected={selected}
                        onSelectedChange={setSelected}
                        onIncident={(incident) => go(`/incidents/${incident.id}`)}
                        bounds={region === 'All' ? undefined : boundsOf(listed)}
                        className="h-full min-h-80"
                    />
                }
                second={
                    <DataTable
                        className="h-full"
                        minWidth="auto"
                        stackBelow={420}
                        columns={columns(state)}
                        rows={listed}
                        rowKey={(site) => site.id}
                        onOpen={(site) => setSelected(site.id)}
                        opened={(site) => site.id === selected}
                        rowActions={(site) => [
                            { id: 'choose', label: 'Show on the map', onSelect: () => setSelected(site.id) },
                            {
                                id: 'degrade',
                                label: 'Simulate trouble here',
                                icon: <Activity />,
                                onSelect: () => {
                                    trigger('region', site.id)
                                    setSelected(site.id)
                                },
                            },
                        ]}
                    />
                }
            />
        </Stack>
    )
}
