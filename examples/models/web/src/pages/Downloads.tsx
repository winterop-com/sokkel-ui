import { DataTable, type DataAction, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DownloadButton } from '@winterop-com/sokkel-ui/DownloadButton'
import { Columns } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Progress, ProgressLabel, ProgressValue } from '@winterop-com/sokkel-ui/primitives/progress'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { ExternalLink, Pause, Play, RotateCcw, Search, Trash2, X } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { downloads as pulls } from '../data/backend'
import { modelId } from '../data/catalog'
import { bytes, counted, remaining, speed } from '../data/format'
import { SOURCES, type Download } from '../data/model'
import { cancelPull, clearEnded, pausePull, resumePull, retryPull } from '../engine/downloads'
import { useApp } from '../state'

const going = (one: Download) => one.state === 'running' || one.state === 'queued' || one.state === 'paused'

/** The chip a pull's state shows. */
function StateChip({ pull }: { pull: Download }) {
    const said = { running: 'pulling', queued: 'queued', paused: 'paused', done: 'in library', failed: 'failed', cancelled: 'cancelled' }[
        pull.state
    ]
    const status = { running: 'running', queued: 'queued', paused: 'paused', done: 'succeeded', failed: 'failed', cancelled: 'cancelled' }[
        pull.state
    ]
    return <StatusChip status={status} label={said} />
}

/** A pull's own control: its share with pause and cancel, paused with resume, or what to do once it ended. */
function Control({ pull }: { pull: Download }) {
    if (pull.state === 'done')
        return (
            <DownloadButton
                state="kept"
                size="sm"
                onOpen={() => go(`/library/${modelId(pull.name, pull.quant)}`)}
                words={{ kept: 'Open' }}
            />
        )
    if (pull.state === 'failed' || pull.state === 'cancelled')
        return (
            <DownloadButton
                state="idle"
                size="sm"
                error={pull.error ?? undefined}
                onDownload={() => void retryPull(pull.id)}
                words={{ download: 'Pull again' }}
            />
        )
    return (
        <DownloadButton
            state={pull.state === 'paused' ? 'paused' : 'running'}
            size="sm"
            value={pull.done / pull.size}
            onPause={() => void pausePull(pull.id)}
            onResume={() => void resumePull(pull.id)}
            onCancel={() => void cancelPull(pull.id)}
            words={pull.state === 'queued' ? { share: () => 'Queued' } : undefined}
        />
    )
}

const COLUMNS: DataColumn<Download>[] = [
    {
        id: 'name',
        header: 'Model',
        width: 'minmax(12rem,1.6fr)',
        cell: (pull) => (
            <span className="font-mono">
                {pull.name} <span className="text-muted-foreground">{pull.quant}</span>
            </span>
        ),
        sortValue: (pull) => pull.name,
        stack: 'lead',
    },
    { id: 'source', header: 'From', width: '8rem', cell: (pull) => SOURCES[pull.source].label, sortValue: (pull) => pull.source },
    { id: 'state', header: 'State', width: '7rem', cell: (pull) => <StateChip pull={pull} />, sortValue: (pull) => pull.state },
    {
        id: 'progress',
        header: 'Progress',
        width: 'minmax(11rem,1.4fr)',
        cell: (pull) =>
            pull.state === 'failed' ? (
                <span className="truncate text-critical-ink" title={pull.error ?? undefined}>
                    {pull.error}
                </span>
            ) : (
                <Progress value={Math.round((pull.done / pull.size) * 1000) / 10} aria-label={`${pull.name} pulled`} className="w-full">
                    <ProgressLabel className="text-xs font-normal text-muted-foreground tabular-nums">
                        {bytes(pull.done)} of {bytes(pull.size)}
                    </ProgressLabel>
                    <ProgressValue className="text-xs" />
                </Progress>
            ),
        sortValue: (pull) => pull.done / pull.size,
        stack: 'primary',
    },
    {
        id: 'speed',
        header: 'Speed',
        width: '7rem',
        align: 'end',
        cell: (pull) => <span className="tabular-nums">{pull.state === 'running' ? speed(pull.speed) : '-'}</span>,
        sortValue: (pull) => pull.speed,
        stack: 'secondary',
    },
    {
        id: 'left',
        header: 'Time left',
        width: '7.5rem',
        align: 'end',
        cell: (pull) => (
            <span className="text-muted-foreground tabular-nums">
                {pull.state === 'running' && pull.speed > 0 ? remaining((pull.size - pull.done) / pull.speed) : '-'}
            </span>
        ),
        sortValue: (pull) => (pull.speed > 0 ? (pull.size - pull.done) / pull.speed : Infinity),
        stack: 'secondary',
    },
    { id: 'control', header: '', width: '12rem', cell: (pull) => <Control pull={pull} />, resizable: false },
]

