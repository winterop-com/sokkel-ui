import { ChoiceList } from '@winterop-com/sokkel-ui/ChoiceList'
import { CopyButton } from '@winterop-com/sokkel-ui/CopyButton'
import type { PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { boards } from './backend'
import { type Board, type Dataset, freshId, now, type SavedChart, type ViewSpec } from './model'
import { linkTo, packChart } from './share'

/** Sharing a chart as a link that carries its data and view, so it opens anywhere without this browser's data. */
export function ShareDialog({
    open,
    onOpenChange,
    name,
    spec,
    dataset,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    name: string
    spec: ViewSpec
    dataset: Dataset
}) {
    const [link, setLink] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        if (!open) return
        let live = true
        setLink(null)
        setError(null)
        packChart(name, spec, dataset).then(
            (packed) => {
                if (live) setLink(linkTo(`#/shared/${packed}`))
            },
            (failure: unknown) => {
                if (live) setError(failure instanceof Error ? failure.message : String(failure))
            },
        )
        return () => {
            live = false
        }
    }, [open, name, spec, dataset])
    const size = link === null ? '' : `${(link.length / 1024).toFixed(1)} kB`
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title="Share"
            description={`A link to ${name}. It carries the ${String(dataset.rows.length)} rows of ${dataset.name} and how the chart draws them, so whoever opens it sees the same chart, saved or not.`}
            words={{ cancel: 'Close' }}
            footer={link === null ? undefined : <span className="text-xs text-muted-foreground">The link is {size} long.</span>}
        >
            <Field id="share-link" label="Link" error={error}>
                <Row gap="sm">
                    <Input
                        id="share-link"
                        readOnly
                        value={link ?? 'Packing the chart'}
                        className="min-w-0 flex-1 font-mono text-xs"
                        onFocus={(event) => event.target.select()}
                    />
                    {link !== null && <CopyButton value={link} showLabel words={{ copy: 'Copy link' }} />}
                </Row>
            </Field>
        </DialogShell>
    )
}

export const SPANS: readonly { value: PanelSpan; label: string }[] = [
    { value: 'third', label: 'Third' },
    { value: 'half', label: 'Half' },
    { value: 'two-thirds', label: 'Two thirds' },
    { value: 'full', label: 'Full' },
]

/** Making a board, or changing one's name and description. */
export function BoardDialog({
    open,
    onOpenChange,
    editing,
    onMade,
    adding,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    editing?: Board
    /** Hears the board made. */
    onMade?: (board: Board) => void
    /** A chart the new board starts with. */
    adding?: SavedChart
}) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (!open) return
        setName(editing?.name ?? '')
        setDescription(editing?.description ?? '')
    }, [open, editing])
    const trimmed = name.trim()
    const save = () => {
        setBusy(true)
        const done = () => setBusy(false)
        if (editing !== undefined) {
            void boards.update(editing.id, { name: trimmed, description: description.trim(), updatedAt: now() }).then(() => {
                done()
                onOpenChange(false)
                toast.success('Board saved')
            }, done)
            return
        }
        void boards
            .create(
                {
                    name: trimmed,
                    description: description.trim(),
                    items: adding === undefined ? [] : [{ id: freshId('it'), chartId: adding.id, span: 'half' }],
                    filters: [],
                    updatedAt: now(),
                },
                freshId('bd'),
            )
            .then((made) => {
                done()
                onOpenChange(false)
                toast.success(`${made.name} made`)
                onMade?.(made)
            }, done)
    }
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={editing === undefined ? 'New board' : 'Board details'}
            description={
                adding === undefined
                    ? 'Saved charts arranged on one page, with filters across all of them.'
                    : `A board that starts with ${adding.name}.`
            }
            confirm={{
                label: editing === undefined ? 'Make' : 'Save',
                onConfirm: save,
                busy,
                why: trimmed === '' ? 'A board needs a name.' : undefined,
            }}
        >
            <Stack gap="md">
                <TextField id="board-name" label="Name" value={name} onChange={setName} onEnter={() => trimmed !== '' && save()} required />
                <TextField id="board-description" label="Description" value={description} onChange={setDescription} multiline rows={2} />
            </Stack>
        </DialogShell>
    )
}

/** Picking a saved chart to place on a board, and how wide it stands. */
export function AddChartDialog({
    open,
    onOpenChange,
    board,
    charts,
    datasets,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    board: Board
    charts: readonly SavedChart[]
    datasets: readonly Dataset[]
}) {
    const [picked, setPicked] = useState<string | null>(null)
    const [span, setSpan] = useState<PanelSpan>('half')
    const [busy, setBusy] = useState(false)
    const placed = new Set(board.items.map((item) => item.chartId))
    const offered = [...charts].sort((a, b) => Number(placed.has(a.id)) - Number(placed.has(b.id)) || a.name.localeCompare(b.name))
    // The first chart not on the board yet, until one is picked.
    const chosen = picked ?? offered.find((chart) => !placed.has(chart.id))?.id ?? offered[0]?.id ?? ''
    const close = (next: boolean) => {
        if (!next) setPicked(null)
        onOpenChange(next)
    }
    const add = () => {
        setBusy(true)
        void boards
            .update(board.id, { items: [...board.items, { id: freshId('it'), chartId: chosen, span }], updatedAt: now() })
            .then(() => {
                setBusy(false)
                close(false)
                toast.success(`${charts.find((chart) => chart.id === chosen)?.name ?? 'The chart'} added to ${board.name}`)
            })
    }
    return (
        <DialogShell
            open={open}
            onOpenChange={close}
            width="lg"
            title="Add a chart"
            description={`A saved chart to place on ${board.name}.`}
            confirm={{ label: 'Add', onConfirm: add, busy, why: chosen === '' ? 'Save a chart first: there is none to add.' : undefined }}
        >
            <Stack gap="lg">
                <Field id="add-span" label="Width" description="Of the board’s width on a wide screen; charts stack on a phone.">
                    <Segmented id="add-span" label="Width" value={span} onValueChange={setSpan} options={SPANS} fill />
                </Field>
                {offered.length > 0 && (
                    <ChoiceList
                        label="Saved charts"
                        value={chosen}
                        onValueChange={setPicked}
                        options={offered.map((chart) => ({
                            value: chart.id,
                            label: chart.name,
                            description: `${datasets.find((one) => one.id === chart.datasetId)?.name ?? 'A dataset since deleted'}${placed.has(chart.id) ? ' · on this board already' : ''}`,
                        }))}
                    />
                )}
            </Stack>
        </DialogShell>
    )
}
