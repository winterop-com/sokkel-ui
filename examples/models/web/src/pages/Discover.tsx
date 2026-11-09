import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DetailSheet } from '@winterop-com/sokkel-ui/DetailSheet'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'
import { ArrowDownToLine } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { go } from 'tidevann-shared/router'
import { CATALOG, modelId, QUANTS, searchCatalog, type CatalogEntry, type Variant } from '../data/catalog'
import { bytes, context, counted, GB, params } from '../data/format'
import { FORMATS, SOURCE_IDS, SOURCES, type Format, type Model, type Source } from '../data/model'
import { memoryOf } from '../engine/runner'
import { useApp } from '../state'
import { FormatBadge } from './Library'
import { PullButton, usualVariant } from './pull'

/** What the library holds of an entry: this very variant, another of the same model, or none. */
function held(entry: CatalogEntry, models: readonly Model[]): 'kept' | 'other' | 'none' {
    if (entry.variants.some((variant) => models.some((model) => model.id === modelId(entry.name, variant.quant)))) return 'kept'
    return models.some((model) => model.name === entry.name) ? 'other' : 'none'
}

function columns(models: readonly Model[]): DataColumn<CatalogEntry>[] {
    return [
        {
            id: 'name',
            header: 'Model',
            width: 'minmax(13rem,2fr)',
            cell: (entry) => <span className="font-mono">{entry.name}</span>,
            sortValue: (entry) => entry.name,
        },
        { id: 'publisher', header: 'Publisher', width: '7rem', cell: (entry) => entry.publisher, sortValue: (entry) => entry.publisher },
        {
            id: 'source',
            header: 'Source',
            width: '8.5rem',
            cell: (entry) => SOURCES[entry.source].label,
            sortValue: (entry) => entry.source,
        },
        {
            id: 'params',
            header: 'Params',
            width: '5.5rem',
            align: 'end',
            cell: (entry) => <span className="tabular-nums">{params(entry.params)}</span>,
            sortValue: (entry) => entry.params,
        },
        {
            id: 'downloads',
            header: 'Pulls',
            width: '7rem',
            align: 'end',
            cell: (entry) => <span className="tabular-nums">{entry.downloads === 0 ? '-' : entry.downloads.toLocaleString('en-US')}</span>,
            sortValue: (entry) => entry.downloads,
            stack: 'secondary',
        },
        {
            id: 'library',
            header: 'Library',
            width: '8rem',
            cell: (entry) => {
                const state = held(entry, models)
                return state === 'kept' ? (
                    <StatusChip status="ready" label="in library" />
                ) : state === 'other' ? (
                    <StatusChip status="pending" label="other copy" />
                ) : (
                    <span className="text-muted-foreground">-</span>
                )
            },
            sortValue: (entry) => held(entry, models),
        },
        {
            id: 'pull',
            header: 'Pull',
            width: '12rem',
            cell: (entry) => {
                const variant = usualVariant(entry)
                return <PullButton entry={entry} variant={variant} compact="narrow" />
            },
        },
    ]
}

/** One entry's variants, each with its size, whether it fits the runner's memory, and its own pull. */
function Variants({ entry }: { entry: CatalogEntry }) {
    const { prefs } = useApp()
    const rows: DataColumn<Variant>[] = [
        {
            id: 'quant',
            header: 'Rounding',
            width: 'minmax(6rem,1fr)',
            cell: (variant) => <span className="font-mono">{variant.quant}</span>,
        },
        { id: 'format', header: 'Format', width: '7rem', cell: (variant) => <FormatBadge format={variant.format} /> },
        {
            id: 'size',
            header: 'Size',
            width: '6rem',
            align: 'end',
            cell: (variant) => <span className="tabular-nums">{bytes(variant.size)}</span>,
        },
        {
            id: 'fits',
            header: 'Memory',
            width: '7rem',
            cell: (variant) => {
                const need = memoryOf({ size: variant.size, context: entry.context, params: entry.params } as Model)
                return need <= prefs.memory * GB ? (
                    <span className="text-muted-foreground tabular-nums">{bytes(need)}</span>
                ) : (
                    <StatusChip status="failed" label="too large" />
                )
            },
        },
        { id: 'pull', header: 'Pull', width: '11rem', cell: (variant) => <PullButton entry={entry} variant={variant} /> },
    ]
    return (
        <DataTable
            variant="list"
            framed={false}
            resizable={false}
            columns={rows}
            rows={entry.variants}
            rowKey={(variant) => `${variant.format}-${variant.quant}`}
        />
    )
}

