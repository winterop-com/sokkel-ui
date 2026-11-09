import { DataTable, type DataAction, type DataColumn, type DataSort } from '@winterop-com/sokkel-ui/DataTable'
import { FilterBar, type Filter, type FilterField } from '@winterop-com/sokkel-ui/FilterBar'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { filterRows } from '@winterop-com/sokkel-ui/lib/filters'
import { EMPTY_VIEW, type ListViewState } from '@winterop-com/sokkel-ui/lib/list-views'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { SavedViews } from '@winterop-com/sokkel-ui/SavedViews'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'
import { ArrowDownToLine, Cpu, MessageSquarePlus, PowerOff, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { chatWith, useDeleteModels } from '../actions'
import { views } from '../data/backend'
import { bytes, context, counted, day, GB, params } from '../data/format'
import { CAPABILITIES, FORMATS, SOURCE_IDS, SOURCES, type Loaded, type Model } from '../data/model'
import { ensureLoaded, unloadModel } from '../engine/runner'
import { useApp } from '../state'

const COLUMN_IDS = ['name', 'quant', 'format', 'params', 'size', 'context', 'source', 'added', 'memory']

function fieldsOf(all: readonly Model[]): FilterField<Model>[] {
    const quants = [...new Set(all.map((model) => model.quant))].sort()
    const tags = [...new Set(all.flatMap((model) => model.tags))].sort()
    return [
        {
            id: 'format',
            label: 'Format',
            type: 'set',
            options: FORMATS.map((format) => ({ value: format })),
            value: (model) => [model.format],
        },
        {
            id: 'source',
            label: 'Source',
            type: 'set',
            options: SOURCE_IDS.map((source) => ({ value: source, label: SOURCES[source].label })),
            value: (model) => [model.source],
        },
        {
            id: 'capabilities',
            label: 'Can do',
            type: 'set',
            options: CAPABILITIES.map((capability) => ({ value: capability })),
            value: (model) => model.capabilities,
        },
        {
            id: 'quant',
            label: 'Rounding',
            type: 'set',
            options: quants.map((quant) => ({ value: quant })),
            value: (model) => [model.quant],
        },
        { id: 'tags', label: 'Tag', type: 'set', options: tags.map((tag) => ({ value: tag })), value: (model) => model.tags },
        { id: 'size', label: 'Size', type: 'number', unit: 'GB', value: (model) => Number((model.size / GB).toFixed(2)) },
        { id: 'params', label: 'Parameters', type: 'number', unit: 'B', value: (model) => model.params },
        { id: 'context', label: 'Context', type: 'number', unit: 'K tokens', value: (model) => Math.round(model.context / 1024) },
        { id: 'added', label: 'Added', type: 'date', value: (model) => new Date(model.added) },
        { id: 'name', label: 'Name', type: 'text', value: (model) => model.name },
    ]
}

/** What the runner holds of a model, as a chip. */
export function MemoryChip({ held }: { held: Loaded | undefined }) {
    if (held === undefined) return <span className="text-muted-foreground">-</span>
    return held.state === 'ready' ? (
        <StatusChip status="ready" label="in memory" />
    ) : (
        <StatusChip status="loading" label={`loading ${String(Math.round(held.progress * 100))}%`} />
    )
}

/** A model's format as a quiet chip in the code face. */
export function FormatBadge({ format }: { format: string }) {
    return (
        <Badge variant="secondary" className="font-mono">
            {format}
        </Badge>
    )
}

function columns(loaded: readonly Loaded[]): DataColumn<Model>[] {
    const held = (model: Model) => loaded.find((one) => one.id === model.id)
    return [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(12rem,2fr)',
            cell: (model) => <span className="font-mono">{model.name}</span>,
            sortValue: (model) => model.name,
            hideable: false,
        },
        {
            id: 'quant',
            header: 'Rounding',
            width: '6.5rem',
            cell: (model) => <span className="font-mono">{model.quant}</span>,
            sortValue: (model) => model.quant,
        },
        {
            id: 'format',
            header: 'Format',
            width: '7rem',
            cell: (model) => <FormatBadge format={model.format} />,
            sortValue: (model) => model.format,
        },
        {
            id: 'params',
            header: 'Params',
            width: '5rem',
            align: 'end',
            cell: (model) => <span className="tabular-nums">{params(model.params)}</span>,
            sortValue: (model) => model.params,
        },
        {
            id: 'size',
            header: 'Size',
            width: '6rem',
            align: 'end',
            cell: (model) => <span className="tabular-nums">{bytes(model.size)}</span>,
            sortValue: (model) => model.size,
            aggregate: (rows) => <span className="tabular-nums">{bytes(rows.reduce((sum, model) => sum + model.size, 0))}</span>,
        },
        {
            id: 'context',
            header: 'Context',
            width: '5rem',
            align: 'end',
            cell: (model) => <span className="tabular-nums">{context(model.context)}</span>,
            sortValue: (model) => model.context,
        },
        { id: 'source', header: 'Source', width: '8rem', cell: (model) => SOURCES[model.source].label, sortValue: (model) => model.source },
        {
            id: 'added',
            header: 'Added',
            width: '7rem',
            cell: (model) => <span className="text-muted-foreground tabular-nums">{day(model.added)}</span>,
            sortValue: (model) => model.added,
            stack: 'secondary',
        },
        {
            id: 'memory',
            header: 'Runner',
            width: '7.5rem',
            cell: (model) => <MemoryChip held={held(model)} />,
            sortValue: (model) => (held(model) === undefined ? 0 : 1),
        },
    ]
}

