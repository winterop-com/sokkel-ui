import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, Download, FolderGit2, Play, Plus, Settings, Users, Workflow } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CommandPalette, type PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Search, SearchPreview, type SearchGroup, type SearchResult } from '@winterop-com/sokkel-ui/Search'
import { SearchResults } from '@winterop-com/sokkel-ui/SearchResults'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { countFacets, filterGroups, type SearchChosen } from '@winterop-com/sokkel-ui/lib/search'
import { searchTidevann } from '../fixtures/search'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * One search for any page, built on the search field: results open under it as words are typed,
 * grouped by kind and moved through by the keyboard, and a results page with facets and counts.
 */
const meta: Meta = { title: 'Patterns/Search' }
export default meta

/** The popover's search: at most four of a kind, with how many match in all. */
const quick = (query: string) => searchTidevann(query, 4)
const open = () => undefined

/** What the preview pane shows for a result: its picture or its facts. */
function preview(result: SearchResult, group: SearchGroup) {
    return (
        <SearchPreview
            title={result.title}
            detail={result.detail}
            picture={group.kind === 'files' && result.icon === undefined ? result.thumbnail : undefined}
        >
            <DescriptionList
                termWidth="5rem"
                items={[
                    { term: 'Kind', value: group.title },
                    { term: 'Project', value: result.facets?.project ?? '-', code: true },
                    { term: 'Owner', value: result.facets?.owner ?? '-', code: true },
                    ...(group.kind === 'jobs' && result.meta !== undefined
                        ? [{ term: 'Last run', value: <StatusChip status={result.meta as Status} /> }]
                        : []),
                ]}
            />
        </SearchPreview>
    )
}

/** Results under a field with the room an input has, grouped by kind, people with their pictures and files with theirs. */
export const Open: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => <Search search={quick} onOpen={open} defaultQuery="harbor" defaultOpen className="max-w-md" />,
}

/** The app's search has not answered yet and nothing came before it: the list says it is searching. */
export const Loading: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => (
        <Search
            search={() => new Promise<SearchGroup[]>(() => undefined)}
            onOpen={open}
            defaultQuery="harbor"
            defaultOpen
            className="max-w-md"
        />
    ),
}

/** Nothing matches the words, with the way to the results page still at the list's foot. */
export const NoMatch: StoryObj = {
    name: 'No match',
    parameters: { frame: 'padded' },
    render: () => <Search search={quick} onOpen={open} onSeeAll={open} defaultQuery="invoices" defaultOpen className="max-w-md" />,
}

/** Fewer characters than `minQuery` typed: the search is not asked yet, and the popover says how many it needs. */
export const TooShort: StoryObj = {
    name: 'Too short',
    parameters: { frame: 'padded' },
    render: () => <Search search={quick} onOpen={open} minQuery={2} defaultQuery="h" defaultOpen className="max-w-md" />,
}

/** The app's search failed: the list says so in the server's own words, through `words.failed`. */
export const Failed: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => (
        <Search
            search={() => Promise.reject(new Error('The index for harbor is being rebuilt; try again in a minute.'))}
            onOpen={open}
            defaultQuery="harbor"
            defaultOpen
            words={{ failed: (reason) => reason }}
            className="max-w-md"
        />
    ),
}

/** Where the popover has room, the pane beside the list previews the highlighted result; the list ends in the way to every result. */
export const Preview: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => (
        <Search
            search={quick}
            onOpen={open}
            onSeeAll={open}
            renderPreview={preview}
            defaultQuery="nightly"
            defaultOpen
            className="max-w-md"
        />
    ),
}

interface Run {
    id: string
    job: string
    project: string
    status: Status
}

const RUNS: Run[] = [
    { id: '01a1a5c6', job: 'nightly-export', project: 'harbor', status: 'failed' },
    { id: '01a1a5c2', job: 'import-orders', project: 'juniper', status: 'succeeded' },
    { id: '01a1a5b9', job: 'sync-inventory', project: 'harbor', status: 'running' },
    { id: '01a1a5b1', job: 'rebuild-index', project: 'juniper', status: 'succeeded' },
    { id: '01a1a5a7', job: 'send-digest', project: 'larkspur', status: 'skipped' },
    { id: '01a1a59e', job: 'rebuild-index', project: 'juniper', status: 'queued' },
    { id: '01a1a591', job: 'nightly-export', project: 'harbor', status: 'cancelled' },
    { id: '01a1a588', job: 'sync-inventory', project: 'harbor', status: 'succeeded' },
]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'id', header: 'Run', width: '7rem', cell: (run) => <span className="font-mono text-xs">{run.id}</span> },
    { id: 'job', header: 'Job', width: 'minmax(10rem,1fr)', cell: (run) => <span className="font-mono text-xs">{run.job}</span> },
    { id: 'project', header: 'Project', width: '8rem', cell: (run) => run.project },
    { id: 'status', header: 'Status', width: '9rem', cell: (run) => <StatusChip status={run.status} /> },
]

