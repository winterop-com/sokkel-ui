import { DashboardGrid, DashboardPanel, KpiRow } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { formatUptime, overallUptime } from '@winterop-com/sokkel-ui/UptimeBar'
import { CircleCheck, Pause, Play, Siren } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { SERVICE_IDS, SERVICES, SITES } from '../data'
import { useLive } from '../live'
import { IncidentTable } from '../parts/IncidentTable'
import { ServiceTiles } from '../parts/ServiceTiles'
import { SitesMap } from '../parts/SitesMap'
import { UptimeList } from '../parts/UptimeList'
import { useUptime } from '../parts/uptime'
import { useRows } from '../rows'
import { setSettings, type Settings } from '../settings'
import { formatClock, formatCount, formatMs } from '../status'

/** The board: every service as a tile, the sites on a map, the open incidents and the last ninety days. */
export function Overview({ options, onReport }: { options: Settings; onReport: () => void }) {
    const state = useLive()
    const rows = useRows()
    const uptime = useUptime()
    const [site, setSite] = useState<string | null>(null)
    const open = (rows.incidents ?? []).filter((incident) => incident.state !== 'resolved')
    const working = SERVICE_IDS.filter((id) => state.health[id] === 'operational').length
    const sitesWorking = SITES.filter((one) => state.siteHealth[one.id] === 'operational').length
    const last = (id: (typeof SERVICE_IDS)[number]) => state.readings[id][state.readings[id].length - 1]
    const requests = SERVICE_IDS.reduce((sum, id) => sum + (last(id)?.load ?? 0), 0)
    const apiP95 = last('api')?.p95 ?? 0
    const all = SERVICE_IDS.map((id) => overallUptime(uptime[id])).filter((value): value is number => value !== null)
    const average = all.length === 0 ? null : all.reduce((sum, value) => sum + value, 0) / all.length
    return (
        <Stack gap="page">
            <PageHeader
                title="Overview"
                description={
                    options.live
                        ? `Live, a reading every ${String(options.interval / 1000)} s, the last at ${formatClock(new Date(state.at), options.clock)}.`
                        : `Paused at ${formatClock(new Date(state.at), options.clock)}.`
                }
                actions={
                    <>
                        <Button variant="outline" onClick={() => setSettings({ live: !options.live })}>
                            {options.live ? <Pause aria-hidden /> : <Play aria-hidden />}
                            {options.live ? 'Pause' : 'Resume'}
                        </Button>
                        <Button onClick={onReport}>
                            <Siren aria-hidden />
                            Report incident
                        </Button>
                    </>
                }
            />
            <KpiRow
                items={[
                    { id: 'services', label: 'Services operational', value: `${String(working)} of ${String(SERVICES.length)}` },
                    { id: 'sites', label: 'Sites operational', value: `${String(sitesWorking)} of ${String(SITES.length)}` },
                    { id: 'open', label: 'Open incidents', value: String(open.length), note: open[0]?.code },
                    { id: 'uptime', label: 'Uptime, 90 days', value: average === null ? '-' : formatUptime(average) },
                    { id: 'requests', label: 'Requests', value: formatCount(requests), unit: '/s', note: `api p95 ${formatMs(apiP95)}` },
                    { id: 'on-call', label: 'On call', value: rows.onCall?.person ?? '-', note: 'Hand over on the On call page' },
                ]}
            />
            <ServiceTiles state={state} uptime={uptime} />
            <DashboardGrid>
                <DashboardPanel title="Sites" subtitle="by state, live" span="two-thirds" flush className="min-h-96">
                    <SitesMap
                        state={state}
                        open={open}
                        selected={site}
                        onSelectedChange={setSite}
                        onIncident={(incident) => go(`/incidents/${incident.id}`)}
                        className="min-h-80 flex-1"
                    />
                </DashboardPanel>
                <DashboardPanel
                    title="Open incidents"
                    subtitle={open.length === 0 ? 'none' : String(open.length)}
                    span="third"
                    flush
                    actions={
                        <Button variant="ghost" size="sm" onClick={() => go('/incidents')}>
                            All
                        </Button>
                    }
                >
                    <IncidentTable
                        rows={open}
                        compact
                        className="min-h-0 flex-1"
                        empty={
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <CircleCheck aria-hidden />
                                    </EmptyMedia>
                                    <EmptyTitle>Nothing open</EmptyTitle>
                                    <EmptyDescription>Every incident is resolved.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        }
                    />
                </DashboardPanel>
                <DashboardPanel title="Uptime" subtitle="the last 90 days" span="full">
                    <UptimeList
                        services={SERVICES}
                        health={state.health}
                        uptime={uptime}
                        onDay={(service, day) => go(`/services/${service.id}/${day.date}`)}
                    />
                </DashboardPanel>
            </DashboardGrid>
        </Stack>
    )
}