/** What a row's menu offers: chat with it, load or unload it, delete it. */
export function modelActions(model: Model, loaded: readonly Loaded[], remove: (model: Model) => void): DataAction[] {
    const held = loaded.find((one) => one.id === model.id)
    return [
        { id: 'chat', label: 'Chat with it', icon: <MessageSquarePlus />, inline: true, onSelect: () => chatWith(model) },
        held === undefined
            ? {
                  id: 'load',
                  label: 'Load in the runner',
                  icon: <Cpu />,
                  onSelect: () =>
                      void ensureLoaded(model).catch((error: unknown) =>
                          toast.add({
                              type: 'error',
                              title: `Could not load ${model.name}`,
                              description: error instanceof Error ? error.message : String(error),
                          }),
                      ),
              }
            : { id: 'unload', label: 'Unload', icon: <PowerOff />, onSelect: () => void unloadModel(model.id, 'by hand') },
        { id: 'line', separator: true },
        { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: () => remove(model) },
    ]
}

/** Every model on the disk: searched, filtered, sorted and kept as saved views, as a table or as cards. */
export function LibraryPage() {
    const { models, loaded, views: saved, loading } = useApp()
    const [viewId, setViewId] = useState<string | null>('all')
    const [filters, setFilters] = useState<readonly Filter[]>([])
    const [sort, setSort] = useState<DataSort | null>(null)
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
    const [order, setOrder] = useState<readonly string[]>([])
    const [widths, setWidths] = useState<Readonly<Record<string, number>>>({})
    const [query, setQuery] = useState('')
    const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
    const removing = useDeleteModels(() => setSelection(new Set()))

    const fields = useMemo(() => fieldsOf(models), [models])
    const shown = useMemo(() => {
        const kept = filterRows(models, filters, fields)
        const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
        return kept.filter((model) =>
            words.every((word) =>
                [model.name, model.publisher, model.family, model.quant, ...model.tags].join(' ').toLowerCase().includes(word),
            ),
        )
    }, [models, filters, fields, query])

    const current: ListViewState = { filters, sort, hidden: [...hidden], order, widths }
    const apply = (state: ListViewState) => {
        setFilters(state.filters)
        setSort(state.sort)
        setHidden(new Set(state.hidden))
        setOrder(state.order)
        setWidths(state.widths)
    }
    const failed = (what: string) => (error: unknown) => toast.add({ type: 'error', title: what, description: String(error) })
    const total = models.reduce((sum, model) => sum + model.size, 0)
    const chosen = (ids: ReadonlySet<string>) => models.filter((model) => ids.has(model.id))

    return (
        <>
            <PageHeader
                title="Models"
                count={`${counted(models.length, 'model')} · ${bytes(total)}`}
                actions={
                    <>
                        <SavedViews
                            views={saved}
                            value={viewId}
                            current={current}
                            columns={COLUMN_IDS}
                            onValueChange={(picked) => {
                                setViewId(picked.id)
                                apply(picked.state)
                            }}
                            onSave={(next) =>
                                void views.update(next.id, { name: next.name, state: next.state }).catch(failed('Could not save the view'))
                            }
                            onSaveNew={(name, state) =>
                                void views.create({ name, state }).then((made) => setViewId(made.id), failed('Could not save the view'))
                            }
                            onRename={(view, name) => void views.update(view.id, { name }).catch(failed('Could not rename the view'))}
                            onDelete={(view) =>
                                void views.remove(view.id).then(() => {
                                    setViewId('all')
                                    apply(EMPTY_VIEW)
                                }, failed('Could not delete the view'))
                            }
                        />
                        <Button size="sm" onClick={() => go('/discover')}>
                            <ArrowDownToLine aria-hidden />
                            Pull
                        </Button>
                    </>
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                columns={columns(loaded)}
                rows={shown}
                rowKey={(model) => model.id}
                loading={loading}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={<FilterBar fields={fields} filters={filters} onFiltersChange={setFilters} />}
                sort={sort}
                onSortChange={setSort}
                hiddenColumns={hidden}
                onHiddenColumnsChange={setHidden}
                columnOrder={order}
                onColumnOrderChange={setOrder}
                columnWidths={widths}
                onColumnWidthsChange={setWidths}
                selectable
                selection={selection}
                onSelectionChange={setSelection}
                bulkActions={(ids) => (
                    <Button size="sm" variant="outline" onClick={() => removing.ask(chosen(ids))}>
                        <Trash2 aria-hidden />
                        Delete {ids.size}
                    </Button>
                )}
                rowActions={(model) => modelActions(model, loaded, (one) => removing.ask([one]))}
                onOpen={(model) => go(`/library/${model.id}`)}
                card={(model) => (
                    <ItemCard
                        title={model.name}
                        code={`${model.publisher} · ${model.quant}`}
                        description={<TagChips tags={[...new Set([model.format, ...model.capabilities, ...model.tags])]} />}
                        status={<MemoryChip held={loaded.find((one) => one.id === model.id)} />}
                        facts={[
                            { label: 'Size', value: bytes(model.size) },
                            { label: 'Context', value: context(model.context) },
                        ]}
                        onSelect={() => go(`/library/${model.id}`)}
                    />
                )}
                cardWidth="16rem"
                words={{ rows: (count) => counted(count, 'model') }}
                minWidth="56rem"
                empty={
                    models.length === 0 ? (
                        <Button size="sm" variant="outline" onClick={() => go('/discover')}>
                            <ArrowDownToLine aria-hidden />
                            Pull a first model
                        </Button>
                    ) : undefined
                }
            />
            {removing.dialog}
        </>
    )
}
