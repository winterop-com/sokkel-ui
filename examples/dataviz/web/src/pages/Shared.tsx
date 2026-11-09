import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { Download, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { charts as chartStore, datasets as datasetStore } from '../backend'
import { ChartView, isCharted } from '../ChartView'
import { counted, type DataRow, freshId, now, type Preferences } from '../model'
import { downloadUrl, fileName } from '../parse'
import { type SharedChart, sharedDataset, unpackChart } from '../share'
import { downloadDataset } from './Datasets'

/** A chart opened from a shared link: rebuilt from the data and view the link carries, then kept here if wanted. */
export function SharedPage({ payload, prefs }: { payload: string; prefs: Preferences }) {
    const [shared, setShared] = useState<SharedChart | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const png = useRef<(() => Promise<string>) | null>(null)
    useEffect(() => {
        let live = true
        setShared(null)
        setError(null)
        unpackChart(payload).then(
            (read) => {
                if (live) setShared(read)
            },
            (failure: unknown) => {
                if (live) setError(failure instanceof Error ? failure.message : String(failure))
            },
        )
        return () => {
            live = false
        }
    }, [payload])
    const dataset = useMemo(() => (shared === null ? undefined : sharedDataset(shared, 'shared', now())), [shared])

    if (error !== null || shared === null || dataset === undefined)
        return (
            <Page>
                <PageHeader title="Shared chart" />
                <PageState loading={error === null} error={error ?? undefined}>
                    {null}
                </PageState>
            </Page>
        )

    const keep = () => {
        setSaving(true)
        const id = freshId('ds')
        void datasetStore
            .create({ ...sharedDataset(shared, id, now()), name: shared.dataset.name }, id)
            .then((made) =>
                chartStore.create({ name: shared.name, datasetId: made.id, spec: shared.spec, updatedAt: now() }, freshId('ch')),
            )
            .then(
                (chart) => {
                    setSaving(false)
                    toast.success(`${chart.name} and its data kept here`)
                    go(`/charts/${chart.id}`)
                },
                () => setSaving(false),
            )
    }
    type Line = DataRow
    const columns: DataColumn<Line>[] = dataset.columns.map((column) => ({
        id: column.id,
        header: column.name,
        width: column.type === 'number' ? '8rem' : 'minmax(9rem,1fr)',
        align: column.type === 'number' ? 'end' : 'start',
        cell: (row) => row[column.id] ?? '',
        sortValue: (row) => (column.type === 'number' ? Number(row[column.id] ?? 0) : (row[column.id] ?? '')),
    }))

    return (
        <Page>
            <PageHeader
                title={shared.name}
                description={`Opened from a link, which carries the chart and the ${counted(dataset.rows.length, 'row')} of ${dataset.name} it draws. Nothing here is saved until you keep it.`}
                actions={
                    <>
                        {isCharted(shared.spec.view) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void png.current?.().then((url) => downloadUrl(`${fileName(shared.name)}.png`, url))}
                            >
                                <Download aria-hidden />
                                PNG
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => downloadDataset(dataset)}>
                            <Download aria-hidden />
                            CSV
                        </Button>
                        <Button size="sm" onClick={keep} reason={saving ? 'Saving' : undefined}>
                            <Save aria-hidden />
                            Keep a copy
                        </Button>
                    </>
                }
            />
            <Stack gap="page">
                <ChartView
                    dataset={dataset}
                    spec={shared.spec}
                    title={shared.name}
                    subtitle={dataset.name}
                    prefs={prefs}
                    mode="page"
                    size="h-80 md:h-96"
                    file={fileName(shared.name)}
                    exportRef={png}
                />
                <Section title="Data" meta={counted(dataset.rows.length, 'row')} description={dataset.description} flush>
                    <DataTable
                        columns={columns}
                        rows={dataset.rows}
                        rowKey={(row) => row.id}
                        framed={false}
                        minWidth="auto"
                        className="h-80"
                    />
                </Section>
            </Stack>
        </Page>
    )
}
