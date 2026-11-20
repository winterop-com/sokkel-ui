import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Freshness } from '@winterop-com/sokkel-ui/Freshness'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import type { ConnectionFlow, RemoteFlow } from '@winterop-com/sokkel-ui-tracking/network'
import { ArrowLeft, Server } from 'lucide-react'

import { endpoint, formatBytes, formatRate } from '../format'
import type { Snapshot, WatchState } from '../watch'

const UNAVAILABLE = 'Unavailable'

function hostColumns(state: WatchState): DataColumn<RemoteFlow>[] {
    return [
        {
            id: 'host',
            header: 'Host',
            width: 'minmax(9rem,1fr)',
            cell: (flow) => (
                <span className="flex min-w-0 flex-col">
                    <span className="truncate font-mono">{flow.address}</span>
                    <span className="truncate text-muted-foreground">{state.places.get(flow.address)?.label ?? flow.scope}</span>
                </span>
            ),
            sortValue: (flow) => flow.address,
            stackTitle: 'free',
        },
        {
            id: 'rate',
            header: state.metered ? 'Rate' : 'Connections',
            width: '6rem',
            align: 'end',
            cell: (flow) => (state.metered ? formatRate(flow.rateIn + flow.rateOut) : flow.connections),
            sortValue: (flow) => (state.metered ? flow.rateIn + flow.rateOut : flow.connections),
            stack: 'secondary',
        },
    ]
}

function connectionColumns(state: WatchState): DataColumn<ConnectionFlow>[] {
    return [
        {
            id: 'process',
            header: 'Process',
            width: 'minmax(7rem,1fr)',
            cell: (connection) => (
                <span className="flex min-w-0 flex-col">
                    <span className="truncate">{connection.process ?? 'Unknown'}</span>
                    <span className="truncate font-mono text-muted-foreground">
                        {`${connection.protocol} ${endpoint(connection.localAddress, connection.localPort)}`}
                    </span>
                </span>
            ),
            sortValue: (connection) => connection.process ?? '',
            stackTitle: 'free',
        },
        {
            id: 'state',
            header: 'State',
            width: '6.5rem',
            cell: (connection) => connection.state ?? 'No state',
            stack: 'secondary',
        },
        {
            id: 'rate',
            header: 'Rate',
            width: '5.5rem',
            align: 'end',
            cell: (connection) => (state.metered ? formatRate(connection.rateIn + connection.rateOut) : UNAVAILABLE),
            sortValue: (connection) => connection.rateIn + connection.rateOut,
            stack: 'secondary',
        },
    ]
}

/**
 * The map's side panel: the busiest hosts to pick from, or the picked host with where it is, what
 * talks to it and each of its connections.
 */
export function HostPanel({
    state,
    snapshot,
    selected,
    onSelect,
    now,
}: {
    state: WatchState
    snapshot: Snapshot
    selected: string | null
    onSelect: (id: string | null) => void
    now: number
}) {
    const address = selected?.startsWith('flow:') === true ? selected.slice('flow:'.length) : undefined
    const host = address === undefined ? undefined : snapshot.remotes.find((flow) => flow.address === address)
    const place = address === undefined ? undefined : state.places.get(address)
    const mine = address === undefined ? [] : snapshot.connections.filter((connection) => connection.remoteAddress === address)

    let content
    if (address === undefined)
        content = (
            <PanelSection title="Busiest hosts">
                <DataTable
                    variant="list"
                    framed={false}
                    columns={hostColumns(state)}
                    rows={snapshot.remotes}
                    rowKey={(flow) => flow.address}
                    onOpen={(flow) => onSelect(`flow:${flow.address}`)}
                    minWidth="auto"
                    empty="No connections now."
                />
            </PanelSection>
        )
    else
        content = (
            <>
                <PanelSection
                    title="Host"
                    actions={
                        <Button size="xs" variant="ghost" onClick={() => onSelect(null)}>
                            <ArrowLeft aria-hidden />
                            All hosts
                        </Button>
                    }
                >
                    <DescriptionList
                        size="sm"
                        items={[
                            { term: 'Address', value: address, code: true },
                            { term: 'Place', value: place?.label ?? 'Not placed' },
                            ...(place?.radius === undefined
                                ? []
                                : [{ term: 'Within', value: `${String(place.radius)} km`, numeric: true }]),
                            { term: 'Connections', value: host?.connections ?? 0, numeric: true },
                            {
                                term: 'Processes',
                                value: host === undefined || host.processes.length === 0 ? 'None now' : host.processes.join(', '),
                            },
                            { term: 'Ports', value: host?.remotePorts.join(', ') ?? 'None now', code: true },
                            {
                                term: 'In',
                                value: !state.metered
                                    ? UNAVAILABLE
                                    : host === undefined
                                      ? 'None'
                                      : `${formatRate(host.rateIn)}, ${formatBytes(host.bytesIn)} in 10 s`,
                                numeric: true,
                            },
                            {
                                term: 'Out',
                                value: !state.metered
                                    ? UNAVAILABLE
                                    : host === undefined
                                      ? 'None'
                                      : `${formatRate(host.rateOut)}, ${formatBytes(host.bytesOut)} in 10 s`,
                                numeric: true,
                            },
                            {
                                term: 'Last seen',
                                value: host === undefined ? 'Not connected now' : <Freshness at={host.lastSeen} now={now} />,
                            },
                        ]}
                    />
                </PanelSection>
                <PanelSection title="Connections">
                    <DataTable
                        variant="list"
                        framed={false}
                        columns={connectionColumns(state)}
                        rows={mine}
                        rowKey={(connection) => connection.key}
                        minWidth="auto"
                        empty="No connection to this host now."
                    />
                </PanelSection>
            </>
        )

    return <SidePanel tabs={[{ id: 'hosts', label: address === undefined ? 'Hosts' : 'Host', icon: Server, content }]} soleTab="tab" />
}
