import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { CodeEditor, type CodeCompletion } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { BookmarkPlus, BookOpen, ChevronLeft, ChevronRight, Search as SearchIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMemo, useState } from 'react'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { paramsOf, readQuery, RESULT_PARAMS, search, type SearchParam } from '../data/search'
import { keepSearches, ME, resources, saved, SERVER, type SavedSearch, type Stored } from '../data/server'
import { TYPE_NAMES } from '../data/types'
import { Pane } from '../pane'
import { count, stateOf, titleOf, useFoot, usePrefs, when } from '../ui'

const EXAMPLES = [
    { label: 'Women born before 1970', query: 'Patient?gender=female&birthdate=lt1970-01-01&_sort=birthdate' },
    { label: 'Patients in Tromsø', query: 'Patient?address-city=Troms&_sort=family' },
    { label: 'High systolic pressure', query: 'Observation?code=http://loinc.org|8480-6&value-quantity=ge150&_sort=-date' },
    { label: 'One patient’s weights', query: 'Observation?patient=Patient/pat-002&code=29463-7&_sort=date' },
    { label: 'Active hypertension', query: 'Condition?code=38341003&clinical-status=active' },
    { label: 'Visits this fall', query: 'Encounter?date=ge2026-09-01&_count=10' },
    { label: 'Draft libraries', query: 'Library?status=draft' },
    { label: 'How many observations', query: 'Observation?_summary=count' },
]

const RESULT_COLUMNS: DataColumn<Stored>[] = [
    { id: 'title', header: 'Resource', width: 'minmax(12rem,2fr)', cell: (row) => titleOf(row.resource) },
    { id: 'key', header: 'Key', width: 'minmax(10rem,1fr)', cell: (row) => <span className="font-mono">{row.id}</span> },
    {
        id: 'state',
        header: 'State',
        width: '8rem',
        cell: (row) => {
            const state = stateOf(row.resource)
            return state === undefined ? null : <StatusChip status={state} />
        },
    },
    { id: 'updated', header: 'Updated', width: '11rem', cell: (row) => when(row.resource.meta?.lastUpdated) },
]

const PARAM_COLUMNS: DataColumn<SearchParam>[] = [
    { id: 'name', header: 'Parameter', width: '9rem', stack: 'primary', cell: (param) => <span className="font-mono">{param.name}</span> },
    { id: 'type', header: 'Type', width: '6rem', stack: 'secondary', cell: (param) => param.type },
    { id: 'doc', header: 'What it matches', width: 'minmax(10rem,1fr)', cell: (param) => param.doc },
    {
        id: 'expression',
        header: 'FHIRPath',
        width: 'minmax(10rem,1fr)',
        cell: (param) => <span className="font-mono">{param.expression}</span>,
    },
]

const SAVED_COLUMNS: DataColumn<SavedSearch>[] = [
    { id: 'label', header: 'Name', width: 'minmax(8rem,1fr)', stack: 'primary', cell: (one) => one.label },
    {
        id: 'query',
        header: 'Query',
        width: 'minmax(10rem,1.6fr)',
        stack: 'secondary',
        cell: (one) => <span className="truncate font-mono text-muted-foreground">{one.query}</span>,
    },
]

/** Names the query being saved, and keeps it at the end of Saved. */
function SaveDialog({
    open,
    onOpenChange,
    query,
    onSave,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    query: string
    onSave: (label: string) => Promise<void>
}) {
    const [label, setLabel] = useState('')
    const [busy, setBusy] = useState(false)
    const save = () => {
        if (label.trim() === '') return
        setBusy(true)
        onSave(label.trim()).then(
            () => {
                setBusy(false)
                setLabel('')
                onOpenChange(false)
            },
            () => setBusy(false),
        )
    }
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title="Save search"
            description={<span className="font-mono break-all">{query}</span>}
            width="sm"
            phone="fit"
            confirm={{
                label: 'Save',
                onConfirm: save,
                busy,
                busyLabel: 'Saving',
                why: label.trim() === '' ? 'Name the search first.' : undefined,
            }}
        >
            <TextField id="saved-name" label="Name" value={label} onChange={setLabel} onEnter={save} placeholder="Women born before 1970" />
        </DialogShell>
    )
}

/** The names a query completes from: the types before the `?`, the type's parameters after it. */
function queryWords(type: string): CodeCompletion[] {
    return [
        ...TYPE_NAMES.map((name) => ({ label: name, detail: 'resource type', kind: 'type' as const })),
        ...[...paramsOf(type), ...RESULT_PARAMS].map((param) => ({
            label: param.name,
            detail: param.type,
            docs: param.doc,
            kind: 'property' as const,
        })),
    ]
}

