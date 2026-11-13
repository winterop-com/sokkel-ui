import type { Meta, StoryObj } from '@storybook/react-vite'
import { LinkProvider } from '@winterop-com/sokkel-ui/Link'
import { BookOpen, CalendarClock, FolderGit2, Play, Search, Server, Workflow } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { useIsMobile } from '@winterop-com/sokkel-ui/hooks/use-mobile'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { placeCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Search as SiteSearch, type SearchSource } from '@winterop-com/sokkel-ui/Search'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { Page, Shell, ShellHead, ShellTop, useRailMode, useShellTrail, type RailMode } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { Timeline, type TimelineEvent } from '@winterop-com/sokkel-ui/Timeline'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@winterop-com/sokkel-ui/primitives/command'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@winterop-com/sokkel-ui/primitives/resizable'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { routerLink } from '../fixtures/router'
import { runPanelTabs } from '../fixtures/runPanel'
import { JOBS, makeRuns, PROJECTS, startedAt, STEPS, type TableRun } from '../fixtures/tableRuns'
import { TidevannMark } from '../fixtures/TidevannMark'
import clip from '../media/fixtures/clip.webm?url'

/**
 * The app's frame: the rail, the top bar, the content that scrolls and the status foot, with a
 * banner between the top bar and the content, the rail's drawer on a phone, a work page that
 * narrows or hides the rail, and the frame in a desktop window whose native title bar is hidden.
 */
const meta: Meta = { title: 'Patterns/Shell' }
export default meta

const GROUPS: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#runs', keywords: ['history'] },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#schedules', keywords: ['cron', 'timer'] },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#jobs' },
            { id: 'services', label: 'Services', icon: Server, href: '#services', keywords: ['api', 'worker', 'scheduler'] },
        ],
    },
    { id: 'reference', title: 'Reference', entries: [{ id: 'docs', label: 'Docs', icon: BookOpen, href: '#docs' }] },
]

/** The rail's groups with the place shown marked active. */
const placesAt = (place: string): RailGroup[] =>
    GROUPS.map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry, active: entry.id === place })) }))

const labelOf = (place: string) => GROUPS.flatMap((group) => group.entries).find((entry) => entry.id === place)?.label ?? place

const COLUMNS: DataColumn<TableRun>[] = [
    { id: 'id', header: 'Run', width: '8.5rem', cell: (run) => <span className="font-mono">{run.id}</span> },
    { id: 'job', header: 'Job', width: 'minmax(10rem,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
    { id: 'project', header: 'Project', width: '7rem', cell: (run) => run.project },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} /> },
    { id: 'started', header: 'Started', width: '8rem', cell: (run) => startedAt(run.ago) },
]

const RUNS = makeRuns(60)

