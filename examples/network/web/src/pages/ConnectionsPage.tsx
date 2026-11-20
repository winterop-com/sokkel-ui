import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import type { RunStatus } from '@winterop-com/sokkel-ui/lib/status'
import type { ConnectionFlow } from '@winterop-com/sokkel-ui-tracking/network'
import { MapPin } from 'lucide-react'

import { endpoint, formatBytes, formatRate } from '../format'
import type { GroupBy, Prefs } from '../model'
import { phaseOf, type Phase } from '../tones'
import type { Snapshot, WatchState } from '../watch'

/** The run state a connection's phase is drawn in, for its chip's color. */
const PHASE_STATUS: Record<Phase, RunStatus> = {
    established: 'succeeded',
    opening: 'queued',
    datagram: 'running',
    closing: 'cancelled',
}

const UNAVAILABLE = 'Unavailable'

function columns(state: WatchState): DataColumn<ConnectionFlow>[] {
    const metered = state.metered
    return [
        {
            id: 'process',
            header: 'Process',
            width: 'minmax(8rem,1fr)',
            cell: (row) => row.process ?? 'Unknown',
            sortValue: (row) => row.process ?? '',
        },
        {
            id: 'pid',
            header: 'PID',
            width: '4.5rem',
            align: 'end',
            cell: (row) => row.pid ?? '',
            sortValue: (row) => row.pid ?? 0,
            stack: 'secondary',
        },
        {
            id: 'protocol',
            header: 'Protocol',
            width: '5rem',
            cell: (row) => row.protocol.toUpperCase(),
            sortValue: (row) => row.protocol,
            stack: 'secondary',
        },
        {
            id: 'local',
            header: 'Local',
            width: 'content',
            cell: (row) => <span className="font-mono">{endpoint(row.localAddress, row.localPort)}</span>,
            sortValue: (row) => row.localPort,
        },
        {
            id: 'remote',
            header: 'Remote',
            width: 'content',
            cell: (row) => <span className="font-mono">{endpoint(row.remoteAddress, row.remotePort)}</span>,
            sortValue: (row) => row.remoteAddress,
        },
        {
            id: 'place',
            header: 'Place',
            width: 'minmax(9rem,1fr)',
            cell: (row) =>
                state.places.get(row.remoteAddress)?.label ??
                (row.scope === 'public' ? 'Not known' : `${row.scope[0].toUpperCase()}${row.scope.slice(1)}`),
            sortValue: (row) => state.places.get(row.remoteAddress)?.label ?? `~${row.scope}`,
        },
        {
            id: 'state',
            header: 'State',
            width: '9rem',
            cell: (row) => <StatusChip status={PHASE_STATUS[phaseOf(row.state)]} label={row.state ?? 'No state'} />,
            sortValue: (row) => row.state ?? '',
            stack: 'secondary',
        },
        {
            id: 'in',
            header: 'In',
            width: '6rem',
            align: 'end',
            cell: (row) => (metered ? formatBytes(row.totalIn) : UNAVAILABLE),
            sortValue: (row) => row.totalIn,
            aggregate: metered ? (rows) => formatBytes(rows.reduce((sum, row) => sum + row.totalIn, 0)) : undefined,
            stack: 'secondary',
        },
        {
            id: 'out',
            header: 'Out',
            width: '6rem',
            align: 'end',
            cell: (row) => (metered ? formatBytes(row.totalOut) : UNAVAILABLE),
            sortValue: (row) => row.totalOut,
            aggregate: metered ? (rows) => formatBytes(rows.reduce((sum, row) => sum + row.totalOut, 0)) : undefined,
            stack: 'secondary',
        },
        {
            id: 'rate',
            header: 'Rate',
            width: '6.5rem',
            align: 'end',
            cell: (row) => (metered ? formatRate(row.rateIn + row.rateOut) : UNAVAILABLE),
            sortValue: (row) => row.rateIn + row.rateOut,
            aggregate: metered ? (rows) => formatRate(rows.reduce((sum, row) => sum + row.rateIn + row.rateOut, 0)) : undefined,
            stack: 'secondary',
        },
    ]
}

/** Every connection open now (or at the time looked back at), live, searchable and gathered by process or by remote host. */
export function ConnectionsPage({
    state,
    snapshot,
    prefs,
    onGroupBy,
    onShowOnMap,
}: {
    state: WatchState
    snapshot: Snapshot
    prefs: Prefs
    onGroupBy: (by: GroupBy) => void
    onShowOnMap: (address: string) => void
}) {
    const groupBy =
        prefs.groupBy === 'process'
            ? (row: ConnectionFlow) => row.process ?? 'Unknown'
            : prefs.groupBy === 'remote'
              ? (row: ConnectionFlow) => row.remoteAddress
              : undefined
    return (
        <Stack gap="section" className="h-full">
            <PageHeader
                title="Connections"
                count={`${String(snapshot.connections.length)} open to ${String(snapshot.remotes.length)} hosts`}
                description={
                    state.metered
                        ? undefined
                        : 'Read through lsof or netstat, which list sockets and no traffic, so bytes and rates are unavailable.'
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                columns={columns(state)}
                rows={snapshot.connections}
                rowKey={(row) => row.key}
                searchBy={(row) =>
                    [
                        row.process,
                        row.pid,
                        row.protocol,
                        row.localAddress,
                        row.localPort,
                        row.remoteAddress,
                        row.remotePort,
                        row.state,
                        state.places.get(row.remoteAddress)?.label,
                    ]
                        .filter((part) => part !== undefined)
                        .join(' ')
                }
                searchField={{ placeholder: 'Search' }}
                toolbar={
                    <Segmented<GroupBy>
                        label="Group by"
                        size="sm"
                        value={prefs.groupBy}
                        onValueChange={onGroupBy}
                        options={[
                            { value: 'none', label: 'No groups' },
                            { value: 'process', label: 'Process' },
                            { value: 'remote', label: 'Remote host' },
                        ]}
                    />
                }
                groupBy={groupBy}
                groupLabel={
                    prefs.groupBy === 'remote'
                        ? (key) => {
                              const place = state.places.get(key)
                              return place === undefined ? key : `${key}, ${place.label}`
                          }
                        : undefined
                }
                defaultSort={{ column: 'rate', direction: 'desc' }}
                rowActions={(row) =>
                    state.places.has(row.remoteAddress)
                        ? [{ id: 'map', label: 'Show on the map', icon: <MapPin />, onSelect: () => onShowOnMap(row.remoteAddress) }]
                        : []
                }
                onOpen={(row) => {
                    if (state.places.has(row.remoteAddress)) onShowOnMap(row.remoteAddress)
                }}
                empty={
                    state.source === 'machine' && state.history.length === 0
                        ? 'Waiting for the first reading of this machine.'
                        : 'No connections open now.'
                }
            />
        </Stack>
    )
}
