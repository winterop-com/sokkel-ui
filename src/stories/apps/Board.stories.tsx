import type { Meta, StoryObj } from '@storybook/react-vite'
import { format } from 'date-fns'
import {
    CalendarDays,
    Circle,
    CircleCheck,
    CircleDashed,
    CircleDot,
    CircleEllipsis,
    KanbanSquare,
    LayoutDashboard,
    ListChecks,
    Play,
    Plus,
    Settings,
    Tag,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '../../components/AccountMenu'
import { Board as BoardArea, BoardDrop, BoardLane, type BoardMove } from '../../components/board/Board'
import { BoardCard, BoardLabel } from '../../components/board/BoardCard'
import { BoardColumn, BoardColumnHead } from '../../components/board/BoardColumn'
import { DescriptionList } from '../../components/DescriptionList'
import { FilterChip } from '../../components/FilterChip'
import { PageHeader } from '../../components/PageHeader'
import { PersonAvatar } from '../../components/PersonAvatar'
import { Rail, type RailGroup } from '../../components/Rail'
import { SearchField } from '../../components/SearchField'
import { Segmented } from '../../components/Segmented'
import { Shell } from '../../components/Shell'
import { PanelSection, SidePanel } from '../../components/SidePanel'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Timeline } from '../../components/Timeline'
import { TopBar } from '../../components/TopBar'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { TooltipProvider } from '../../components/ui/tooltip'
import { cn } from '../../lib/cn'
import type { KindColor } from '../../lib/kind'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * A board of work items in the library's frame: columns from the backlog to done, each with its
 * count and a limit that warns when it is passed; cards with their code, labels, due date and
 * assignee; a filter bar; swimlanes by project; and the chosen card in the side panel. Cards move
 * by drag and drop, or by "Move to" in a card's menu, and the order is kept in the story's state.
 * "Now" is fixed at 5 November 2026, 09:30, so overdue dates draw the same every time.
 */
const NOW = new Date(2026, 10, 5, 9, 30)

const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#' },
            { id: 'board', label: 'Board', icon: KanbanSquare, href: '#', active: true },
            { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '#' },
            { id: 'runs', label: 'Runs', icon: Play, href: '#' },
            { id: 'jobs', label: 'Jobs', icon: ListChecks, href: '#' },
        ],
    },
    { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '#' }] },
]

type ColumnId = 'backlog' | 'ready' | 'progress' | 'review' | 'done'
type Project = 'harbor' | 'juniper' | 'larkspur'
type Person = 'ada' | 'grace' | 'linus' | 'margaret'

const COLUMNS: { id: ColumnId; title: string; icon: ReactNode; limit?: number }[] = [
    { id: 'backlog', title: 'Backlog', icon: <CircleDashed className="size-4 text-faint" aria-hidden /> },
    { id: 'ready', title: 'Ready', icon: <Circle className="size-4 text-muted-foreground" aria-hidden />, limit: 6 },
    { id: 'progress', title: 'In progress', icon: <CircleDot className="size-4 text-status-running" aria-hidden />, limit: 4 },
    { id: 'review', title: 'Review', icon: <CircleEllipsis className="size-4 text-status-waiting" aria-hidden />, limit: 3 },
    { id: 'done', title: 'Done', icon: <CircleCheck className="size-4 text-status-succeeded" aria-hidden /> },
]

const PROJECTS: { id: Project; title: string }[] = [
    { id: 'harbor', title: 'harbor' },
    { id: 'juniper', title: 'juniper' },
    { id: 'larkspur', title: 'larkspur' },
]

const PEOPLE: Person[] = ['ada', 'grace', 'linus', 'margaret']

const LABELS: Record<string, KindColor> = {
    bug: 'pink',
    feature: 'blue',
    chore: 'teal',
    docs: 'jade',
    design: 'violet',
    test: 'green',
}

interface Item {
    code: string
    title: string
    column: ColumnId
    project: Project
    labels: string[]
    assignee?: Person
    due?: Date
    comments: number
    checklist: { text: string; done: boolean }[]
    description: string
}