/** The app's own search: an overlay of its own over the page, which the palette replaces. */
function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search the jobs and projects">
            <Command>
                <CommandInput placeholder="Search the jobs and projects" />
                <CommandList>
                    <CommandEmpty>Nothing matches.</CommandEmpty>
                    <CommandGroup heading="Jobs">
                        {JOBS.map((job) => (
                            <CommandItem key={job} value={job}>
                                <Workflow aria-hidden />
                                <span className="font-mono text-xs">{job}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                    <CommandGroup heading="Projects">
                        {PROJECTS.map((project) => (
                            <CommandItem key={project} value={project}>
                                <FolderGit2 aria-hidden />
                                {project}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    )
}

/** The runs a work page lists. */
const WORK_RUNS = makeRuns(40)

const RUN_LIST: DataColumn<TableRun>[] = [
    { id: 'id', header: 'Run', width: '8.5rem', cell: (run) => <span className="font-mono">{run.id}</span> },
    { id: 'job', header: 'Job', width: 'minmax(8rem,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
    { id: 'state', header: 'State', width: '7.5rem', cell: (run) => <StatusChip status={run.state} /> },
]

/** A run's steps in order, up to the one it stopped at, each inked by how it went. */
function stepsOf(run: TableRun): TimelineEvent[] {
    const reached = STEPS.indexOf(run.step)
    return STEPS.map((step, index) => {
        const tone =
            index < reached || run.state === 'succeeded'
                ? 'succeeded'
                : index > reached
                  ? 'neutral'
                  : run.state === 'failed'
                    ? 'failed'
                    : run.state === 'running'
                      ? 'running'
                      : run.state === 'queued'
                        ? 'waiting'
                        : 'skipped'
        return { id: step, title: <span className="font-mono">{step}</span>, tone, detail: tone === 'neutral' ? 'Not reached' : undefined }
    })
}

/** One run's detail, the work page's last pane. */
function RunDetail({ run }: { run: TableRun }) {
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader
                size="lg"
                code={run.id}
                title={run.job}
                actions={
                    <Button size="sm" variant="outline">
                        Retry
                    </Button>
                }
            >
                <StatusChip status={run.state} />
            </PaneHeader>
            <Fill scroll>
                <Page>
                    <DescriptionList
                        columns={2}
                        items={[
                            { term: 'Project', value: run.project },
                            { term: 'Started by', value: run.by },
                            { term: 'Started', value: startedAt(run.ago) },
                            { term: 'Took', value: `${String(run.duration)} s`, numeric: true },
                            { term: 'Records', value: run.records.toLocaleString('en-US'), numeric: true },
                            { term: 'Attempts', value: run.attempts, numeric: true },
                        ]}
                    />
                    <Timeline events={stepsOf(run)} />
                </Page>
            </Fill>
        </Stack>
    )
}

/**
 * One run's screen, which draws the shell's top bar itself: its trail ends at the run it shows,
 * which only the screen knows, without handing the run up to where the shell is built.
 */
function RunScreen({ run }: { run: TableRun }) {
    return (
        <>
            <ShellTop>
                <TopBar
                    trail={[
                        { label: 'harbor', href: '#' },
                        { label: 'Runs', href: '#runs' },
                        { label: run.id, code: true },
                    ]}
                />
            </ShellTop>
            <RunDetail run={run} />
        </>
    )
}

/**
 * One run's screen that states only its trail with `useShellTrail`: the shell's own top bar draws
 * it, ending at the run, and keeps its search and its actions.
 */
function TrailScreen({ run }: { run: TableRun }) {
    useShellTrail([
        { label: 'harbor', href: '#' },
        { label: 'Runs', href: '#runs' },
        { label: run.id, code: true },
    ])
    return <RunDetail run={run} />
}

/**
 * The runs screen holding its head above the shell's scroller with `ShellHead`: the title and its
 * action stay in view while the runs under them scroll in the shell's content.
 */
function HeadScreen() {
    return (
        <>
            <ShellHead>
                <PageHeader
                    title="Runs"
                    description="Every run of every job in harbor, newest first."
                    actions={
                        <Button size="sm">
                            <Play aria-hidden />
                            Run now
                        </Button>
                    }
                />
            </ShellHead>
            <Page>
                <DataTable columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} minWidth="36rem" />
            </Page>
        </>
    )
}

/**
 * Runs as a work page: the list of runs and the chosen run's detail, each a pane of the page's own,
 * beside the rail. While it is shown it asks the shell for the rail in `mode`, which the shell gives
 * back as the app holds it when the page goes. On a phone the panes stand one over the other.
 */
function WorkPage({ mode }: { mode: RailMode }) {
    useRailMode(mode)
    const mobile = useIsMobile()
    const [chosen, setChosen] = useState(WORK_RUNS[1]?.id)
    const run = WORK_RUNS.find((one) => one.id === chosen) ?? WORK_RUNS[0]
    return (
        <ResizablePanelGroup orientation={mobile ? 'vertical' : 'horizontal'} className="h-full min-h-0">
            <ResizablePanel defaultSize="40%" minSize="25%">
                <Stack gap="none" className="h-full min-h-0">
                    <PaneHeader title="Runs" meta={`${String(WORK_RUNS.length)} in harbor`} />
                    <DataTable
                        variant="list"
                        columns={RUN_LIST}
                        rows={WORK_RUNS}
                        rowKey={(one) => one.id}
                        onOpen={(one) => setChosen(one.id)}
                        opened={(one) => one.id === run.id}
                        minWidth="auto"
                        stackBelow={360}
                        framed={false}
                        className="min-h-0 flex-1"
                    />
                </Stack>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel minSize="35%">{run !== undefined && <RunDetail run={run} />}</ResizablePanel>
        </ResizablePanelGroup>
    )
}

/**
 * Tidevann's frame. A press on a place in the rail, or a place chosen in the palette, moves to it
 * through the shell's `route`, which closes the drawer however the place was reached; the mark and
 * name lead to Runs, the app's home. `search` puts a field at the top bar's start, beside the
 * palette's button at its end; `overlay` gives the app a search of its own over the page. `work`
 * draws Runs as a work page asking the shell for the rail in that mode; every other place is a
 * plain page, so leaving Runs brings the rail back as the app holds it. `strip` gives the frame a
 * run's side panel with its tabs in the shell's strip on a phone, the sheet `down` or `up`.
 */
/** The jobs whose name holds the query, as the top bar's search answers. */
const searchJobs: SearchSource = (query) => [
    {
        kind: 'jobs',
        title: 'Jobs',
        results: JOBS.filter((job) => job.includes(query.trim())).map((job) => ({ id: job, title: job, detail: 'harbor', icon: Workflow })),
    },
]

function Frame({
    banner,
    contentKey,
    collapsed: start = false,
    drawer = false,
    search = false,
    results = false,
    overlay = false,
    work,
    strip,
    screenTop = false,
    screenTrail = false,
    screenHead = false,
}: {
    banner?: ReactNode
    contentKey?: number
    collapsed?: boolean
    drawer?: boolean
    search?: boolean
    results?: boolean
    overlay?: boolean
    work?: RailMode
    strip?: 'down' | 'up'
    screenTop?: boolean
    screenTrail?: boolean
    screenHead?: boolean
}) {
    const [sheetUp, setSheetUp] = useState(true)
    const [collapsed, setCollapsed] = useState(start)
    const [drawerOpen, setDrawerOpen] = useState(drawer)
    const [place, setPlace] = useState('runs')
    const [query, setQuery] = useState('')
    const [searching, setSearching] = useState(overlay)
    const go = (href: string) => setPlace(href.slice(1))
    const rows = useMemo(() => {
        const asked = query.trim()
        return asked === '' ? RUNS : RUNS.filter((run) => run.job.includes(asked) || run.id.includes(asked))
    }, [query])
    return (
        <TooltipProvider>
            <Shell
                route={place}
                drawerOpen={drawerOpen}
                onDrawerOpenChange={setDrawerOpen}
                banner={banner}
                contentKey={contentKey}
                panel={strip === undefined ? undefined : <SidePanel tabs={runPanelTabs()} />}
                panelStrip={strip !== undefined}
                panelOpen={strip === 'up' ? sheetUp : undefined}
                onPanelOpenChange={strip === 'up' ? setSheetUp : undefined}
                palette={placeCommands(GROUPS, (href) => go(href))}
                // The palette opens where nothing stands over the page, and over the app's own search, which it replaces.
                mayOpenPalette={overlay ? (over) => over === null || searching : undefined}
                onPaletteOpenChange={overlay ? (open) => open && setSearching(false) : undefined}
                rail={
                    <LinkProvider render={routerLink(go)}>
                        <Rail
                            mark={<TidevannMark />}
                            name="Tidevann"
                            markHref="#runs"
                            groups={placesAt(place)}
                            collapsed={collapsed}
                            onCollapsedChange={setCollapsed}
                            foot={
                                <AccountMenu
                                    name="ada"
                                    where="tidevann.example.org"
                                    collapsed={collapsed}
                                    onSettings={() => undefined}
                                    onSignOut={() => undefined}
                                />
                            }
                        />
                    </LinkProvider>
                }
                top={
                    <TopBar
                        search={
                            results ? (
                                <SiteSearch search={searchJobs} onOpen={() => setPlace('jobs')} defaultQuery="export" defaultOpen />
                            ) : search ? (
                                <SearchField value={query} onChange={setQuery} placeholder="Search" />
                            ) : undefined
                        }
                        trail={[{ label: 'harbor', href: '#' }, { label: labelOf(place) }]}
                        actions={
                            overlay ? (
                                <IconButton label="Search" onClick={() => setSearching(true)}>
                                    <Search aria-hidden />
                                </IconButton>
                            ) : screenTrail ? (
                                <IconButton label="Run now">
                                    <Play aria-hidden />
                                </IconButton>
                            ) : undefined
                        }
                    />
                }
                foot={
                    <StatusLine note="api.example.org">
                        <StatusItem label="project">harbor</StatusItem>
                        <StatusItem>1.4.0</StatusItem>
                    </StatusLine>
                }
            >
                {work !== undefined && place === 'runs' ? (
                    <WorkPage mode={work} />
                ) : screenTop && place === 'runs' && RUNS[0] !== undefined ? (
                    <RunScreen run={RUNS[0]} />
                ) : screenTrail && place === 'runs' && RUNS[0] !== undefined ? (
                    <TrailScreen run={RUNS[0]} />
                ) : screenHead && place === 'runs' ? (
                    <HeadScreen />
                ) : (
                    <Page className="h-full">
                        <PageHeader title={labelOf(place)} description="Every run of every job in harbor, newest first." />
                        <DataTable columns={COLUMNS} rows={rows} rowKey={(run) => run.id} minWidth="36rem" className="min-h-0 flex-1" />
                    </Page>
                )}
            </Shell>
            {overlay && <SearchOverlay open={searching} onOpenChange={setSearching} />}
        </TooltipProvider>
    )
}

/**
 * A search field at the top bar's start, which `/` focuses, and the palette's button at its end,
 * showing the keys that open it. The field narrows the runs as words are typed. On a phone the
 * field gives way to the palette's button, drawn as an icon.
 */
export const SearchAndPalette: StoryObj = { name: 'Search field', render: () => <Frame search /> }

/**
 * The top bar's `Search` with its results open. ⌘K or Ctrl+K opens the palette in the results'
 * place, closing them, with no rule of the app's: the shell lets its palette over a search's
 * results and over nothing else that stands over the page.
 */
export const SearchResultsStory: StoryObj = { name: 'Search results', render: () => <Frame results /> }

/**
 * A banner between the top bar and the content, for the app's news rather than one screen's: the
 * server has stopped answering. It does not scroll with the content and covers none of it. Retry
 * changes the shell's `contentKey`, which mounts the page afresh, as an app does once the server is
 * back.
 */
export const WithBanner: StoryObj = {
    name: 'Banner',
    render: function Render() {
        const [shown, setShown] = useState(true)
        const [tries, setTries] = useState(0)
        return (
            <Frame
                contentKey={tries}
                banner={
                    shown && (
                        <Banner
                            tone="critical"
                            onDismiss={() => setShown(false)}
                            actions={
                                <Button size="sm" variant="outline" onClick={() => setTries(tries + 1)}>
                                    Retry
                                </Button>
                            }
                        >
                            <span className="font-mono">api.example.org</span> is not answering. Trying again every 10 seconds.
                        </Banner>
                    )
                }
            />
        )
    },
}

/**
 * On a phone the rail opens as a drawer from the top bar's menu button, here open. The app holds
 * the rail collapsed, as it shows on a wide window, and the drawer still draws it expanded, the
 * account with it; its head's end closes it. Escape, a press outside, a place chosen in it or in
 * the palette close it, and the focus goes back to the menu button.
 */
export const Drawer: StoryObj = { render: () => <Frame collapsed drawer /> }

/**
 * A run's side panel with `panelStrip`, at a phone's width: its tabs, Details, Log and Outputs,
 * stand in a strip at the foot of the screen in place of the panel's toggle, the sheet down. A tab
 * raises the sheet on it, another switches it, and the open tab lowers it again. From `md` up the
 * strip is gone and the panel is as it always is.
 */
export const PanelTabs: StoryObj = {
    name: 'Panel tabs',
    globals: { viewport: { value: 'w390', isRotated: false } },
    render: () => <Frame strip="down" />,
}

/** The same strip with the sheet up on Details, raised from the strip, which stays in reach under it. */
export const PanelTabsOpen: StoryObj = {
    name: 'Panel tabs open',
    globals: { viewport: { value: 'w390', isRotated: false } },
    render: () => <Frame strip="up" />,
}

/**
 * The app's own search open over the page. ⌘K or Ctrl+K opens the palette in its place:
 * `mayOpenPalette` lets the palette open over the search, and the app closes its search as the
 * palette opens. Over any other dialog the keys leave the palette closed.
 */
export const OverSearch: StoryObj = { name: 'Over a search', render: () => <Frame overlay /> }

/**
 * A work page with panes of its own, the runs and one run's detail, beside the rail. The app holds
 * the rail expanded, and the page narrows it to its icons while it is shown, through `useRailMode`;
 * the mark widens it again for as long as the page stands. Schedules, a plain page, gets the rail
 * back as the app holds it.
 */
export const WorkPageStory: StoryObj = { name: 'Work page', render: () => <Frame work="collapsed" /> }

/**
 * The same work page with the rail hidden while it is shown: the panes take the window's whole
 * width, and the top bar's menu button opens the rail as a drawer at every width.
 */
export const HiddenRail: StoryObj = { name: 'Hidden rail', render: () => <Frame work="hidden" /> }

/**
 * A screen that states only its trail with `useShellTrail`: the run's screen puts its trail, ending
 * at the run, in the shell's own top bar, which keeps its search field and its Run now action.
 * Schedules, a plain page, gets the bar's own trail back.
 */
export const ScreenTrail: StoryObj = { name: 'Screen trail', render: () => <Frame screenTrail search /> }

/**
 * A screen that draws the top bar itself with `ShellTop`: the run's screen puts its own trail, ending
 * at the run, in the shell's top bar in place of the shell's `top` while it is shown. Schedules, a
 * plain page, gets the shell's own top bar back.
 */
export const ScreenTop: StoryObj = { name: 'Screen top bar', render: () => <Frame screenTop /> }

/**
 * A screen that holds its head above the content with `ShellHead`: the runs' title and Run now stay
 * in view while the sixty runs under them scroll in the shell's content, still its one scroller.
 * The scroller's thin track keeps its room, so the head and the runs end at one right edge.
 */
export const ScreenHead: StoryObj = { name: 'Screen head', render: () => <Frame screenHead /> }

function DesktopFrame({ collapsed: start = false, player = false }: { collapsed?: boolean; player?: boolean }) {
    const [collapsed, setCollapsed] = useState(start)
    const [moves, setMoves] = useState({ drag: 0, zoom: 0 })
    // The window's own full screen, as a desktop shell's call would put it, and as the app follows it.
    const [windowFull, setWindowFull] = useState(false)
    return (
        <TooltipProvider>
            <Shell
                desktop={{
                    trafficLights: true,
                    onWindowDrag: () => setMoves((old) => ({ ...old, drag: old.drag + 1 })),
                    onWindowZoom: () => setMoves((old) => ({ ...old, zoom: old.zoom + 1 })),
                    ...(player ? { setFullscreen: setWindowFull, fullscreen: windowFull } : {}),
                }}
                palette={placeCommands(GROUPS, () => undefined)}
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={placesAt('runs')}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed={collapsed} onSignOut={() => undefined} />}
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'harbor', href: '#' }, { label: 'Runs' }]}
                        actions={
                            <Button size="sm" variant="outline">
                                Run now
                            </Button>
                        }
                    />
                }
                foot={
                    <StatusLine note="Connected to api.example.org">
                        <StatusItem label="moved">{moves.drag}</StatusItem>
                        <StatusItem label="zoomed">{moves.zoom}</StatusItem>
                        {player && <StatusItem label="window">{windowFull ? 'full screen' : 'windowed'}</StatusItem>}
                    </StatusLine>
                }
            >
                {player ? (
                    <Page>
                        <PageHeader title="Recording" description="The nightly-export run of harbor, as the screen recorded it." />
                        <VideoPlayer src={clip} title="nightly-export, harbor" />
                    </Page>
                ) : (
                    <Page>
                        <PageHeader title="Runs" description="Every run of every job in harbor, newest first." />
                    </Page>
                )}
            </Shell>
        </TooltipProvider>
    )
}