/** In a table's bar: the words narrow the rows, and the results under the field reach jobs and people beyond the table. */
export const TableBar: StoryObj = {
    name: 'Table bar',
    render: function Render() {
        const [query, setQuery] = useState('sync')
        const rows = RUNS.filter((run) => `${run.id} ${run.job} ${run.project}`.includes(query.trim().toLowerCase()))
        return (
            <Stack gap="none" className="h-svh bg-background p-4 text-foreground">
                <DataTable
                    className="flex-1"
                    columns={COLUMNS}
                    rows={rows}
                    rowKey={(run) => run.id}
                    search={<Search search={quick} onOpen={open} query={query} onQueryChange={setQuery} defaultOpen />}
                />
            </Stack>
        )
    },
}

const PLACES: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#' },
            { id: 'projects', label: 'Projects', icon: FolderGit2, href: '#' },
            { id: 'people', label: 'People', icon: Users, href: '#' },
        ],
    },
]

/** In the shell's top bar, in place of the palette's button: results open under the field, with the preview where the window has room. */
export const InTopBar: StoryObj = {
    name: 'Top bar',
    render: () => (
        <TooltipProvider>
            <Shell
                rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={PLACES} />}
                top={
                    <TopBar
                        trail={[{ label: 'Tidevann', href: '#' }, { label: 'Runs' }]}
                        search={
                            <Search
                                search={quick}
                                onOpen={open}
                                onSeeAll={open}
                                renderPreview={preview}
                                defaultQuery="ada"
                                defaultOpen
                                className="w-full"
                            />
                        }
                    />
                }
            >
                <Page>
                    <PageHeader title="Runs" count="8 today" />
                </Page>
            </Shell>
        </TooltipProvider>
    ),
}

const COMMANDS: PaletteGroup[] = [
    {
        title: 'Go to',
        commands: [
            { id: 'runs', label: 'Runs', icon: Play, onSelect: open },
            { id: 'jobs', label: 'Jobs', icon: Workflow, onSelect: open },
            { id: 'people', label: 'People', icon: Users, onSelect: open },
        ],
    },
    {
        title: 'Create',
        commands: [{ id: 'new-job', label: 'New job', icon: Plus, onSelect: open }],
    },
    {
        title: 'App',
        commands: [
            { id: 'export', label: 'Export runs', icon: Download, onSelect: open },
            { id: 'settings', label: 'Settings', icon: Settings, onSelect: open },
        ],
    },
]

/** In the command palette: what the app's search finds for the words follows the commands that match them. */
export const Palette: StoryObj = {
    render: function Render() {
        const [shown, setShown] = useState(true)
        return (
            <Stack className="min-h-svh bg-background text-foreground">
                <CommandPalette
                    open={shown}
                    onOpenChange={setShown}
                    groups={COMMANDS}
                    defaultQuery="export"
                    search={{ search: (query) => searchTidevann(query, 3), onOpen: open }}
                />
            </Stack>
        )
    },
}

const PER_PAGE = 2

/**
 * The results page: the query over every match grouped by kind, and the facets beside it (kind,
 * project and owner) with what each value would keep. Two of each kind are listed, a heading
 * counts the rest, and More adds the next results of each kind.
 */
export const ResultsPage: StoryObj = {
    name: 'Results page',
    render: function Render() {
        const [query, setQuery] = useState('harbor')
        const [chosen, setChosen] = useState<SearchChosen>({})
        const [pages, setPages] = useState(1)
        const all = useMemo(() => searchTidevann(query), [query])
        const facets = countFacets(
            all,
            [
                { id: 'project', title: 'Project' },
                { id: 'owner', title: 'Owner' },
            ],
            chosen,
        )
        const narrowed = filterGroups(all, chosen)
        const listed = narrowed.map((group) => ({ ...group, results: group.results.slice(0, pages * PER_PAGE) }))
        const more = narrowed.some((group) => group.results.length > pages * PER_PAGE)
        return (
            <TooltipProvider>
                <Shell
                    rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={PLACES} />}
                    top={<TopBar trail={[{ label: 'Tidevann', href: '#' }, { label: 'Search' }]} />}
                >
                    <Page>
                        <PageHeader title="Search" />
                        <SearchResults
                            query={query}
                            onQueryChange={(next) => {
                                setQuery(next)
                                setPages(1)
                            }}
                            groups={listed}
                            facets={facets}
                            chosen={chosen}
                            onChosenChange={(next) => {
                                setChosen(next)
                                setPages(1)
                            }}
                            onOpen={open}
                            onMore={more ? () => setPages(pages + 1) : undefined}
                        />
                    </Page>
                </Shell>
            </TooltipProvider>
        )
    },
}
