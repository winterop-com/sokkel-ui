import { Field } from '@winterop-com/sokkel-ui/Field'
import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@winterop-com/sokkel-ui/primitives/toggle-group'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useUnsavedChanges } from '@winterop-com/sokkel-ui/UnsavedChanges'
import { ChevronDown, Download, FileImage, FileSpreadsheet, LayoutDashboard, Plus, Save, Share2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { go } from 'tidevann-shared/router'

import { boards as boardStore, charts as chartStore } from '../backend'
import { ChartThumb, ChartView, isCharted, useShaped } from '../ChartView'
import { BoardDialog, ShareDialog } from '../dialogs'
import { paletteOptions, SelectInput, type Option } from '../inputs'
import {
    AGGREGATES,
    BINS,
    type Board,
    type Column,
    type ColumnType,
    counted,
    type Dataset,
    freshId,
    LIMITS,
    now,
    PALETTES,
    type Preferences,
    type SavedChart,
    SORTS,
    type ViewKind,
    type ViewSpec,
} from '../model'
import { download, downloadUrl, fileName, toCsv } from '../parse'
import { columnOf, startingSpec, suggest } from '../shape'
import { VIEW_ICONS, VIEWS } from '../views'

/** Which columns a slot takes: names, numbers, dates, regions, or any column a chart can run along. */
type Takes = 'category' | 'number' | 'date' | 'region' | 'along'

interface Slot {
    field: 'x' | 'y' | 'series' | 'size' | 'color'
    label: string
    takes: Takes
    optional?: boolean
    description?: string
}

const TAKES: Record<Takes, readonly ColumnType[]> = {
    category: ['text', 'region'],
    number: ['number'],
    date: ['date'],
    region: ['region'],
    along: ['text', 'region', 'date', 'number'],
}

/** The columns each view reads, in the words it reads them by. */
const SLOTS: Record<ViewKind, readonly Slot[]> = {
    bar: [
        { field: 'x', label: 'X axis', takes: 'along' },
        { field: 'y', label: 'Y axis', takes: 'number' },
        {
            field: 'series',
            label: 'Series',
            takes: 'category',
            optional: true,
            description: 'A bar of its own for each, in its own color.',
        },
    ],
    line: [
        { field: 'x', label: 'X axis', takes: 'along' },
        { field: 'y', label: 'Y axis', takes: 'number' },
        { field: 'series', label: 'Series', takes: 'category', optional: true, description: 'A line of its own for each.' },
    ],
    area: [
        { field: 'x', label: 'X axis', takes: 'along' },
        { field: 'y', label: 'Y axis', takes: 'number' },
        { field: 'series', label: 'Series', takes: 'category', optional: true, description: 'An area of its own for each.' },
    ],
    scatter: [
        { field: 'x', label: 'X axis', takes: 'number' },
        { field: 'y', label: 'Y axis', takes: 'number' },
        { field: 'color', label: 'Color', takes: 'category', optional: true, description: 'Points colored by their name.' },
        { field: 'size', label: 'Size', takes: 'number', optional: true, description: 'Points as large as this figure.' },
    ],
    pie: [
        { field: 'x', label: 'Slices', takes: 'category' },
        { field: 'y', label: 'Value', takes: 'number' },
    ],
    heatmap: [
        { field: 'x', label: 'Across', takes: 'along' },
        { field: 'series', label: 'Down', takes: 'category' },
        { field: 'y', label: 'Color by', takes: 'number' },
    ],
    map: [
        { field: 'x', label: 'Region', takes: 'region' },
        { field: 'y', label: 'Color by', takes: 'number' },
    ],
    table: [
        { field: 'x', label: 'Rows', takes: 'along' },
        { field: 'series', label: 'Columns', takes: 'category', optional: true, description: 'A column of figures for each.' },
        { field: 'y', label: 'Value', takes: 'number' },
    ],
    stat: [
        { field: 'y', label: 'Value', takes: 'number' },
        {
            field: 'x',
            label: 'Trend over',
            takes: 'date',
            optional: true,
            description: 'Draws the figure’s course and its change on the last step.',
        },
    ],
}

const TYPE_WORD: Record<ColumnType, string> = { text: 'text', number: 'number', date: 'date', region: 'region' }

/** The draft the builder edits: the chart's name, its dataset and its view. */
interface Draft {
    name: string
    datasetId: string
    spec: ViewSpec
}

/** What the view does with its categories: sorted and cut for most, neither for a scatter, a figure or a map. */
const SORTED: readonly ViewKind[] = ['bar', 'line', 'area', 'pie', 'heatmap', 'table']

export interface BuilderPageProps {
    datasets: readonly Dataset[]
    boards: readonly Board[]
    prefs: Preferences
    /** The saved chart being edited, or none for a new one. */
    chart?: SavedChart
    /** The dataset a new chart starts from. */
    datasetId?: string
}

/** Building a chart: its dataset, view and columns beside a live preview that follows every change, suggestions, then saved, shared and downloaded. */
export function BuilderPage({ datasets, boards, prefs, chart, datasetId }: BuilderPageProps) {
    const startDataset = datasets.find((one) => one.id === (chart?.datasetId ?? datasetId)) ?? datasets[0]
    const original: Draft | undefined = chart === undefined ? undefined : { name: chart.name, datasetId: chart.datasetId, spec: chart.spec }
    const [draft, setDraft] = useState<Draft | undefined>(
        () =>
            original ??
            (startDataset === undefined ? undefined : { name: '', datasetId: startDataset.id, spec: startingSpec(startDataset, prefs) }),
    )
    const [saving, setSaving] = useState(false)
    const [sharing, setSharing] = useState(false)
    const [newBoard, setNewBoard] = useState(false)
    const png = useRef<(() => Promise<string>) | null>(null)
    const dataset = datasets.find((one) => one.id === draft?.datasetId)
    const dirty = draft !== undefined && (original === undefined || JSON.stringify(draft) !== JSON.stringify(original))
    const guard = useUnsavedChanges(dirty && !saving, { hashRoutes: true })
    const spec = draft?.spec
    const shaped = useShaped(dataset ?? EMPTY_DATASET, spec ?? EMPTY_SPEC)
    const title = draft === undefined || draft.name.trim() === '' ? 'Untitled chart' : draft.name.trim()
    // Each suggestion fitted to its view, so one picked never leaves a column it needs empty.
    const suggestions = useMemo(
        () =>
            dataset === undefined || spec === undefined || !prefs.suggestions
                ? []
                : suggest(dataset, spec).map((one) => ({ ...one, spec: fitView(dataset, one.spec, one.spec.view) })),
        [dataset, spec, prefs.suggestions],
    )

    const downloadPng = () => {
        const make = png.current
        if (make === null) return
        make().then(
            (url) => downloadUrl(`${fileName(title)}.png`, url),
            (error: unknown) => toast.error(error instanceof Error ? error.message : String(error)),
        )
    }
    const downloadCsv = () => download(`${fileName(title)}.csv`, toCsv(shaped.table.names, shaped.table.rows), 'text/csv')
    const charted = spec !== undefined && isCharted(spec.view)
    const saveReason =
        draft === undefined
            ? 'There is no dataset to chart.'
            : draft.name.trim() === ''
              ? 'A chart needs a name.'
              : !dirty
                ? 'Nothing has changed yet.'
                : saving
                  ? 'Saving'
                  : undefined

    const save = (asNew: boolean) => {
        if (draft === undefined || draft.name.trim() === '') return
        setSaving(true)
        const fields = { name: draft.name.trim(), datasetId: draft.datasetId, spec: draft.spec, updatedAt: now() }
        const done = (saved: SavedChart) => {
            setSaving(false)
            toast.success(`${saved.name} saved`)
            if (chart === undefined || asNew) window.location.replace(`#/charts/${saved.id}`)
        }
        if (chart === undefined || asNew) void chartStore.create(fields, freshId('ch')).then(done, () => setSaving(false))
        else void chartStore.update(chart.id, fields).then(done, () => setSaving(false))
    }
    const addTo = (board: Board) => {
        if (chart === undefined) return
        void boardStore
            .update(board.id, { items: [...board.items, { id: freshId('it'), chartId: chart.id, span: 'half' }], updatedAt: now() })
            .then(() =>
                toast.success(`${chart.name} added to ${board.name}`, {
                    action: { label: 'Open', onClick: () => go(`/boards/${board.id}`) },
                }),
            )
    }

    useCommands(
        draft === undefined
            ? []
            : [
                  {
                      title: 'This chart',
                      rank: 1,
                      commands: [
                          ...(saveReason === undefined
                              ? [{ id: 'chart-save', label: 'Save chart', icon: Save, onSelect: () => save(false) }]
                              : []),
                          {
                              id: 'chart-share',
                              label: 'Share chart',
                              hint: 'A link with its data',
                              icon: Share2,
                              onSelect: () => setSharing(true),
                          },
                          ...(charted ? [{ id: 'chart-png', label: 'Download chart as PNG', icon: FileImage, onSelect: downloadPng }] : []),
                          { id: 'chart-csv', label: 'Download chart data as CSV', icon: FileSpreadsheet, onSelect: downloadCsv },
                      ],
                  },
              ],
        [draft, saveReason, charted, shaped],
    )

    if (draft === undefined || dataset === undefined || spec === undefined)
        return (
            <Page>
                <PageHeader title={chart?.name ?? 'New chart'} />
                <PageState
                    loading={false}
                    empty
                    emptyMessage="There is no dataset to chart. Import one, or reset the demo data, and come back."
                >
                    {null}
                </PageState>
            </Page>
        )

    const setSpec = (patch: Partial<ViewSpec>) =>
        setDraft((current) => (current === undefined ? current : { ...current, spec: { ...current.spec, ...patch } }))
    const setView = (view: ViewKind) => setSpec(fitView(dataset, spec, view))
    const leave = () => {
        const back = () => go(chart === undefined ? `/datasets/${dataset.id}` : '/charts')
        if (!dirty) {
            back()
            return
        }
        void guard.confirmLeave().then((ok) => {
            if (ok) back()
        })
    }

    const columnOptions = (slot: Slot): Option[] => [
        ...(slot.optional === true ? [{ value: '', label: 'None' }] : []),
        ...dataset.columns
            .filter((column) => TAKES[slot.takes].includes(column.type))
            .map((column) => ({
                value: column.id,
                label: `${column.name}`,
                lead: <span className="w-14 shrink-0 text-xs text-muted-foreground">{TYPE_WORD[column.type]}</span>,
            })),
    ]
    const counting = spec.aggregate === 'count'
    const x = columnOf(dataset, spec.x)
    const hasNumbers = dataset.columns.some((column) => column.type === 'number')

    const slots = SLOTS[spec.view].map((slot) => {
        const options = columnOptions(slot)
        const value = spec[slot.field] ?? ''
        const byCount = slot.field === 'y' && spec.view !== 'scatter' && counting
        return (
            <Field
                key={slot.field}
                id={`slot-${slot.field}`}
                label={slot.label}
                hint={slot.optional === true ? 'Optional' : undefined}
                description={byCount ? 'Count counts the rows, so no column is read.' : slot.description}
            >
                <SelectInput
                    id={`slot-${slot.field}`}
                    value={options.some((option) => option.value === value) ? value : ''}
                    options={
                        options.length === 0
                            ? [{ value: '', label: `No ${slot.takes === 'along' ? '' : `${slot.takes} `}columns` }]
                            : options
                    }
                    disabled={options.length === 0 || byCount}
                    onChange={(next) => setSpec({ [slot.field]: next === '' ? undefined : next })}
                />
            </Field>
        )
    })

    const preview = (
        <div>
            <Stack gap="lg" className="p-1">
                <ChartView
                    dataset={dataset}
                    spec={spec}
                    title={title}
                    subtitle={dataset.name}
                    prefs={prefs}
                    mode="page"
                    size="h-72 md:h-80"
                    file={fileName(title)}
                    exportRef={png}
                />
                <p className="text-xs text-muted-foreground">
                    Reads {counted(shaped.read, 'row')} of {dataset.name}
                    {shaped.order === undefined
                        ? ''
                        : `, ${spec.view === 'map' ? counted(shaped.order.length, 'region') : counted(shaped.order.length, 'category', 'categories')} shown`}
                    . The preview follows every change.
                </p>
                {suggestions.length > 0 && (
                    <Section
                        title="Suggested views"
                        description="Other ways to draw the columns picked. Pick one to try it; Save keeps it."
                    >
                        <Columns count={4} min="sm" gap="md">
                            {suggestions.map((one) => {
                                const Icon = VIEW_ICONS[one.spec.view]
                                return (
                                    <ItemCard
                                        key={one.id}
                                        title={one.title}
                                        description={one.reason}
                                        icon={<Icon aria-hidden />}
                                        media={
                                            isCharted(one.spec.view) ? (
                                                <div className="h-24 px-2 pt-2">
                                                    <ChartThumb
                                                        dataset={dataset}
                                                        spec={one.spec}
                                                        prefs={prefs}
                                                        label={`${one.title}: ${one.reason}`}
                                                    />
                                                </div>
                                            ) : undefined
                                        }
                                        onSelect={() => setSpec(one.spec)}
                                    />
                                )
                            })}
                        </Columns>
                    </Section>
                )}
            </Stack>
        </div>
    )

    const options = (
        <div>
            <Stack gap="lg" className="p-1">
                <Section title="Chart">
                    <Stack gap="md">
                        <TextField
                            id="chart-name"
                            label="Name"
                            value={draft.name}
                            placeholder="Untitled chart"
                            onChange={(name) => setDraft({ ...draft, name })}
                            onEnter={() => saveReason === undefined && save(false)}
                        />
                        <Field id="chart-dataset" label="Dataset" description="Another dataset starts the view over from its columns.">
                            <SelectInput
                                id="chart-dataset"
                                value={draft.datasetId}
                                options={datasets.map((one) => ({ value: one.id, label: one.name }))}
                                onChange={(id) => {
                                    const next = datasets.find((one) => one.id === id)
                                    if (next !== undefined) setDraft({ ...draft, datasetId: id, spec: startingSpec(next, prefs) })
                                }}
                            />
                        </Field>
                    </Stack>
                </Section>
                <Section title="View">
                    <ToggleGroup
                        aria-label="View"
                        variant="outline"
                        size="sm"
                        spacing={1}
                        className="flex-wrap"
                        value={[spec.view]}
                        onValueChange={(next: string[]) => {
                            const [chosen] = next
                            if (chosen !== undefined) setView(chosen as ViewKind)
                        }}
                    >
                        {VIEWS.map((view) => {
                            const Icon = VIEW_ICONS[view.value]
                            return (
                                <ToggleGroupItem key={view.value} value={view.value} aria-label={view.label} title={view.description}>
                                    <Icon aria-hidden />
                                    {view.label}
                                </ToggleGroupItem>
                            )
                        })}
                    </ToggleGroup>
                </Section>
                <Section title="Columns">
                    <Stack gap="md">{slots}</Stack>
                </Section>
                <Section title="Figures">
                    <Stack gap="md">
                        {spec.view !== 'scatter' && (
                            <Field id="chart-aggregate" label="Combine" description="How the rows that fall in one place make one figure.">
                                <Segmented
                                    id="chart-aggregate"
                                    label="Combine"
                                    fill
                                    value={hasNumbers ? spec.aggregate : 'count'}
                                    onValueChange={(aggregate) => setSpec({ aggregate })}
                                    options={AGGREGATES.map((one) => ({
                                        ...one,
                                        disabled: !hasNumbers && one.value !== 'count',
                                        hint:
                                            !hasNumbers && one.value !== 'count'
                                                ? 'The dataset has no number column to combine.'
                                                : undefined,
                                    }))}
                                />
                            </Field>
                        )}
                        {x?.type === 'date' && spec.view !== 'scatter' && (
                            <Field id="chart-bin" label="Group dates by">
                                <Segmented
                                    id="chart-bin"
                                    label="Group dates by"
                                    fill
                                    value={spec.bin}
                                    onValueChange={(bin) => setSpec({ bin })}
                                    options={BINS}
                                />
                            </Field>
                        )}
                        {SORTED.includes(spec.view) && (
                            <Row gap="sm" wrap align="end">
                                <Field id="chart-sort" label="Sort" className="min-w-48 flex-1">
                                    <Segmented
                                        id="chart-sort"
                                        label="Sort"
                                        fill
                                        value={spec.sort}
                                        onValueChange={(sort) => setSpec({ sort })}
                                        options={SORTS.map((one) =>
                                            one.value === 'natural' && x?.type === 'date' ? { ...one, label: 'In time' } : one,
                                        )}
                                    />
                                </Field>
                                <Field id="chart-limit" label="Show" className="min-w-28">
                                    <SelectInput
                                        id="chart-limit"
                                        value={String(spec.limit)}
                                        options={LIMITS}
                                        onChange={(limit) => setSpec({ limit: Number(limit) })}
                                    />
                                </Field>
                            </Row>
                        )}
                    </Stack>
                </Section>
                <Section title="Look">
                    <Stack gap="md">
                        <Field id="chart-palette" label="Colors">
                            <SelectInput
                                id="chart-palette"
                                value={spec.palette}
                                options={paletteOptions({
                                    label: `As in settings (${PALETTES.find((one) => one.id === prefs.palette)?.label ?? 'Theme'})`,
                                    tokens: PALETTES.find((one) => one.id === prefs.palette)?.tokens,
                                })}
                                onChange={(palette) => setSpec({ palette })}
                            />
                        </Field>
                        {(spec.view === 'bar' || spec.view === 'area') && (
                            <SwitchField
                                id="chart-stack"
                                label="Stack the series"
                                explain="Each series on top of the last, so the stack shows the total."
                                checked={spec.stack}
                                disabled={spec.series === undefined}
                                onCheckedChange={(stack) => setSpec({ stack })}
                            />
                        )}
                        {spec.view === 'bar' && (
                            <SwitchField
                                id="chart-horizontal"
                                label="Bars lying down"
                                checked={spec.horizontal}
                                onCheckedChange={(horizontal) => setSpec({ horizontal })}
                            />
                        )}
                    </Stack>
                </Section>
            </Stack>
        </div>
    )

    const others = boards.filter((board) => chart === undefined || !board.items.some((item) => item.chartId === chart.id))
    return (
        <Page className="h-full">
            <PageHeader
                title={chart === undefined ? 'New chart' : chart.name}
                onBack={leave}
                actions={
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                                <Download aria-hidden />
                                Download
                                <ChevronDown aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem disabled={!charted} onClick={downloadPng}>
                                    <FileImage aria-hidden />
                                    Chart as PNG
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={downloadCsv}>
                                    <FileSpreadsheet aria-hidden />
                                    Data as CSV
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" onClick={() => setSharing(true)}>
                            <Share2 aria-hidden />
                            Share
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        reason={chart === undefined ? 'Save the chart first.' : undefined}
                                    />
                                }
                            >
                                <LayoutDashboard aria-hidden />
                                Add to board
                                <ChevronDown aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {others.length > 0 && (
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>Boards</DropdownMenuLabel>
                                        {others.map((board) => (
                                            <DropdownMenuItem key={board.id} onClick={() => addTo(board)}>
                                                <LayoutDashboard aria-hidden />
                                                {board.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuGroup>
                                )}
                                {others.length > 0 && <DropdownMenuSeparator />}
                                <DropdownMenuItem onClick={() => setNewBoard(true)}>
                                    <Plus aria-hidden />
                                    New board
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />
            <SplitPane
                className="min-h-0 flex-1"
                id="dataviz-builder"
                defaultShare={0.62}
                minShare={0.4}
                maxShare={0.75}
                narrow="stack"
                first={preview}
                second={options}
            />
            <FormBar note={chart === undefined ? 'A new chart, not saved yet' : dirty ? 'Unsaved changes' : 'Saved'}>
                {chart !== undefined && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => original !== undefined && setDraft(original)}
                        reason={!dirty ? 'Nothing has changed yet.' : undefined}
                    >
                        Discard
                    </Button>
                )}
                {chart !== undefined && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => save(true)}
                        reason={draft.name.trim() === '' ? 'A chart needs a name.' : saving ? 'Saving' : undefined}
                    >
                        Save as new
                    </Button>
                )}
                <Button size="sm" onClick={() => save(false)} reason={saveReason}>
                    Save
                </Button>
            </FormBar>
            {guard.dialog}
            <ShareDialog open={sharing} onOpenChange={setSharing} name={title} spec={spec} dataset={dataset} />
            {chart !== undefined && (
                <BoardDialog open={newBoard} onOpenChange={setNewBoard} adding={chart} onMade={(made) => go(`/boards/${made.id}`)} />
            )}
        </Page>
    )
}

/** The view switched, keeping the columns that still fit it and picking ones that do where they do not. */
function fitView(dataset: Dataset, spec: ViewSpec, view: ViewKind): ViewSpec {
    const next: ViewSpec = { ...spec, view }
    for (const slot of SLOTS[view]) {
        const held = columnOf(dataset, spec[slot.field])
        if (held !== undefined && TAKES[slot.takes].includes(held.type)) continue
        const used = new Set(SLOTS[view].map((one) => next[one.field]).filter((id): id is string => id !== undefined))
        const fits = (column: Column) => TAKES[slot.takes].includes(column.type)
        const pick = dataset.columns.find((column) => fits(column) && !used.has(column.id)) ?? dataset.columns.find(fits)
        next[slot.field] = slot.optional === true ? undefined : pick?.id
    }
    if (view === 'scatter') {
        const numbers = dataset.columns.filter((column) => column.type === 'number')
        if (next.x === next.y && numbers.length > 1) next.y = numbers.find((column) => column.id !== next.x)?.id
    }
    if (view === 'pie' && next.limit === 0) next.limit = 10
    return next
}

const EMPTY_DATASET: Dataset = { id: '', name: '', description: '', source: 'seed', columns: [], rows: [], updatedAt: '' }
const EMPTY_SPEC: ViewSpec = {
    view: 'table',
    aggregate: 'count',
    bin: 'month',
    sort: 'natural',
    limit: 0,
    stack: false,
    horizontal: false,
    palette: 'default',
}
