import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import { chartLegend } from '@winterop-com/sokkel-ui-charts/chart-legend'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { Settings2, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import { go } from 'tidevann-shared/router'
import { useDeleteModels } from '../actions'
import { pathOf, usageOf } from '../data/disk'
import { bytes, counted, GB } from '../data/format'
import { SOURCES, type Model } from '../data/model'
import { useApp } from '../state'

const gb = (value: number) => Number((value / GB).toFixed(1))
const writeGb = (value: number) => bytes(value * GB)

/** A model kept in more than one format or rounding, and what keeping only the smallest would free. */
interface Copies {
    name: string
    kept: Model[]
    reclaim: number
}

const COPY_COLUMNS: DataColumn<Copies>[] = [
    {
        id: 'name',
        header: 'Model',
        width: 'minmax(10rem,1fr)',
        cell: (row) => <span className="font-mono">{row.name}</span>,
        stack: 'lead',
    },
    {
        id: 'kept',
        header: 'Copies',
        width: 'minmax(12rem,1.4fr)',
        cell: (row) => row.kept.map((model) => `${model.quant} ${model.format} (${bytes(model.size)})`).join(', '),
    },
    {
        id: 'reclaim',
        header: 'Frees',
        width: '7rem',
        align: 'end',
        cell: (row) => <span className="tabular-nums">{bytes(row.reclaim)}</span>,
        sortValue: (row) => row.reclaim,
    },
]

/** What the library takes on the disk its root is on: the whole disk, by source, by format, model by model, and copies kept twice. */
export function DiskPage() {
    const { models, downloads, prefs } = useApp()
    const usage = usageOf(prefs.root, models, downloads)
    const removing = useDeleteModels()

    const whole = useMemo(
        () => [
            { disk: usage.disk.name, part: 'Models', size: gb(usage.models) },
            { disk: usage.disk.name, part: 'Downloads under way', size: gb(usage.partial) },
            { disk: usage.disk.name, part: 'Other files', size: gb(usage.disk.other) },
            { disk: usage.disk.name, part: 'Free', size: gb(usage.free) },
        ],
        [usage.disk.name, usage.models, usage.partial, usage.disk.other, usage.free],
    )
    const rows = useMemo(
        () =>
            models.map((model) => ({
                source: SOURCES[model.source].label,
                format: model.format,
                name: `${model.name} ${model.quant}`,
                size: gb(model.size),
            })),
        [models],
    )
    const copies = useMemo((): Copies[] => {
        const byName = new Map<string, Model[]>()
        for (const model of models) byName.set(model.name, [...(byName.get(model.name) ?? []), model])
        return [...byName.entries()]
            .filter(([, kept]) => kept.length > 1)
            .map(([name, kept]) => {
                const sorted = [...kept].sort((a, b) => a.size - b.size)
                return { name, kept: sorted, reclaim: sorted.slice(1).reduce((sum, model) => sum + model.size, 0) }
            })
    }, [models])

    const wholeSpec = {
        rows: whole,
        x: 'disk',
        y: 'size',
        series: 'part',
        stack: 'stacked' as const,
        horizontal: true,
        seriesOrder: ['Models', 'Downloads under way', 'Other files', 'Free'],
        colors: { Models: 'primary', 'Downloads under way': 'status-running', 'Other files': 'muted-foreground', Free: 'border' },
        format: writeGb,
    }
    const sourceSpec = { rows, x: 'source', y: 'size', aggregate: 'sum' as const, format: writeGb, total: 'on disk' }
    const formatSpec = { rows, x: 'format', y: 'size', aggregate: 'sum' as const, format: writeGb, order: ['packed', 'unified', 'sharded'] }

    return (
        <Stack gap="page">
            <PageHeader
                title="Disk usage"
                description={`The library's root, ${prefs.root}, is on ${usage.disk.name}.`}
                actions={
                    <Button size="sm" variant="outline" onClick={() => go('/settings')}>
                        <Settings2 aria-hidden />
                        Change the root
                    </Button>
                }
            />
            <Columns count={4} min="sm" gap="inspector">
                <Stat variant="tile" label="Models" value={bytes(usage.models)} note={counted(models.length, 'model')} />
                <Stat
                    variant="tile"
                    label="Free"
                    value={bytes(usage.free)}
                    note={`of ${bytes(usage.disk.capacity)}`}
                    good={usage.free > 100 * GB}
                />
                <Stat variant="tile" label="Other files" value={bytes(usage.disk.other)} note="Not the library's" />
                <Stat
                    variant="tile"
                    label="Downloads under way"
                    value={bytes(usage.partial)}
                    note={counted(
                        downloads.filter((one) => one.state === 'running' || one.state === 'paused' || one.state === 'queued').length,
                        'pull',
                    )}
                />
            </Columns>
            <ChartFrame title="The disk" subtitle={usage.disk.name} legend={chartLegend('bar', wholeSpec)} className="h-44">
                {(state) => <Chart kind="bar" label="What fills the disk" {...wholeSpec} {...state} />}
            </ChartFrame>
            <Columns count={2} min="lg" gap="inspector">
                <ChartFrame
                    title="By source"
                    subtitle="where the models came from"
                    legend={chartLegend('donut', sourceSpec)}
                    className="h-80"
                >
                    {(state) => <Chart kind="donut" label="Models on disk by source" {...sourceSpec} {...state} />}
                </ChartFrame>
                <ChartFrame title="By format" subtitle="how the weights are written" className="h-80">
                    {(state) => <Chart kind="bar" label="Models on disk by format" {...formatSpec} {...state} />}
                </ChartFrame>
            </Columns>
            <ChartFrame title="Every model" subtitle="by source, then format, sized by what it takes" className="h-96">
                {(state) => (
                    <Chart
                        kind="treemap"
                        label="Every model on disk by source and format"
                        rows={rows}
                        path={['source', 'format', 'name']}
                        y="size"
                        format={writeGb}
                        {...state}
                    />
                )}
            </ChartFrame>
            <Section
                title="Kept more than once"
                meta={copies.length === 0 ? undefined : `${bytes(copies.reduce((sum, row) => sum + row.reclaim, 0))} to free`}
                description="Models on the disk in more than one rounding or format. Keeping only the smallest copy frees the rest."
                flush
            >
                <DataTable
                    variant="list"
                    framed={false}
                    resizable={false}
                    columns={COPY_COLUMNS}
                    rows={copies}
                    rowKey={(row) => row.name}
                    onOpen={(row) => go(`/library/${row.kept[0].id}`)}
                    rowActions={(row) => [
                        {
                            id: 'trim',
                            label: 'Delete all but the smallest',
                            icon: <Trash2 />,
                            destructive: true,
                            onSelect: () => removing.ask(row.kept.slice(1)),
                        },
                    ]}
                    words={{ empty: 'Every model is kept once.' }}
                />
            </Section>
            <p className="text-help text-muted-foreground">
                Models are kept under{' '}
                <span className="font-mono">
                    {pathOf(prefs.root, { source: 'hub', publisher: '<publisher>', name: '<name>', quant: '<rounding>' })}
                </span>
                .
            </p>
            {removing.dialog}
        </Stack>
    )
}