/**
 * FHIR search against the server: a query of a type and its parameters typed in one line, run with
 * Enter, its matches listed or shown as the searchset Bundle the server answers, and the type's
 * parameters beside it with the FHIRPath expression that defines each.
 */
export function SearchPage() {
    const { rows } = useCollection(resources)
    const [prefs] = usePrefs()
    const [query, setQuery] = useStored('search-query', EXAMPLES[0]?.query ?? 'Patient')
    const [ran, setRan] = useStored('search-ran', EXAMPLES[0]?.query ?? 'Patient')
    const [view, setView] = useState<'table' | 'bundle'>('table')
    const [side, setSide] = useStored<'saved' | 'parameters'>('search-side', 'saved')
    const [saving, setSaving] = useState(false)
    const { rows: savedRows } = useCollection(saved)
    // The order just dragged, held while it is kept, so a quick second move never reads a stale first.
    const [held, setHeld] = useState<readonly SavedSearch[] | null>(null)
    const searches = held ?? savedRows?.find((row) => row.id === ME)?.searches ?? []
    const keep = (next: readonly SavedSearch[]) => {
        setHeld(next)
        return keepSearches(next).finally(() => setHeld(null))
    }
    const already = searches.find((one) => one.query === query.replace(/\n/g, '').trim())
    const result = useMemo(() => (rows === undefined ? undefined : search(rows, ran, prefs.pageSize)), [rows, ran, prefs.pageSize])
    const type = readQuery(query).type
    const words = useMemo(() => queryWords(type), [type])
    const run = (text = query) => setRan(text.replace(/\n/g, '').trim())
    const page = (offset: number) => {
        if (result === undefined) return
        const { params } = readQuery(result.query)
        const rest = params.filter(([name]) => name !== '_offset')
        const next = [...rest, ...(offset === 0 ? [] : [['_offset', String(offset)]])]
        const text = `${result.type}${next.length === 0 ? '' : `?${next.map(([name, value]) => `${name}=${value}`).join('&')}`}`
        setQuery(text)
        run(text)
    }
    useFoot(
        result === undefined
            ? undefined
            : `${count(result.total, 'match', 'matches')}${result.matches.length < result.total && result.matches.length > 0 ? `, ${String(result.offset + 1)} to ${String(result.offset + result.matches.length)} shown` : ''}`,
        undefined,
        [result?.total, result?.offset, result?.matches.length],
    )

    return (
        <Page className="h-full">
            <PageHeader
                title="Search"
                description="Search the server with FHIR search parameters: a resource type, then its parameters, as in Patient?gender=female&birthdate=lt1970. Enter runs the query."
                actions={
                    <>
                        {result !== undefined && <ApiLink path={`/${result.query}`} copyValue={`${SERVER.base}/${result.query}`} />}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSaving(true)}
                            reason={
                                already !== undefined
                                    ? `Saved as ${already.label}.`
                                    : query.trim() === ''
                                      ? 'Write a query first.'
                                      : undefined
                            }
                        >
                            <BookmarkPlus aria-hidden />
                            Save
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
                                <BookOpen aria-hidden />
                                Examples
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {EXAMPLES.map((example) => (
                                    <DropdownMenuItem
                                        key={example.label}
                                        onClick={() => {
                                            setQuery(example.query)
                                            run(example.query)
                                        }}
                                    >
                                        {example.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />
            <Row gap="sm">
                <CodeEditor
                    label="Query"
                    variant="line"
                    value={query}
                    onChange={setQuery}
                    completions={words}
                    onRun={run}
                    placeholder="Patient?name=ada"
                    className="min-w-0 flex-1"
                />
                <Button onClick={() => run()}>
                    <SearchIcon aria-hidden />
                    Search
                </Button>
            </Row>
            {result !== undefined && result.issues.length > 0 && (
                <Banner tone={result.issues.some((issue) => issue.severity === 'error') ? 'critical' : 'warning'}>
                    {result.issues.map((issue) => issue.message).join(' ')}
                </Banner>
            )}
            <SplitPane
                id="search-split"
                className="min-h-0 flex-1"
                direction="across"
                defaultShare={0.62}
                minShare={0.35}
                maxShare={0.8}
                first={
                    <Pane
                        title={result === undefined ? 'Matches' : `${result.type} matches`}
                        meta={result === undefined ? undefined : count(result.total, 'match', 'matches')}
                        actions={
                            <>
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Previous page"
                                    onClick={() => page(Math.max(0, (result?.offset ?? 0) - (result?.count ?? 0)))}
                                    reason={result === undefined || result.offset === 0 ? 'This is the first page.' : undefined}
                                >
                                    <ChevronLeft aria-hidden />
                                </Button>
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Next page"
                                    onClick={() => page((result?.offset ?? 0) + (result?.count ?? 0))}
                                    reason={
                                        result === undefined || result.offset + result.count >= result.total
                                            ? 'This is the last page.'
                                            : undefined
                                    }
                                >
                                    <ChevronRight aria-hidden />
                                </Button>
                                <Segmented
                                    label="Show"
                                    size="sm"
                                    value={view}
                                    options={[
                                        { value: 'table', label: 'Table' },
                                        { value: 'bundle', label: 'Bundle' },
                                    ]}
                                    onValueChange={setView}
                                />
                            </>
                        }
                    >
                        {view === 'table' ? (
                            <DataTable
                                className="h-full min-h-0"
                                framed={false}
                                bar={false}
                                minWidth="auto"
                                columns={RESULT_COLUMNS}
                                rows={result?.matches ?? []}
                                rowKey={(row) => row.id}
                                onOpen={(row) => go(`/resources/${row.id}`)}
                                chevron
                                empty={
                                    result !== undefined && result.total > 0
                                        ? `${count(result.total, 'resource')} match; _summary=count lists none.`
                                        : 'Nothing matches the query.'
                                }
                            />
                        ) : (
                            <CodeEditor
                                label="Search result"
                                language="json"
                                variant="pane"
                                readOnly
                                value={result === undefined ? '' : JSON.stringify(result.bundle, null, 2)}
                                lineNumbers={prefs.lineNumbers}
                                size={prefs.size}
                                folding
                                search
                            />
                        )}
                    </Pane>
                }
                second={
                    <Pane
                        title={side === 'saved' ? 'Saved' : TYPE_NAMES.includes(type) ? `${type} parameters` : 'Parameters'}
                        meta={side === 'saved' ? String(searches.length) : undefined}
                        actions={
                            <Segmented
                                label="Beside the matches"
                                size="sm"
                                value={side}
                                options={[
                                    { value: 'saved', label: 'Saved' },
                                    { value: 'parameters', label: 'Parameters' },
                                ]}
                                onValueChange={setSide}
                            />
                        }
                    >
                        {side === 'saved' ? (
                            <DataTable
                                className="h-full min-h-0"
                                variant="list"
                                framed={false}
                                bar={false}
                                columnHeads={false}
                                resizable={false}
                                minWidth="auto"
                                rowHeight="auto"
                                columns={SAVED_COLUMNS}
                                rows={searches}
                                rowKey={(one) => one.id}
                                rowLabel={(one) => one.label}
                                onReorder={(from, to) => void keep(moveItem(searches, from, to))}
                                onOpen={(one) => {
                                    setQuery(one.query)
                                    run(one.query)
                                }}
                                rowActions={(one) => [
                                    {
                                        id: 'remove',
                                        label: 'Remove',
                                        icon: <Trash2 aria-hidden />,
                                        inline: true,
                                        destructive: true,
                                        onSelect: () =>
                                            void keep(searches.filter((other) => other.id !== one.id)).then(() =>
                                                toast(`${one.label} removed from Saved`),
                                            ),
                                    },
                                ]}
                                empty="No search is saved. Save keeps the query above here, to run again; drag a saved search by its grip to order them."
                            />
                        ) : (
                            <Stack gap="none" className="h-full min-h-0">
                                <DataTable
                                    className="h-full min-h-0"
                                    variant="list"
                                    framed={false}
                                    bar={false}
                                    columnHeads={false}
                                    resizable={false}
                                    minWidth="auto"
                                    columns={PARAM_COLUMNS}
                                    rows={TYPE_NAMES.includes(type) ? [...paramsOf(type), ...RESULT_PARAMS] : []}
                                    rowKey={(param) => param.name}
                                    onOpen={(param) => {
                                        const joiner = query.includes('?') ? '&' : '?'
                                        setQuery(`${query.replace(/[?&]$/, '')}${joiner}${param.name}=`)
                                    }}
                                    empty="Name a resource type to see its parameters."
                                />
                            </Stack>
                        )}
                    </Pane>
                }
            />
            <SaveDialog
                open={saving}
                onOpenChange={setSaving}
                query={query}
                onSave={(label) =>
                    keep([...searches, { id: `saved-${Date.now().toString(36)}`, label, query: query.replace(/\n/g, '').trim() }]).then(
                        () => {
                            setSide('saved')
                            toast.success(`Saved as ${label}`)
                        },
                    )
                }
            />
        </Page>
    )
}
