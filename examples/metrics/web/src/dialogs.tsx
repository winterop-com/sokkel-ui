import { CopyButton } from '@winterop-com/sokkel-ui/CopyButton'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { formatValue } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { SettingRow } from '@winterop-com/sokkel-ui/SettingRow'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { dashboards } from './data'
import { SelectInput } from './inputs'
import { type Dashboard, type Panel, panelId } from './model'
import { logFilter, queryOf } from './panel-data'
import { go, hashOf, rangeParams } from './place'
import { bounds, clockOf, coarse, PRESETS, readSeries, spanOf, timeLabel } from './query'
import { logsUntil, metricOf } from './source'
import type { View } from './view'

/** The link to a dashboard as it is viewed: its range (pinned to its times when locked), refresh and variables. */
export function shareLink(dashboard: Dashboard, view: View, lock: boolean): string {
    const params = new URLSearchParams()
    const { start, end } = bounds(view.range, view.at)
    const range: Record<string, string | null> = lock
        ? { range: null, from: String(start * 1000), to: String(end * 1000) }
        : rangeParams(view.range)
    for (const [key, value] of Object.entries(range)) if (value !== null) params.set(key, value)
    params.set('refresh', String(lock ? 0 : view.refresh))
    for (const [key, value] of Object.entries(view.vars)) if (value !== 'all') params.set(key, value)
    const base = `${window.location.origin === 'null' ? '' : window.location.origin}${window.location.pathname}`
    return `${base}${hashOf(`/d/${dashboard.id}`, params)}`
}

/** Sharing a dashboard as it is viewed: the link, a copy button, and pinning the range to its times now. */
export function ShareDialog({
    open,
    onOpenChange,
    dashboard,
    view,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    dashboard: Dashboard
    view: View
}) {
    const [lock, setLock] = useState(false)
    const link = shareLink(dashboard, view, lock)
    const range = view.range
    const preset = 'preset' in range ? PRESETS.find((one) => one.id === range.preset) : undefined
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title="Share this view"
            description={`A link to ${dashboard.title} with its range, refresh and variables.`}
            words={{ cancel: 'Close' }}
        >
            <Stack gap="md">
                <Field id="share-link" label="Link">
                    <div className="flex items-center gap-2">
                        <Input
                            id="share-link"
                            readOnly
                            value={link}
                            className="font-mono text-xs"
                            onFocus={(event) => event.target.select()}
                        />
                        <CopyButton value={link} showLabel words={{ copy: 'Copy link' }} />
                    </div>
                </Field>
                <SettingRow
                    title="Lock the time range"
                    description={
                        preset === undefined
                            ? 'The range is already its own times, and the link keeps them.'
                            : `Pins ${preset.label.toLowerCase()} to the times it covers now, ${clockOf(view.at - preset.seconds, view.zone)} to ${clockOf(view.at, view.zone)}, so the link shows the same data later.`
                    }
                    control={<Switch aria-label="Lock the time range" checked={lock} onCheckedChange={setLock} />}
                />
            </Stack>
        </DialogShell>
    )
}

/** Making a new dashboard, empty or as a copy, or changing one's title and description. */
export function DashboardDialog({
    open,
    onOpenChange,
    dashboards: all,
    kept,
    editing,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    dashboards: readonly Dashboard[]
    kept: URLSearchParams
    /** The dashboard whose details change; a new one is made without it. */
    editing?: Dashboard
}) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [from, setFrom] = useState('empty')
    const [busy, setBusy] = useState(false)
    const [shown, setShown] = useState(false)
    if (open && !shown) {
        setShown(true)
        setTitle(editing?.title ?? '')
        setDescription(editing?.description ?? '')
        setFrom('empty')
    }
    if (!open && shown) setShown(false)
    const missing = title.trim() === ''
    const submit = () => {
        if (missing) return
        setBusy(true)
        const done = (id: string) => {
            setBusy(false)
            onOpenChange(false)
            go(`/d/${id}`, kept)
        }
        if (editing !== undefined) {
            void dashboards.update(editing.id, { title: title.trim(), description: description.trim() }).then(() => done(editing.id))
            return
        }
        const source = all.find((one) => one.id === from)
        const panels = (source?.panels ?? []).map((panel) => ({ ...panel, id: panelId() }))
        void dashboards.create({ title: title.trim(), description: description.trim(), panels }).then((made) => {
            toast.success(`${made.title} made`)
            done(made.id)
        })
    }
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={editing === undefined ? 'New dashboard' : 'Dashboard details'}
            confirm={{
                label: editing === undefined ? 'Create' : 'Save',
                onConfirm: submit,
                why: missing ? 'A dashboard needs a title.' : undefined,
                busy,
            }}
        >
            <Stack gap="md">
                <TextField id="dashboard-title" label="Title" value={title} onChange={setTitle} onEnter={submit} autoFocus />
                <TextField
                    id="dashboard-description"
                    label="Description"
                    multiline
                    rows={2}
                    value={description}
                    onChange={setDescription}
                />
                {editing === undefined && (
                    <Field id="dashboard-from" label="Start from" description="An empty dashboard, or a copy of one's panels.">
                        <SelectInput
                            id="dashboard-from"
                            value={from}
                            onChange={setFrom}
                            options={[
                                { value: 'empty', label: 'Empty' },
                                ...all.map((one) => ({ value: one.id, label: `A copy of ${one.title}` })),
                            ]}
                        />
                    </Field>
                )}
            </Stack>
        </DialogShell>
    )
}