function actionsOf(pull: Download): DataAction[] {
    const list: DataAction[] = []
    if (pull.state === 'running' || pull.state === 'queued')
        list.push({ id: 'pause', label: 'Pause', icon: <Pause />, onSelect: () => void pausePull(pull.id) })
    if (pull.state === 'paused') list.push({ id: 'resume', label: 'Resume', icon: <Play />, onSelect: () => void resumePull(pull.id) })
    if (going(pull)) list.push({ id: 'cancel', label: 'Cancel', icon: <X />, destructive: true, onSelect: () => void cancelPull(pull.id) })
    if (pull.state === 'failed' || pull.state === 'cancelled')
        list.push({ id: 'retry', label: 'Pull again', icon: <RotateCcw />, onSelect: () => void retryPull(pull.id) })
    if (pull.state === 'done')
        list.push({
            id: 'open',
            label: 'Open in the library',
            icon: <ExternalLink />,
            onSelect: () => go(`/library/${modelId(pull.name, pull.quant)}`),
        })
    if (!going(pull))
        list.push({ id: 'remove', label: 'Remove from the list', icon: <Trash2 />, onSelect: () => void pulls.remove(pull.id) })
    return list
}

/** Every pull: those under way with their progress, speed and time left, paused or queued, then those that ended. */
export function DownloadsPage() {
    const { downloads, prefs } = useApp()
    const active = downloads.filter(going)
    const running = downloads.filter((one) => one.state === 'running')
    const rate = running.reduce((sum, one) => sum + one.speed, 0)
    const left = active.reduce((sum, one) => sum + (one.size - one.done), 0)
    const ended = downloads.length - active.length
    const rows = [...downloads].sort((a, b) => b.started - a.started)
    return (
        <>
            <PageHeader
                title="Downloads"
                count={counted(active.length, 'pull') + ' under way'}
                description={`${String(prefs.parallel)} at a time, ${prefs.bandwidth === 0 ? 'with no bandwidth limit' : `at most ${String(prefs.bandwidth)} MB/s together`}. Change it in Settings.`}
                actions={
                    <>
                        <Button size="sm" variant="outline" disabled={ended === 0} onClick={() => void clearEnded()}>
                            <Trash2 aria-hidden />
                            Clear ended
                        </Button>
                        <Button size="sm" onClick={() => go('/discover')}>
                            <Search aria-hidden />
                            Discover
                        </Button>
                    </>
                }
            />
            <Columns count={3} min="sm" gap="inspector">
                <Stat
                    variant="tile"
                    label="Speed"
                    value={running.length === 0 ? '-' : speed(rate)}
                    note={counted(running.length, 'pull') + ' pulling'}
                />
                <Stat variant="tile" label="Left to pull" value={bytes(left)} note={counted(active.length, 'model')} />
                <Stat variant="tile" label="Time left" value={rate > 0 ? remaining(left / rate) : '-'} note="at the speed now" />
            </Columns>
            <DataTable
                className="min-h-0 flex-1"
                columns={COLUMNS}
                rows={rows}
                rowKey={(pull) => pull.id}
                groupBy={(pull) => (going(pull) ? 'going' : 'ended')}
                groupOrder={['going', 'ended']}
                groupLabel={(key) => (key === 'going' ? 'Under way' : 'Ended')}
                rowActions={actionsOf}
                onOpen={(pull) => pull.state === 'done' && go(`/library/${modelId(pull.name, pull.quant)}`)}
                words={{ rows: (count) => counted(count, 'pull'), empty: 'Nothing has been pulled yet. Find a model in Discover.' }}
                rowHeight="auto"
                minWidth="60rem"
            />
        </>
    )
}
