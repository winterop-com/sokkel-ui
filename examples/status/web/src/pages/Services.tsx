import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Sparkline } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { formatUptime, overallUptime } from '@winterop-com/sokkel-ui/UptimeBar'

import { go } from 'tidevann-shared/router'
import { type Service, SERVICE_IDS, SERVICES } from '../data'
import { type LiveState, useLive } from '../live'
import { type UptimeByService, useUptime } from '../parts/uptime'
import { formatCount, formatMs, formatRate } from '../status'

function columns(state: LiveState, uptime: UptimeByService): DataColumn<Service>[] {
    const last = (service: Service) => state.readings[service.id][state.readings[service.id].length - 1]
    return [
        { id: 'service', header: 'Service', width: '8rem', cell: (service) => service.id, sortValue: (service) => service.id },
        {
            id: 'state',
            header: 'State',
            width: '8.5rem',
            cell: (service) => <StatusChip status={state.health[service.id]} />,
            sortValue: (service) => state.health[service.id],
            stack: 'secondary',
        },
        {
            id: 'what',
            header: 'What it does',
            width: 'minmax(14rem,1fr)',
            cell: (service) => service.description,
            stack: 'primary',
        },
        {
            id: 'trend',
            header: 'Latency',
            width: '9rem',
            resizable: false,
            cell: (service) => (
                <Sparkline
                    values={state.readings[service.id].map((reading) => reading.p95)}
                    width={112}
                    height={22}
                    tone={state.health[service.id] === 'operational' ? 'primary' : 'critical'}
                    label={`${service.id} latency, the last minutes`}
                />
            ),
            stack: 'none',
        },
        {
            id: 'p95',
            header: 'p95',
            width: '6rem',
            align: 'end',
            cell: (service) => formatMs(last(service)?.p95 ?? 0),
            sortValue: (service) => last(service)?.p95 ?? 0,
            stack: 'secondary',
        },
        {
            id: 'errors',
            header: 'Errors',
            width: '5.5rem',
            align: 'end',
            cell: (service) => formatRate(last(service)?.errors ?? 0),
            sortValue: (service) => last(service)?.errors ?? 0,
            stack: 'secondary',
        },
        {
            id: 'load',
            header: 'Requests',
            width: '6.5rem',
            align: 'end',
            cell: (service) => `${formatCount(last(service)?.load ?? 0)}/s`,
            sortValue: (service) => last(service)?.load ?? 0,
            stack: 'none',
        },
        {
            id: 'uptime',
            header: 'Uptime, 90 days',
            width: '8.5rem',
            align: 'end',
            cell: (service) => {
                const overall = overallUptime(uptime[service.id])
                return overall === null ? '-' : formatUptime(overall)
            },
            sortValue: (service) => overallUptime(uptime[service.id]) ?? 0,
            stack: 'secondary',
        },
        {
            id: 'host',
            header: 'Host',
            width: '12rem',
            cell: (service) => <span className="font-mono">{service.host}</span>,
            sortValue: (service) => service.host,
            stack: 'none',
        },
    ]
}

/** The host is in the column menu, out of the way until asked for. */
const HIDDEN: ReadonlySet<string> = new Set(['host'])

/** Every service with its state, its latency now and over the last minutes, its errors and its uptime; a row opens it. */
export function Services() {
    const state = useLive()
    const uptime = useUptime()
    const down = SERVICE_IDS.filter((id) => state.health[id] !== 'operational').length
    return (
        <Stack gap="section" className="h-full">
            <PageHeader title="Services" count={down === 0 ? 'all operational' : `${String(down)} not operational`} />
            <DataTable
                className="min-h-0 flex-1"
                minWidth="auto"
                columns={columns(state, uptime)}
                rows={SERVICES}
                rowKey={(service) => service.id}
                defaultHiddenColumns={HIDDEN}
                onOpen={(service) => go(`/services/${service.id}`)}
                rowActions={(service) => [
                    { id: 'open', label: 'Open', onSelect: () => go(`/services/${service.id}`) },
                    { id: 'host', label: 'Copy the host', onSelect: () => void navigator.clipboard?.writeText(service.host) },
                ]}
            />
        </Stack>
    )
}