type InspectRow = Record<string, string | number>

/** A panel's data as a table: a row per step and a column per series, or the log's lines, with a CSV to download. */
export function InspectDialog({ panel, onOpenChange, view }: { panel: Panel | null; onOpenChange: (open: boolean) => void; view: View }) {
    const table = useMemo(() => {
        if (panel === null) return { columns: [] as DataColumn<InspectRow>[], rows: [] as InspectRow[], csv: '' }
        const metric = metricOf(panel.metric)
        const decimals = panel.decimals ?? metric.decimals
        const unit = (panel.unit ?? metric.unit).trim()
        if (panel.kind === 'logs') {
            const { start, end } = bounds(view.range, view.at)
            const filter = logFilter(panel, view.vars)
            const lines = filter === null ? [] : logsUntil(end, start, filter).reverse()
            const rows = lines.map((line, index) => ({
                key: index,
                time: clockOf(line.second, view.zone),
                level: line.level,
                host: line.host,
                text: line.text,
            }))
            const text = (id: string, header: string, width: string): DataColumn<InspectRow> => ({
                id,
                header,
                width,
                cell: (row) => <span className={id === 'text' ? undefined : 'font-mono'}>{row[id]}</span>,
                sortValue: (row) => row[id] ?? '',
            })
            return {
                columns: [
                    text('time', 'Time', '6rem'),
                    text('level', 'Level', '6rem'),
                    text('host', 'Host', '8rem'),
                    text('text', 'Line', 'minmax(16rem,1fr)'),
                ],
                rows,
                csv: [
                    'time,level,host,line',
                    ...rows.map((row) => [row.time, row.level, row.host, JSON.stringify(row.text)].join(',')),
                ].join('\n'),
            }
        }
        const span =
            panel.kind === 'bar'
                ? coarse(spanOf(view.range, view.at), 20)
                : panel.kind === 'heatmap'
                  ? coarse(spanOf(view.range, view.at), 30)
                  : spanOf(view.range, view.at)
        const series = readSeries(queryOf(panel, view.vars), span)
        const rows = span.times
            .map((time, index) => {
                const row: InspectRow = { key: time, time: timeLabel(time, span, view.zone) }
                for (const one of series) row[one.name] = one.values[index] ?? 0
                return row
            })
            .reverse()
        const columns: DataColumn<InspectRow>[] = [
            {
                id: 'time',
                header: 'Time',
                width: '8rem',
                cell: (row) => <span className="font-mono">{row.time}</span>,
                sortValue: (row) => Number(row.key),
            },
            ...series.map((one): DataColumn<InspectRow> => ({
                id: one.name,
                header: unit === '' ? one.name : `${one.name} (${unit})`,
                width: 'minmax(7rem,1fr)',
                align: 'end',
                cell: (row) => <span className="tabular-nums">{formatValue(Number(row[one.name]), decimals)}</span>,
                sortValue: (row) => Number(row[one.name]),
            })),
        ]
        const csv = [
            ['time', ...series.map((one) => one.name)].join(','),
            ...rows.map((row) =>
                [new Date(Number(row.key) * 1000).toISOString(), ...series.map((one) => Number(row[one.name]).toFixed(decimals))].join(','),
            ),
        ].join('\n')
        return { columns, rows, csv }
    }, [panel, view.range, view.at, view.vars, view.zone])
    const download = () => {
        if (panel === null) return
        const url = URL.createObjectURL(new Blob([table.csv], { type: 'text/csv' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `${panel.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    const metric = panel === null ? undefined : metricOf(panel.metric)
    return (
        <DialogShell
            open={panel !== null}
            onOpenChange={onOpenChange}
            width="xl"
            title={panel === null ? '' : `Inspect ${panel.title}`}
            description={
                panel === null || metric === undefined
                    ? undefined
                    : panel.kind === 'logs'
                      ? `The newest ${String(table.rows.length)} lines in the range, newest first.`
                      : `${metric.label}, ${panel.aggregation}${panel.groupBy === 'none' ? '' : ` by ${panel.groupBy}`}: ${String(table.rows.length)} steps, newest first.`
            }
            words={{ cancel: 'Close' }}
            confirm={{ label: 'Download CSV', onConfirm: download }}
        >
            <DataTable columns={table.columns} rows={table.rows} rowKey={(row) => String(row.key)} className="h-96" minWidth="auto" />
        </DialogShell>
    )
}