const day = (date: number) => new Date(2026, 10, date)

const STEPS = ['Reproduce it', 'Write a failing test', 'Make the change', 'Review', 'Note it in the changelog', 'Tell the people who asked']

const steps = (total: number, done: number) => STEPS.slice(0, total).map((text, index) => ({ text, done: index < done }))

const ITEMS: Item[] = [
    {
        code: 'HRB-151',
        title: 'Export orders as Parquet as well as CSV',
        column: 'backlog',
        project: 'harbor',
        labels: ['feature'],
        assignee: 'grace',
        comments: 2,
        checklist: steps(3, 0),
        description: 'nightly-export writes CSV only. Write Parquet beside it, behind a setting.',
    },
    {
        code: 'JNP-88',
        title: "Show the last five runs on a job's page",
        column: 'backlog',
        project: 'juniper',
        labels: ['feature', 'design'],
        assignee: 'margaret',
        comments: 4,
        checklist: [],
        description: 'A strip of the last five runs, each as its state, under the job title.',
    },
    {
        code: 'LRK-37',
        title: 'send-digest skips people with no email',
        column: 'backlog',
        project: 'larkspur',
        labels: ['bug'],
        assignee: 'grace',
        due: day(20),
        comments: 0,
        checklist: steps(2, 0),
        description: 'They should be listed in the run log as skipped, not dropped without a word.',
    },
    {
        code: 'HRB-149',
        title: 'Document the retry settings for upload',
        column: 'backlog',
        project: 'harbor',
        labels: ['docs'],
        assignee: 'linus',
        comments: 1,
        checklist: [],
        description: 'Attempts, backoff and the timeout, with an example for a slow bucket.',
    },
    {
        code: 'HRB-146',
        title: 'Retry upload when the bucket times out',
        column: 'ready',
        project: 'harbor',
        labels: ['bug'],
        assignee: 'ada',
        due: day(10),
        comments: 3,
        checklist: steps(4, 1),
        description: 'upload gives up on the first timeout from storage.example.org.',
    },
    {
        code: 'JNP-91',
        title: 'Paginate the runs API past 1,000 rows',
        column: 'ready',
        project: 'juniper',
        labels: ['feature'],
        assignee: 'linus',
        due: day(12),
        comments: 0,
        checklist: [],
        description: 'GET /runs stops at 1,000. Add a cursor.',
    },
    {
        code: 'LRK-40',
        title: "Rename the scheduler's queue metrics",
        column: 'ready',
        project: 'larkspur',
        labels: ['chore'],
        comments: 0,
        checklist: [],
        description: 'queue_depth becomes scheduler_queue_depth, with the old name kept for a release.',
    },
    {
        code: 'HRB-142',
        title: 'nightly-export fails when the orders feed is empty',
        column: 'progress',
        project: 'harbor',
        labels: ['bug', 'test'],
        assignee: 'ada',
        due: day(3),
        comments: 7,
        checklist: [
            { text: 'Reproduce with an empty feed', done: true },
            { text: 'Write a failing test', done: true },
            { text: 'Treat an empty feed as zero rows', done: true },
            { text: 'Skip upload when there is nothing to send', done: false },
            { text: 'Note it in the changelog', done: false },
        ],
        description:
            'When api.example.org answers with no orders, transform divides by the row count and the run fails at validate. An empty feed is a normal night and should succeed with zero rows.',
    },
    {
        code: 'JNP-86',
        title: 'Rebuild the search index without downtime',
        column: 'progress',
        project: 'juniper',
        labels: ['feature'],
        assignee: 'linus',
        due: day(5),
        comments: 5,
        checklist: steps(6, 2),
        description: 'Build the new index beside the old one and swap them when it is done.',
    },
    {
        code: 'LRK-33',
        title: 'Move import-orders to the worker pool',
        column: 'progress',
        project: 'larkspur',
        labels: ['chore'],
        assignee: 'margaret',
        due: day(14),
        comments: 0,
        checklist: steps(4, 4),
        description: 'It runs on the scheduler host today.',
    },
    {
        code: 'HRB-144',
        title: 'Validate amounts before upload',
        column: 'progress',
        project: 'harbor',
        labels: ['feature'],
        assignee: 'grace',
        comments: 1,
        checklist: steps(3, 1),
        description: 'Reject rows whose amount is not a number, and say which.',
    },
    {
        code: 'JNP-90',
        title: 'Flaky timeout in the sync-inventory tests',
        column: 'progress',
        project: 'juniper',
        labels: ['bug', 'test'],
        assignee: 'ada',
        due: day(4),
        comments: 2,
        checklist: [],
        description: 'Fails about one run in twenty on the worker image.',
    },
    {
        code: 'LRK-31',
        title: 'A dark palette for the run graph',
        column: 'review',
        project: 'larkspur',
        labels: ['design'],
        assignee: 'margaret',
        comments: 6,
        checklist: steps(5, 5),
        description: 'The edges disappear on a dark background.',
    },
    {
        code: 'HRB-139',
        title: 'Log the row that fails validation',
        column: 'review',
        project: 'harbor',
        labels: ['feature'],
        assignee: 'linus',
        due: day(6),
        comments: 3,
        checklist: steps(3, 2),
        description: 'Name the first failing row and how many more there are.',
    },
    {
        code: 'JNP-84',
        title: 'Upgrade the worker base image',
        column: 'done',
        project: 'juniper',
        labels: ['chore'],
        assignee: 'grace',
        due: day(2),
        comments: 1,
        checklist: steps(3, 3),
        description: 'Done on 2 November.',
    },
    {
        code: 'HRB-137',
        title: 'Keep 30 days of run logs',
        column: 'done',
        project: 'harbor',
        labels: ['feature'],
        assignee: 'ada',
        comments: 0,
        checklist: [],
        description: 'Older logs are pruned by the scheduler each night.',
    },
    {
        code: 'LRK-29',
        title: 'Cancel a queued run from the list',
        column: 'done',
        project: 'larkspur',
        labels: ['feature'],
        assignee: 'linus',
        comments: 2,
        checklist: [],
        description: 'A cancel action on each queued row.',
    },
]