/** Searches the sources (a public hub and the runners on this machine) and pulls a model from them into the library. */
export function DiscoverPage() {
    const { models, downloads } = useApp()
    const [query, setQuery] = useStored('models.discover.query', '')
    const [source, setSource] = useStored<Source | 'all'>('models.discover.source', 'all')
    const [format, setFormat] = useStored<Format | 'all'>('models.discover.format', 'all')
    const [results, setResults] = useState<CatalogEntry[] | undefined>(undefined)
    const [open, setOpen] = useState<CatalogEntry | undefined>(undefined)

    useEffect(() => {
        let live = true
        setResults(undefined)
        const timer = setTimeout(() => {
            void searchCatalog({ text: query, source, format }).then((found) => {
                if (live) setResults(found)
            })
        }, 220)
        return () => {
            live = false
            clearTimeout(timer)
        }
    }, [query, source, format])

    const pulling = downloads.filter((one) => one.state === 'running' || one.state === 'queued' || one.state === 'paused').length
    return (
        <>
            <PageHeader
                title="Discover"
                count={`${counted(CATALOG.length, 'model')} in ${String(SOURCE_IDS.length)} sources`}
                description="Search a public hub and the runners on this machine, then pull a model into the library."
                actions={
                    <Button size="sm" variant="outline" onClick={() => go('/downloads')}>
                        <ArrowDownToLine aria-hidden />
                        Downloads{pulling > 0 ? ` (${String(pulling)})` : ''}
                    </Button>
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                columns={columns(models)}
                rows={results ?? []}
                rowKey={(entry) => entry.id}
                loading={results === undefined}
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={
                    <>
                        <Segmented
                            label="Source"
                            size="sm"
                            value={source}
                            onValueChange={setSource}
                            options={[{ value: 'all', label: 'All' }, ...SOURCE_IDS.map((id) => ({ value: id, label: SOURCES[id].label }))]}
                        />
                        <Segmented
                            label="Format"
                            size="sm"
                            value={format}
                            onValueChange={setFormat}
                            options={[{ value: 'all', label: 'Any format' }, ...FORMATS.map((id) => ({ value: id, label: id }))]}
                        />
                    </>
                }
                onOpen={setOpen}
                opened={(entry) => entry.id === open?.id}
                words={{ rows: (count) => counted(count, 'result'), empty: 'Nothing matches. Try fewer words, or another source.' }}
                minWidth="54rem"
            />
            <DetailSheet
                open={open !== undefined}
                onOpenChange={(next) => !next && setOpen(undefined)}
                title={open?.name ?? ''}
                code={open === undefined ? undefined : `${open.publisher} · ${SOURCES[open.source].label}`}
                description={open?.summary}
                chips={open === undefined ? undefined : <TagChips tags={[...new Set([...open.capabilities, ...open.tags])]} />}
                size="lg"
            >
                {open !== undefined && (
                    <Stack gap="page">
                        <Section title="Variants" meta={String(open.variants.length)} flush>
                            <Variants entry={open} />
                        </Section>
                        <Section title="About">
                            <Stack gap="sm">
                                <p className="text-sm">
                                    {params(open.params)} parameters, {context(open.context)} tokens of context.
                                    {open.downloads > 0
                                        ? ` Pulled ${open.downloads.toLocaleString('en-US')} times last month, ${open.likes.toLocaleString('en-US')} likes.`
                                        : ''}
                                    {` Changed ${counted(open.updated, 'day')} ago.`}
                                </p>
                                <p className="text-help text-muted-foreground">{SOURCES[open.source].detail}.</p>
                                <p className="text-help text-muted-foreground">
                                    {Object.entries(QUANTS)
                                        .filter(([quant]) => open.variants.some((variant) => variant.quant === quant))
                                        .map(([quant, said]) => `${quant}: ${said}.`)
                                        .join(' ')}
                                </p>
                            </Stack>
                        </Section>
                    </Stack>
                )}
            </DetailSheet>
        </>
    )
}
