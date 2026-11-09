import { CheckList, type Check } from '@winterop-com/sokkel-ui/CheckList'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { LogView } from '@winterop-com/sokkel-ui/LogView'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Progress, ProgressLabel, ProgressValue } from '@winterop-com/sokkel-ui/primitives/progress'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Cpu, MessageSquarePlus, Power, PowerOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { chatWith } from '../actions'
import { usageOf as diskUsage, validRoot } from '../data/disk'
import { bytes, clockSeconds, counted, GB, uptime } from '../data/format'
import type { Loaded, LogEvent } from '../data/model'
import { ensureLoaded, MACHINE_MEMORY, startRunner, stopRunner, unloadModel } from '../engine/runner'
import { useApp } from '../state'
import { ModelSelect } from './ChatSettings'

/** A clock that ticks once a second, for times counted from now. */
function useNow(): number {
    const [now, setNow] = useState(Date.now)
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [])
    return now
}

const LEVEL: Record<LogEvent['level'], 'info' | 'warning' | 'error'> = { info: 'info', warn: 'warning', error: 'error' }

/** The local runner: whether it runs, the models it holds in memory and what they take, its health and its log. */
export function RunnerPage() {
    const { runner, loaded, models, prefs, events, downloads } = useApp()
    const now = useNow()
    const [pick, setPick] = useState(prefs.defaultModel)
    const [query, setQuery] = useState('')
    const [source, setSource] = useState<'all' | LogEvent['source']>('all')
    const status = runner?.status ?? 'down'
    const used = loaded.reduce((sum, one) => sum + one.memory, 0)
    const limit = prefs.memory * GB
    const disk = diskUsage(prefs.root, models, downloads)

    const load = (id: string) => {
        const model = models.find((one) => one.id === id)
        if (model === undefined) return
        void ensureLoaded(model).catch((error: unknown) =>
            toast.add({
                type: 'error',
                title: `Could not load ${model.name}`,
                description: error instanceof Error ? error.message : String(error),
            }),
        )
    }

    const columns: DataColumn<Loaded>[] = [
        {
            id: 'model',
            header: 'Model',
            width: 'minmax(11rem,1.4fr)',
            cell: (one) => <span className="font-mono">{one.model}</span>,
            sortValue: (one) => one.model,
        },
        {
            id: 'state',
            header: 'State',
            width: '8.5rem',
            cell: (one) =>
                one.state === 'ready' ? (
                    <StatusChip status="ready" />
                ) : (
                    <StatusChip status="loading" label={`loading ${String(Math.round(one.progress * 100))}%`} />
                ),
            sortValue: (one) => one.state,
        },
        {
            id: 'memory',
            header: 'Memory',
            width: '6.5rem',
            align: 'end',
            cell: (one) => <span className="tabular-nums">{bytes(one.memory)}</span>,
            sortValue: (one) => one.memory,
        },
        {
            id: 'context',
            header: 'Context',
            width: '6rem',
            align: 'end',
            cell: (one) => <span className="tabular-nums">{one.context.toLocaleString('en-US')}</span>,
            sortValue: (one) => one.context,
        },
        {
            id: 'answers',
            header: 'Answers',
            width: '5.5rem',
            align: 'end',
            cell: (one) => <span className="tabular-nums">{one.answers}</span>,
            sortValue: (one) => one.answers,
            stack: 'secondary',
        },
        {
            id: 'used',
            header: 'Last used',
            width: '7.5rem',
            cell: (one) => <RelativeTime date={one.usedAt} now={new Date(now)} className="text-muted-foreground" />,
            sortValue: (one) => one.usedAt,
        },
        {
            id: 'unloads',
            header: 'Unloads in',
            width: '7rem',
            cell: (one) =>
                prefs.keepAlive === 0 || one.state !== 'ready' ? (
                    <span className="text-muted-foreground">-</span>
                ) : (
                    <span className="text-muted-foreground tabular-nums">
                        {uptime(Math.max(0, one.usedAt + prefs.keepAlive * 60_000 - now) + 60_000)}
                    </span>
                ),
            stack: 'secondary',
        },
    ]

    const checks: Check[] = [
        {
            name: 'Runner',
            status: status === 'up' ? 'ok' : status === 'down' ? 'fail' : 'warn',
            detail:
                status === 'up'
                    ? `Answering on runner.example.org:8400 for ${uptime(now - (runner?.since ?? now))}`
                    : `The runner is ${status}`,
            hint: status === 'down' ? 'Start it with the button above.' : undefined,
        },
        {
            name: 'Memory',
            status: used > limit * 0.9 ? 'warn' : 'ok',
            detail: `${bytes(used)} of the ${bytes(limit)} the runner may use (${bytes(MACHINE_MEMORY)} in this machine)`,
            hint: used > limit * 0.9 ? 'Unload a model, or raise the limit in Settings.' : undefined,
        },
        {
            name: 'Library root',
            status: validRoot(prefs.root) ? 'ok' : 'fail',
            detail: `${prefs.root} on ${disk.disk.name}`,
            hint: validRoot(prefs.root) ? undefined : 'Set a folder path in Settings.',
        },
        {
            name: 'Disk room',
            status: disk.free < 50 * GB ? 'warn' : 'ok',
            detail: `${bytes(disk.free)} free`,
            hint: disk.free < 50 * GB ? 'Delete models kept twice on the Disk usage page.' : undefined,
        },
        {
            name: 'Keep-alive',
            status: 'ok',
            detail: prefs.keepAlive === 0 ? 'Models stay loaded until unloaded' : `Idle models unload after ${String(prefs.keepAlive)} min`,
        },
    ]

    const words = query.trim().toLowerCase()
    const lines = [...events]
        .sort((a, b) => a.time - b.time)
        .filter((event) => (source === 'all' || event.source === source) && (words === '' || event.text.toLowerCase().includes(words)))
        .slice(-400)
        .map((event) => ({ at: clockSeconds(event.time), level: LEVEL[event.level], source: event.source, text: event.text }))

    return (
        <Stack gap="page">
            <PageHeader
                title="Runner"
                code={`runner.example.org:8400 · ${runner?.version ?? ''}`}
                description="Loads models into memory and answers with them. Chats and comparisons load what they need."
                actions={
                    status === 'up' ? (
                        <Button size="sm" variant="outline" onClick={() => void stopRunner()}>
                            <PowerOff aria-hidden />
                            Stop
                        </Button>
                    ) : (
                        <Button size="sm" disabled={status !== 'down'} onClick={() => void startRunner()}>
                            <Power aria-hidden />
                            {status === 'starting' ? 'Starting' : status === 'stopping' ? 'Stopping' : 'Start'}
                        </Button>
                    )
                }
            />
            <Columns count={4} min="sm" gap="inspector">
                <Stat
                    variant="tile"
                    label="State"
                    value={<StatusChip status={status} />}
                    note={status === 'up' || status === 'down' ? `for ${uptime(now - (runner?.since ?? now))}` : undefined}
                />
                <Stat
                    variant="tile"
                    label="Loaded"
                    value={loaded.filter((one) => one.state === 'ready').length}
                    note={counted(models.length, 'model') + ' on disk'}
                />
                <Stat variant="tile" label="Memory" value={bytes(used)} note={`of ${bytes(limit)}`} good={used <= limit * 0.9} />
                <Stat
                    variant="tile"
                    label="Keep-alive"
                    value={prefs.keepAlive === 0 ? 'off' : `${String(prefs.keepAlive)} min`}
                    note="idle models unload after it"
                />
            </Columns>
            <Section title="Memory" meta={`${bytes(used)} of ${bytes(limit)}`}>
                <Progress value={Math.min(100, Math.round((used / limit) * 1000) / 10)} aria-label="Memory the loaded models take">
                    <ProgressLabel className="font-normal text-muted-foreground">
                        {loaded.map((one) => `${one.model} ${bytes(one.memory)}`).join(', ') || 'Nothing loaded'}
                    </ProgressLabel>
                    <ProgressValue />
                </Progress>
            </Section>
            <Section
                title="Loaded models"
                meta={String(loaded.length)}
                flush
                actions={
                    <Row gap="xs">
                        <ModelSelect label="Model to load" value={pick} onChange={setPick} />
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={status !== 'up' || loaded.some((one) => one.id === pick)}
                            onClick={() => load(pick)}
                        >
                            <Cpu aria-hidden />
                            Load
                        </Button>
                    </Row>
                }
            >
                <DataTable
                    variant="list"
                    framed={false}
                    resizable={false}
                    columns={columns}
                    rows={loaded}
                    rowKey={(one) => one.id}
                    rowActions={(one) => [
                        {
                            id: 'chat',
                            label: 'Chat with it',
                            icon: <MessageSquarePlus />,
                            onSelect: () => {
                                const model = models.find((each) => each.id === one.id)
                                if (model !== undefined) chatWith(model)
                            },
                        },
                        {
                            id: 'unload',
                            label: 'Unload',
                            icon: <PowerOff />,
                            inline: true,
                            onSelect: () => void unloadModel(one.id, 'by hand'),
                        },
                    ]}
                    words={{
                        empty: status === 'up' ? 'Nothing is loaded. A chat loads its model, or load one here.' : 'The runner is stopped.',
                    }}
                    minWidth="46rem"
                />
            </Section>
            <Section title="Health">
                <CheckList checks={checks} />
            </Section>
            <Section
                title="Log"
                meta={String(lines.length)}
                actions={
                    <Segmented
                        label="Source"
                        size="sm"
                        value={source}
                        onValueChange={setSource}
                        options={[
                            { value: 'all', label: 'All' },
                            { value: 'runner', label: 'Runner' },
                            { value: 'loader', label: 'Loads' },
                            { value: 'chat', label: 'Answers' },
                            { value: 'pull', label: 'Pulls' },
                        ]}
                    />
                }
            >
                <Stack gap="md">
                    <SearchField value={query} onChange={setQuery} placeholder="Search" />
                    <LogView lines={lines} follow query={query} className="h-80" />
                </Stack>
            </Section>
        </Stack>
    )
}