interface Filters {
    query: string
    people: Person[]
    labels: string[]
}

function matches(item: Item, filters: Filters): boolean {
    const query = filters.query.trim().toLowerCase()
    if (query !== '' && !`${item.code} ${item.title}`.toLowerCase().includes(query)) return false
    if (filters.people.length > 0 && (item.assignee === undefined || !filters.people.includes(item.assignee))) return false
    if (filters.labels.length > 0 && !item.labels.some((label) => filters.labels.includes(label))) return false
    return true
}

/** Moves a card to a zone, before a card or at the zone's end, in the one ordered list. */
function moveItem(items: Item[], code: string, column: ColumnId, project: Project | undefined, before: string | null): Item[] {
    const moving = items.find((item) => item.code === code)
    if (moving === undefined) return items
    const moved = { ...moving, column, project: project ?? moving.project }
    const rest = items.filter((item) => item.code !== code)
    let at = before === null ? -1 : rest.findIndex((item) => item.code === before)
    if (at === -1) {
        const last = rest.findLastIndex((item) => item.column === column && item.project === moved.project)
        at = last === -1 ? rest.length : last + 1
    }
    return [...rest.slice(0, at), moved, ...rest.slice(at)]
}

function MoveMenu({ item, onMove }: { item: Item; onMove: (column: ColumnId) => void }) {
    return (
        <>
            <DropdownMenuGroup>
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                {COLUMNS.map((column) => (
                    <DropdownMenuItem key={column.id} disabled={column.id === item.column} onClick={() => onMove(column.id)}>
                        {column.icon}
                        {column.title}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Copy link</DropdownMenuItem>
        </>
    )
}

function LabelFilter({ chosen, onChange }: { chosen: string[]; onChange: (labels: string[]) => void }) {
    const [open, setOpen] = useState(false)
    return (
        <span className="relative inline-flex">
            <FilterChip
                facet="Labels"
                icon={<Tag className="size-3.5 text-muted-foreground" aria-hidden />}
                value={chosen.length === 0 ? undefined : chosen.join(', ')}
                onOpen={() => setOpen(true)}
                onClear={() => onChange([])}
            />
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger tabIndex={-1} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-0 opacity-0" />
                <DropdownMenuContent align="start" className="w-44">
                    {Object.keys(LABELS).map((label) => (
                        <DropdownMenuCheckboxItem
                            key={label}
                            checked={chosen.includes(label)}
                            onCheckedChange={(checked) =>
                                onChange(checked ? [...chosen, label] : chosen.filter((other) => other !== label))
                            }
                        >
                            <BoardLabel name={label} color={LABELS[label]} />
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </span>
    )
}

function PeopleFilter({ chosen, onChange }: { chosen: Person[]; onChange: (people: Person[]) => void }) {
    return (
        <div role="group" aria-label="Assignees" className="flex items-center -space-x-1">
            {PEOPLE.map((person) => {
                const on = chosen.includes(person)
                return (
                    <button
                        key={person}
                        type="button"
                        aria-pressed={on}
                        title={on ? `Stop showing only ${person}'s items` : `Show ${person}'s items`}
                        className={cn(
                            'relative rounded-full ring-2 ring-background transition-[opacity,box-shadow] outline-none hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                            on && 'z-10 ring-primary',
                            chosen.length > 0 && !on && 'opacity-50 hover:opacity-100',
                        )}
                        onClick={() => onChange(on ? chosen.filter((other) => other !== person) : [...chosen, person])}
                    >
                        <PersonAvatar name={person} size="md" />
                    </button>
                )
            })}
        </div>
    )
}

function ItemPanel({ item, onToggle }: { item: Item; onToggle: (index: number) => void }) {
    const column = COLUMNS.find((entry) => entry.id === item.column)
    const done = item.checklist.filter((step) => step.done).length
    return (
        <>
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
                <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                <h2 className="text-title font-semibold">{item.title}</h2>
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-chip bg-secondary px-1.5 py-0.5 text-xs">
                        {column?.icon}
                        {column?.title}
                    </span>
                    {item.labels.map((label) => (
                        <BoardLabel key={label} name={label} color={LABELS[label]} />
                    ))}
                </div>
            </div>
            <PanelSection title="Description">
                <p className="text-sm leading-6 text-pretty">{item.description}</p>
            </PanelSection>
            <PanelSection title="Fields">
                <DescriptionList
                    termWidth="6rem"
                    items={[
                        { term: 'Project', value: item.project, code: true },
                        {
                            term: 'Assignee',
                            value:
                                item.assignee === undefined ? undefined : (
                                    <span className="inline-flex items-center gap-2">
                                        <PersonAvatar name={item.assignee} size="xs" />
                                        {item.assignee}
                                    </span>
                                ),
                        },
                        {
                            term: 'Due',
                            value:
                                item.due === undefined ? undefined : (
                                    <span className={cn(item.due < day(5) && item.column !== 'done' && 'font-medium text-critical-ink')}>
                                        {format(item.due, 'EEEE d MMMM')}
                                    </span>
                                ),
                        },
                        { term: 'Reporter', value: 'margaret' },
                        { term: 'Created', value: '28 October' },
                    ]}
                />
            </PanelSection>
            {item.checklist.length > 0 && (
                <PanelSection title={`Checklist ${done}/${item.checklist.length}`}>
                    <div className="h-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-good" style={{ width: `${(done / item.checklist.length) * 100}%` }} />
                    </div>
                    <ul className="-mx-1 flex flex-col">
                        {item.checklist.map((step, index) => (
                            <li key={step.text}>
                                <label className="flex min-h-8 items-center gap-2.5 rounded-md px-1 text-sm hover:bg-secondary/60">
                                    <Checkbox checked={step.done} onCheckedChange={() => onToggle(index)} />
                                    <span className={cn(step.done && 'text-muted-foreground line-through')}>{step.text}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </PanelSection>
            )}
            <PanelSection title="Activity">
                <Timeline
                    events={[
                        { id: 'made', title: 'margaret opened it', at: '28 Oct' },
                        { id: 'given', title: 'grace assigned it to ada', at: '30 Oct' },
                        {
                            id: 'moved',
                            title: (
                                <>
                                    ada moved it to <span className="font-medium">In progress</span>
                                </>
                            ),
                            at: '2 Nov',
                            tone: 'running',
                        },
                        {
                            id: 'note',
                            title: 'ada commented',
                            detail: 'Reproduced with the 1 November feed: zero rows, and transform divides by it.',
                            at: '3 Nov',
                        },
                        { id: 'run', title: 'nightly-export failed at validate', at: '04:00', tone: 'failed' },
                    ]}
                />
            </PanelSection>
        </>
    )
}

function BoardApp({
    open,
    lanes: initialLanes = false,
    filters: initialFilters = { query: '', people: [], labels: [] },
}: {
    open?: string
    lanes?: boolean
    filters?: Filters
}) {
    const [items, setItems] = useState(ITEMS)
    const [filters, setFilters] = useState(initialFilters)
    const [lanes, setLanes] = useState(initialLanes)
    const [folded, setFolded] = useState<Project[]>([])
    const [chosen, setChosen] = useState<string | null>(open ?? null)
    const [collapsed, setCollapsed] = useState(false)
    const [dark, setDark] = useState(true)
    const shown = items.filter((item) => matches(item, filters))
    const current = items.find((item) => item.code === chosen)

    const onMove = ({ card, to, before }: BoardMove) => {
        const [project, column] = to.includes(':') ? (to.split(':') as [Project, ColumnId]) : [undefined, to as ColumnId]
        setItems((now) => moveItem(now, card, column, project, before))
    }
    const card = (item: Item) => (
        <BoardCard
            key={item.code}
            id={item.code}
            code={item.code}
            title={item.title}
            labels={item.labels.map((name) => ({ name, color: LABELS[name] }))}
            assignee={item.assignee === undefined ? undefined : { name: item.assignee }}
            due={item.due}
            now={NOW}
            done={item.column === 'done'}
            comments={item.comments}
            checklist={{ done: item.checklist.filter((step) => step.done).length, total: item.checklist.length }}
            selected={item.code === chosen}
            onSelect={() => setChosen(item.code)}
            menu={<MoveMenu item={item} onMove={(column) => setItems((now) => moveItem(now, item.code, column, undefined, null))} />}
        />
    )

    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={GROUPS}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={<AccountMenu name="ada" where="tidevann.example.org" collapsed={collapsed} onSignOut={() => undefined} />}
                    />
                }
                top={
                    <TopBar
                        trail={[{ label: 'Tidevann', href: '#' }, { label: 'Board' }]}
                        onSearch={() => undefined}
                        actions={<ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />}
                    />
                }
                panelOpen={current !== undefined}
                onPanelOpenChange={(next) => {
                    if (!next) setChosen(null)
                }}
                panel={
                    current === undefined ? undefined : (
                        <SidePanel
                            width="24rem"
                            tabs={[
                                {
                                    id: 'item',
                                    label: 'Item',
                                    content: (
                                        <ItemPanel
                                            item={current}
                                            onToggle={(index) =>
                                                setItems((now) =>
                                                    now.map((item) =>
                                                        item.code !== current.code
                                                            ? item
                                                            : {
                                                                  ...item,
                                                                  checklist: item.checklist.map((step, at) =>
                                                                      at === index ? { ...step, done: !step.done } : step,
                                                                  ),
                                                              },
                                                    ),
                                                )
                                            }
                                        />
                                    ),
                                },
                            ]}
                        />
                    )
                }
            >
                <div className="flex h-full min-h-0 flex-col">
                    <div className="flex shrink-0 flex-col gap-3 px-(--density-page-inset) pt-(--density-page-top) pb-3">
                        <PageHeader
                            title="Board"
                            count={`${shown.length} of ${items.length} items`}
                            actions={
                                <Button size="sm">
                                    <Plus aria-hidden />
                                    New item
                                </Button>
                            }
                        />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <SearchField
                                value={filters.query}
                                onChange={(query) => setFilters({ ...filters, query })}
                                placeholder="Search items"
                                className="w-full sm:w-56"
                            />
                            <PeopleFilter chosen={filters.people} onChange={(people) => setFilters({ ...filters, people })} />
                            <LabelFilter chosen={filters.labels} onChange={(labels) => setFilters({ ...filters, labels })} />
                            <div className="flex-1" />
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                Swimlanes
                                <Segmented
                                    label="Swimlanes"
                                    value={lanes ? 'project' : 'none'}
                                    options={[
                                        { value: 'none', label: 'None' },
                                        { value: 'project', label: 'Project' },
                                    ]}
                                    onChoose={(value) => setLanes(value === 'project')}
                                />
                            </span>
                        </div>
                    </div>
                    <BoardArea
                        onMove={onMove}
                        columnWidth="min(17rem, calc(100vw - 4rem))"
                        className="flex-1 snap-x snap-mandatory px-(--density-page-inset) pb-4 md:snap-none"
                    >
                        {!lanes ? (
                            <div className="flex h-full w-max gap-3">
                                {COLUMNS.map((column) => {
                                    const cards = shown.filter((item) => item.column === column.id)
                                    return (
                                        <BoardColumn
                                            key={column.id}
                                            id={column.id}
                                            title={column.title}
                                            icon={column.icon}
                                            count={items.filter((item) => item.column === column.id).length}
                                            limit={column.limit}
                                            empty="No items"
                                            className="snap-start scroll-ml-(--density-page-inset)"
                                        >
                                            {cards.map(card)}
                                        </BoardColumn>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex w-max flex-col gap-1">
                                <div
                                    className="sticky top-0 z-20 grid gap-3 bg-background"
                                    style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, var(--board-column))` }}
                                >
                                    {COLUMNS.map((column) => (
                                        <BoardColumnHead
                                            key={column.id}
                                            title={column.title}
                                            icon={column.icon}
                                            count={items.filter((item) => item.column === column.id).length}
                                            limit={column.limit}
                                            className="border-b border-border px-3"
                                        />
                                    ))}
                                </div>
                                {PROJECTS.map((project) => (
                                    <BoardLane
                                        key={project.id}
                                        title={<span className="font-mono">{project.title}</span>}
                                        count={shown.filter((item) => item.project === project.id).length}
                                        columns={COLUMNS.length}
                                        collapsed={folded.includes(project.id)}
                                        onCollapsedChange={(fold) =>
                                            setFolded(fold ? [...folded, project.id] : folded.filter((other) => other !== project.id))
                                        }
                                    >
                                        {COLUMNS.map((column) => (
                                            <BoardDrop
                                                key={column.id}
                                                id={`${project.id}:${column.id}`}
                                                className="bg-muted/50 px-2 py-2 dark:bg-muted/30"
                                            >
                                                {shown.filter((item) => item.project === project.id && item.column === column.id).map(card)}
                                            </BoardDrop>
                                        ))}
                                    </BoardLane>
                                ))}
                            </div>
                        )}
                    </BoardArea>
                </div>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Board' }
export default meta

/** The board in columns, from the backlog to done; "In progress" is past its limit of four. */
export const Board: StoryObj = { name: 'Board', render: () => <BoardApp /> }

/** Narrowed to ada's and grace's bugs: the counts stay the whole column's, the cards are the matches. */
export const Filtered: StoryObj = {
    name: 'Filtered',
    render: () => <BoardApp filters={{ query: '', people: ['ada', 'grace'], labels: ['bug'] }} />,
}

/** HRB-142 open in the side panel, with its description, fields, checklist and activity. */
export const CardOpen: StoryObj = { name: 'Card open', render: () => <BoardApp open="HRB-142" /> }

/** One lane per project under one row of column heads; a lane folds away. */
export const Swimlanes: StoryObj = { name: 'Swimlanes', render: () => <BoardApp lanes /> }
