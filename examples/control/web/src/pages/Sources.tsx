import { CheckList } from '@winterop-com/sokkel-ui/CheckList'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Freshness } from '@winterop-com/sokkel-ui/Freshness'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { Sparkline } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { CHECK_WORDS } from '@winterop-com/sokkel-ui-tracking/checks'
import type { SourceState } from '@winterop-com/sokkel-ui-tracking/sources'
import { History, ListChecks, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import { go } from 'tidevann-shared/router'

import { MODE_WORDS, SOURCE_ICONS, SOURCE_KINDS } from '../parts/words'
import { chooseSource } from '../settings'
import { sourceOf } from '../sources'
import { command } from '../store'
import { clockTime, lastLatency, latencySeries, sourceNote, type Watch } from '../watch'

const TONE = { up: 'good', degraded: 'warning', down: 'critical', unknown: 'muted' } as const

const every = (interval: number): string =>
    interval >= 3_600_000
        ? `${String(interval / 3_600_000)} h`
        : interval >= 60_000
          ? `${String(interval / 60_000)} min`
          : `${String(interval / 1000)} s`

const percent = (share: number | undefined): string => (share === undefined ? '' : `${(share * 100).toFixed(share === 1 ? 0 : 1)}%`)

const columns = (now: number): DataColumn<SourceState>[] => [
    {
        id: 'source',
        header: 'Source',
        width: 'minmax(11rem,1.2fr)',
        cell: (source) => {
            const Icon = SOURCE_ICONS[source.id]
            return (
                <Row gap="xs">
                    {Icon !== undefined && <Icon aria-hidden className="size-4 text-muted-foreground" />}
                    {source.label}
                </Row>
            )
        },
        sortValue: (source) => source.label,
        stack: 'lead',
    },
    { id: 'status', header: 'Status', width: '8rem', cell: (source) => <StatusChip status={source.status} dot />, stack: 'secondary' },
    { id: 'mode', header: 'Read', width: '7rem', cell: (source) => MODE_WORDS[source.mode], stack: 'secondary' },
    {
        id: 'latency',
        header: 'Latency',
        width: '7rem',
        align: 'end',
        cell: (source) => (lastLatency(source) === undefined ? '' : `${String(lastLatency(source))} ms`),
        sortValue: (source) => lastLatency(source) ?? -1,
    },
    {
        id: 'trend',
        header: 'Last reads',
        width: '9rem',
        cell: (source) =>
            latencySeries(source).length > 1 ? (
                <Sparkline
                    values={latencySeries(source)}
                    tone={TONE[source.status]}
                    label={`${source.label}, latency over the last reads`}
                />
            ) : (
                ''
            ),
        stack: 'none',
    },
    { id: 'uptime', header: 'Uptime', width: '6rem', align: 'end', cell: (source) => percent(source.summary.uptime), stack: 'none' },
    { id: 'every', header: 'Every', width: '5rem', align: 'end', cell: (source) => every(source.interval), stack: 'none' },
    {
        id: 'read',
        header: 'Last read',
        width: '8rem',
        cell: (source) => <Freshness at={source.readAt ?? null} now={now} />,
        stack: 'secondary',
    },
    { id: 'note', header: 'Note', width: 'minmax(10rem,1.5fr)', cell: (source) => sourceNote(source) ?? '', stack: 'none' },
]

/** Every source as a row: how it stands, how it is read, how fast it answers and what it last said. */
export function Sources({ watch, opened }: { watch: Watch; opened: string | null }) {
    const cells = useMemo(() => columns(watch.now), [watch.now])
    const { sources } = watch.state
    const up = sources.filter((source) => source.status === 'up').length
    return (
        <Page className="h-full">
            <PageHeader title="Sources" count={`${String(up)} of ${String(sources.length)} up`} />
            <DataTable
                className="min-h-0 flex-1"
                columns={cells}
                rows={sources}
                rowKey={(source) => source.id}
                onOpen={(source) => go(`/sources/${source.id}`)}
                opened={(source) => source.id === opened}
                empty="No sources."
                minWidth="60rem"
            />
        </Page>
    )
}

/** One source in full: its switches, its checks' last results, what it is and whose, and its changes of status. */
export function SourcePanel({ watch, id }: { watch: Watch; id: string | null }) {
    const state = watch.state.sources.find((source) => source.id === id)
    const source = id === null ? undefined : sourceOf(id)
    if (state === undefined || source === undefined)
        return (
            <SidePanel
                tabs={[
                    {
                        id: 'source',
                        label: 'Source',
                        icon: ListChecks,
                        content: (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyTitle>No source picked</EmptyTitle>
                                    <EmptyDescription>Pick one to see its checks and its history.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ),
                    },
                ]}
            />
        )
    const { zone } = watch.options
    const switchSource = (patch: { on?: boolean; live?: boolean }) => {
        chooseSource(state.id, patch)
        if (patch.on !== undefined) command({ do: 'enable', id: state.id, on: patch.on })
        if (patch.live !== undefined) command({ do: 'live', id: state.id, on: patch.live })
    }
    const checks = source.checks.map((check) => {
        const result = state.results.find((each) => each.check === check.id)
        const failure = result?.failure
        const values = Object.entries(result?.values ?? {})
            .map(([name, value]) => `${name} ${String(value)}`)
            .join(', ')
        return {
            name: check.label,
            status:
                result === undefined
                    ? ('warn' as const)
                    : result.status === 'up'
                      ? ('ok' as const)
                      : result.status === 'degraded'
                        ? ('warn' as const)
                        : ('fail' as const),
            detail:
                result === undefined
                    ? 'Not read yet'
                    : failure === undefined
                      ? [result.latency === undefined ? undefined : `${String(Math.round(result.latency))} ms`, values]
                            .filter(Boolean)
                            .join(' · ')
                      : `${CHECK_WORDS.reasons[failure.reason]}${failure.actual === undefined ? '' : `: ${failure.actual}`}`,
            hint: failure?.expected === undefined ? undefined : `Expected ${failure.expected}`,
        }
    })
    return (
        <SidePanel
            defaultActive="checks"
            tabs={[
                {
                    id: 'checks',
                    label: 'Checks',
                    icon: ListChecks,
                    content: (
                        <>
                            <PanelSection
                                title={state.label}
                                actions={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!state.enabled || state.reading}
                                        onClick={() => command({ do: 'refresh', id: state.id })}
                                    >
                                        <RefreshCw aria-hidden />
                                        Read now
                                    </Button>
                                }
                            >
                                <DescriptionList
                                    size="sm"
                                    items={[
                                        { term: 'Status', value: <StatusChip status={state.status} dot /> },
                                        { term: 'Since', value: state.since === undefined ? undefined : clockTime(state.since, zone) },
                                        { term: 'Gives', value: SOURCE_KINDS[state.kind] ?? state.kind },
                                        { term: 'What', value: source.summary },
                                        { term: 'Limit', value: source.limit },
                                        {
                                            term: 'On',
                                            value: (
                                                <Switch
                                                    aria-label={`Read ${state.label}`}
                                                    checked={state.enabled}
                                                    onCheckedChange={(on) => switchSource({ on })}
                                                />
                                            ),
                                        },
                                        {
                                            term: 'Live',
                                            value:
                                                source.read === undefined ? (
                                                    'Simulated alone'
                                                ) : (
                                                    <Switch
                                                        aria-label={`Read ${state.label} live`}
                                                        checked={state.live}
                                                        disabled={!state.enabled}
                                                        onCheckedChange={(live) => switchSource({ live })}
                                                    />
                                                ),
                                        },
                                        { term: 'Note', value: sourceNote(state) },
                                        {
                                            term: 'Data',
                                            value:
                                                source.attribution === undefined || state.mode !== 'live' ? undefined : (
                                                    <>
                                                        <TextLink href={source.attribution.href} external>
                                                            {source.attribution.name}
                                                        </TextLink>
                                                        {', '}
                                                        {source.attribution.licenseHref === undefined ? (
                                                            source.attribution.license
                                                        ) : (
                                                            <TextLink href={source.attribution.licenseHref} external>
                                                                {source.attribution.license}
                                                            </TextLink>
                                                        )}
                                                    </>
                                                ),
                                        },
                                    ]}
                                />
                            </PanelSection>
                            <PanelSection title="Last results">
                                <CheckList checks={checks} />
                            </PanelSection>
                        </>
                    ),
                },
                {
                    id: 'history',
                    label: 'History',
                    icon: History,
                    content:
                        state.transitions.length === 0 ? (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyTitle>No changes yet</EmptyTitle>
                                    <EmptyDescription>Each change of status is listed here, and raised as an alert.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <PanelSection title="Changes of status">
                                <Timeline
                                    events={[...state.transitions].reverse().map((step) => ({
                                        id: String(step.at),
                                        title: `${CHECK_WORDS.statuses[step.to]}, from ${CHECK_WORDS.statuses[step.from].toLowerCase()}`,
                                        at: clockTime(step.at, zone),
                                        tone: step.to,
                                    }))}
                                />
                            </PanelSection>
                        ),
                },
            ]}
        />
    )
}