/**
 * The frame in a desktop window whose native title bar is hidden. The story draws the window's
 * buttons where macOS puts them and outlines the strip that moves the window: the rail's head and
 * the top bar. Pressing the strip outside its controls counts a move in the status line, as
 * `onWindowDrag` would start one, and a double click counts a zoom. The expanded rail's head
 * leaves room for the window's buttons before the mark.
 */
export const Desktop: StoryObj = { parameters: { desktopWindow: true }, render: () => <DesktopFrame /> }

/**
 * A collapsed rail is narrower than the buttons: its head stays empty under them, its edge
 * undrawn there, the mark just below, and the top bar leaves what is left of the room.
 */
export const CollapsedRail: StoryObj = {
    name: 'Collapsed rail',
    parameters: { desktopWindow: true },
    render: () => <DesktopFrame collapsed />,
}

/**
 * Full screen through the desktop shell: the shell's `desktop` hands the library the window's own
 * full screen (`setFullscreen`), here a stand-in that only notes the window's state in the status
 * line. The player's fullscreen button puts the window in its full screen through it in place of
 * the browser's, and the player covers the window until Escape or the button again.
 */
export const DesktopFullscreen: StoryObj = {
    name: 'Desktop full screen',
    parameters: { desktopWindow: true },
    render: () => <DesktopFrame player />,
}
