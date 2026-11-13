import type { Meta, StoryObj } from '@storybook/react-vite'
import { Activity, CircleDashed, CircleDot, FileText, Folder, FolderOpen, Gauge, ListChecks, Timer, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Board, type BoardMove } from '@winterop-com/sokkel-ui/board/Board'
import { BoardCard } from '@winterop-com/sokkel-ui/board/BoardCard'
import { BoardColumn } from '@winterop-com/sokkel-ui/board/BoardColumn'
import { Callout } from '@winterop-com/sokkel-ui/Callout'
import { DashboardArrange, type DashboardLayoutItem, type DashboardWidget } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import { DashboardEditActions, useDashboardEdit } from '@winterop-com/sokkel-ui/dashboard/DashboardEdit'
import { DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { DragDrop } from '@winterop-com/sokkel-ui/DragDrop'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { insertItem, moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { ListRow, ListRows } from '@winterop-com/sokkel-ui/ListRow'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SortableGrid, SortableList } from '@winterop-com/sokkel-ui/Sortable'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { moveTreeNode, Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { GaugePanel } from '@winterop-com/sokkel-ui-charts/dashboard/GaugePanel'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import type { PanelSeries } from '@winterop-com/sokkel-ui-charts/dashboard/series'
import { FAILURES, QUEUE, RUNS, TIMES } from '../fixtures/runs'

/**
 * Things put in order or moved between places in a page, all on one engine: a list, a grid of
 * cards, a table's rows, a board, a tree, a row of a list dropped into a tree's folder, and a
 * dashboard whose panels are arranged and added by drag. A mouse drags after a few pixels, a finger
 * after holding still a moment, and the keyboard from a grip; Escape puts a thing back.
 */
const meta: Meta = { title: 'Patterns/Drag and drop', parameters: { frame: 'padded' } }
export default meta

interface Step {
    id: string
    detail: string
}

const STEPS: Step[] = [
    { id: 'fetch', detail: 'Read the orders from the api' },
    { id: 'transform', detail: 'Shape them into the export format' },
    { id: 'validate', detail: 'Check every row against the schema' },
    { id: 'upload', detail: 'Send the file to the archive' },
    { id: 'notify', detail: 'Tell ada and grace it is done' },
]

function Steps({ handle = 'grip' }: { handle?: 'grip' | 'item' }) {
    const [steps, setSteps] = useState(STEPS)
    return (
        <Stack gap="sm" className="mx-auto w-full max-w-md">
            <SortableList
                label="Steps of nightly-export"
                items={steps}
                itemKey={(step) => step.id}
                itemLabel={(step) => step.id}
                handle={handle}
                onMove={(from, to) => setSteps(moveItem(steps, from, to))}
                renderItem={(step, { index }) => (
                    <ListRow title={<span className="font-mono">{step.id}</span>} detail={step.detail} aside={String(index + 1)} />
                )}
            />
        </Stack>
    )
}

/** The steps of a job in the order they run, each dragged by its grip; with a grip focused the arrows move its step. */
export const List: StoryObj = { name: 'Sortable list', render: () => <Steps /> }

/** The whole row is the grip, for rows with nothing else to press: it takes the focus, and the arrows move it. */
export const WholeRows: StoryObj = { name: 'Whole rows', render: () => <Steps handle="item" /> }

/**
 * Moving from the keyboard alone: Tab to a grip, the arrows move its row a place at once, or Space
 * picks it up, the arrows carry it, Space drops it and Escape puts it back. A screen reader hears
 * every step.
 */
export const Keyboard: StoryObj = {
    name: 'Keyboard',
    render: () => (
        <Stack gap="md" className="mx-auto w-full max-w-md">
            <Callout title="Keys">
                Tab to a grip. Up and Down move its row a place. Space picks it up, the arrows carry it, Space drops it and Escape puts it
                back.
            </Callout>
            <Steps />
        </Stack>
    ),
}

interface Project {
    id: string
    detail: string
    status: 'succeeded' | 'failed' | 'running' | 'queued'
}

const PROJECTS: Project[] = [
    { id: 'harbor', detail: 'Exports and the nightly reports', status: 'succeeded' },
    { id: 'juniper', detail: 'The inventory sync and its index', status: 'running' },
    { id: 'larkspur', detail: 'Digests sent to the team', status: 'failed' },
    { id: 'scheduler', detail: 'The queues and their workers', status: 'queued' },
]

/** Projects as cards, put in the order they show on the home page; a card drags as a whole and moves by the arrows once focused. */
export const Grid: StoryObj = {
    name: 'Sortable grid',
    render: function Render() {
        const [projects, setProjects] = useState(PROJECTS)
        return (
            <SortableGrid
                label="Projects"
                items={projects}
                itemKey={(project) => project.id}
                itemLabel={(project) => project.id}
                minItemWidth="14rem"
                onMove={(from, to) => setProjects(moveItem(projects, from, to))}
                renderItem={(project) => (
                    <ItemCard code={project.id} description={project.detail} status={<StatusChip status={project.status} />} />
                )}
            />
        )
    },
}

interface Job {
    name: string
    schedule: string
    owner: string
    last: 'succeeded' | 'failed' | 'running' | 'queued' | 'skipped'
}

const QUEUE_JOBS: Job[] = [
    { name: 'nightly-export', schedule: '0 2 * * *', owner: 'ada', last: 'succeeded' },
    { name: 'sync-inventory', schedule: '*/15 * * * *', owner: 'grace', last: 'running' },
    { name: 'rebuild-index', schedule: '0 4 * * 0', owner: 'linus', last: 'failed' },
    { name: 'send-digest', schedule: '0 7 * * 1-5', owner: 'margaret', last: 'queued' },
    { name: 'import-orders', schedule: '30 * * * *', owner: 'ada', last: 'skipped' },
]

const JOB_COLUMNS: DataColumn<Job>[] = [
    { id: 'name', header: 'Job', width: 'minmax(10rem, 1fr)', cell: (job) => <span className="font-mono">{job.name}</span> },
    { id: 'schedule', header: 'Schedule', width: '9rem', cell: (job) => <span className="font-mono">{job.schedule}</span> },
    { id: 'owner', header: 'Owner', width: '8rem', cell: (job) => job.owner },
    { id: 'last', header: 'Last run', width: '9rem', cell: (job) => <StatusChip status={job.last} /> },
]

/**
 * A queue's jobs in the order the scheduler takes them: each row dragged by the grip at its start, a
 * line showing where it lands, and Alt (Option) with the up and down arrows moving the active row.
 */
export const TableRows: StoryObj = {
    name: 'Table rows',
    render: function Render() {
        const [jobs, setJobs] = useState(QUEUE_JOBS)
        return (
            <DataTable
                columns={JOB_COLUMNS}
                rows={jobs}
                rowKey={(job) => job.name}
                rowLabel={(job) => job.name}
                onReorder={(from, to) => setJobs(moveItem(jobs, from, to))}
                minWidth="auto"
            />
        )
    },
}

interface Card {
    id: string
    code: string
    title: string
    column: 'queued' | 'running' | 'succeeded' | 'archived'
    assignee: string
}

const CARDS: Card[] = [
    { id: 'a', code: 'TID-12', title: 'Rotate the archive keys', column: 'queued', assignee: 'ada' },
    { id: 'b', code: 'TID-14', title: 'Retry sync-inventory after the api upgrade', column: 'queued', assignee: 'grace' },
    { id: 'c', code: 'TID-9', title: 'Split rebuild-index by project', column: 'running', assignee: 'linus' },
    { id: 'd', code: 'TID-7', title: 'Send the digest at seven', column: 'succeeded', assignee: 'margaret' },
    { id: 'e', code: 'TID-3', title: 'Name the scheduler queues', column: 'succeeded', assignee: 'ada' },
]

const COLUMNS = [
    { id: 'queued', title: 'Queued', icon: <CircleDashed className="size-4 text-muted-foreground" aria-hidden /> },
    { id: 'running', title: 'Running', icon: <CircleDot className="size-4 text-status-running" aria-hidden /> },
    { id: 'succeeded', title: 'Succeeded', icon: <CircleDot className="size-4 text-status-succeeded" aria-hidden /> },
] as const

/** Cards moved between a board's columns: pressed anywhere they drag, and a card's grip picks it up from the keyboard. */
export const BoardStory: StoryObj = {
    name: 'Board',
    render: function Render() {
        const [cards, setCards] = useState(CARDS)
        const onMove = ({ card, to, index }: BoardMove) =>
            setCards((now) => {
                const moving = now.find((each) => each.id === card)
                if (moving === undefined) return now
                const rest = now.filter((each) => each.id !== card)
                const inColumn = rest.filter((each) => each.column === to)
                const at = index >= inColumn.length ? rest.length : rest.indexOf(inColumn[index])
                return insertItem(rest, { ...moving, column: to as Card['column'] }, at)
            })
        return (
            <Board onMove={onMove}>
                <Row gap="md" align="start">
                    {COLUMNS.map((column) => {
                        const held = cards.filter((card) => card.column === column.id)
                        return (
                            <BoardColumn
                                key={column.id}
                                id={column.id}
                                title={column.title}
                                icon={column.icon}
                                count={held.length}
                                empty="No items"
                            >
                                {held.map((card) => (
                                    <BoardCard
                                        key={card.id}
                                        id={card.id}
                                        code={card.code}
                                        title={card.title}
                                        assignee={{ name: card.assignee }}
                                    />
                                ))}
                            </BoardColumn>
                        )
                    })}
                </Row>
            </Board>
        )
    },
}

const ARRANGED_COLUMNS = [
    ...COLUMNS,
    { id: 'archived', title: 'Archived', icon: <CircleDashed className="size-4 text-faint" aria-hidden />, locked: true },
]

/** How many cards Running takes before it refuses another. */
const RUNNING_LIMIT = 2

/**
 * A board whose columns move too: a column drags by its head, or from the keyboard by the grip at
 * the head's end, a line between the columns showing where it lands. Archived is locked: its card
 * stays, none lands in it, and no column moves across it. Running refuses a third card, so no line
 * shows there while one is carried over it.
 */
export const BoardColumns: StoryObj = {
    name: 'Board columns',
    render: function Render() {
        const [cards, setCards] = useState<Card[]>([
            ...CARDS,
            { id: 'f', code: 'TID-1', title: 'Move the export to the new bucket', column: 'archived', assignee: 'grace' },
        ])
        const [columns, setColumns] = useState(ARRANGED_COLUMNS)
        const onMove = ({ card, to, index }: BoardMove) =>
            setCards((now) => {
                const moving = now.find((each) => each.id === card)
                if (moving === undefined) return now
                const rest = now.filter((each) => each.id !== card)
                const inColumn = rest.filter((each) => each.column === to)
                const at = index >= inColumn.length ? rest.length : rest.indexOf(inColumn[index])
                return insertItem(rest, { ...moving, column: to as Card['column'] }, at)
            })
        return (
            <Board
                onMove={onMove}
                canDrop={({ from, to }) => to !== 'running' || from === 'running' || cards.filter((card) => card.column === to).length < RUNNING_LIMIT}
                onColumnMove={(from, to) => setColumns(moveItem(columns, from, to))}
            >
                <Row gap="md" align="start">
                    {columns.map((column) => {
                        const held = cards.filter((card) => card.column === column.id)
                        return (
                            <BoardColumn
                                key={column.id}
                                id={column.id}
                                title={column.title}
                                icon={column.icon}
                                count={held.length}
                                limit={column.id === 'running' ? RUNNING_LIMIT : undefined}
                                locked={'locked' in column && column.locked}
                                empty="No items"
                            >
                                {held.map((card) => (
                                    <BoardCard
                                        key={card.id}
                                        id={card.id}
                                        code={card.code}
                                        title={card.title}
                                        assignee={{ name: card.assignee }}
                                    />
                                ))}
                            </BoardColumn>
                        )
                    })}
                </Row>
            </Board>
        )
    },
}

const folder = (id: string, label: string, children: TreeNode[]): TreeNode => ({ id, label, icon: Folder, openIcon: FolderOpen, children })
const file = (id: string, label: string): TreeNode => ({ id, label, icon: FileText })

const RUNBOOKS: TreeNode[] = [
    folder('harbor', 'harbor', [file('harbor-export', 'Run the nightly export'), file('harbor-keys', 'Rotate the archive keys')]),
    folder('juniper', 'juniper', [file('juniper-sync', 'Retry a failed sync'), file('juniper-index', 'Rebuild the index')]),
    folder('larkspur', 'larkspur', []),
    file('oncall', 'On call'),
    file('contacts', 'Who to ask'),
]

/**
 * A tree whose order is the reader's: a row dragged by its upper or lower edge goes beside another,
 * reordering its level, and by its middle into a folder, a line or a ring showing where. Alt
 * (Option) with the arrows moves the focused row: up and down its level, right into the folder
 * above it, left out beside its folder.
 */
export const TreeOrder: StoryObj = {
    name: 'Tree order',
    render: function Render() {
        const [nodes, setNodes] = useState(RUNBOOKS)
        return (
            <Section title="Runbooks" flush className="mx-auto max-w-sm">
                <Tree
                    label="Runbooks"
                    nodes={nodes}
                    selection="none"
                    defaultExpanded={['harbor', 'juniper']}
                    onMove={(id, into, index) => setNodes(moveTreeNode(nodes, id, { into, index }))}
                    className="p-1"
                />
            </Section>
        )
    },
}

/** A tree whose folders keep their own order: rows move only into another folder, held over a closed one to open it. */
export const IntoFolders: StoryObj = {
    name: 'Into folders',
    render: function Render() {
        const [nodes, setNodes] = useState(RUNBOOKS)
        const parentOf = (id: string): string | null => nodes.find((node) => node.children?.some((child) => child.id === id))?.id ?? null
        return (
            <Section title="Runbooks" flush className="mx-auto max-w-sm">
                <Tree
                    label="Runbooks"
                    nodes={nodes}
                    selection="none"
                    defaultExpanded={['harbor']}
                    canMove={(id, into) => into !== parentOf(id)}
                    onMove={(id, into, index) => setNodes(moveTreeNode(nodes, id, { into, index }))}
                    className="p-1"
                />
            </Section>
        )
    },
}

interface Note {
    id: string
    title: string
}

const INBOX: Note[] = [
    { id: 'n-restart', title: 'Restart the worker after a deploy' },
    { id: 'n-export', title: 'Where the export files land' },
    { id: 'n-digest', title: 'Change the digest time' },
]

/**
 * Two parts in one `DragDrop`: notes in an inbox list are ordered among themselves and dragged into
 * a folder of the tree beside it (or beside a row of it), and the tree moves its own rows as well.
 */
export const ListToTree: StoryObj = {
    name: 'List to tree',
    render: function Render() {
        const [inbox, setInbox] = useState(INBOX)
        const [nodes, setNodes] = useState(RUNBOOKS)
        const file = (note: Note): TreeNode => ({ id: note.id, label: note.title, icon: FileText })
        const into = (list: readonly TreeNode[], id: string | null, index: number, node: TreeNode): TreeNode[] =>
            id === null
                ? insertItem(list, node, index)
                : list.map((each) =>
                      each.id === id
                          ? { ...each, children: insertItem(each.children ?? [], node, index) }
                          : each.children === undefined
                            ? each
                            : { ...each, children: into(each.children, id, index, node) },
                  )
        return (
            <DragDrop>
                <Columns count={2} min="sm" gap="lg" className="mx-auto max-w-3xl">
                    <Section title="Inbox" meta={String(inbox.length)}>
                        <SortableList
                            label="Inbox"
                            kind="note"
                            items={inbox}
                            itemKey={(note) => note.id}
                            itemLabel={(note) => note.title}
                            onMove={(from, to) => setInbox(moveItem(inbox, from, to))}
                            renderItem={(note) => <ListRow title={note.title} icon={<FileText className="size-4" aria-hidden />} />}
                        />
                    </Section>
                    <Section title="Runbooks" flush>
                        <Tree
                            label="Runbooks"
                            nodes={nodes}
                            selection="none"
                            defaultExpanded={['harbor']}
                            onMove={(id, place, index) => setNodes(moveTreeNode(nodes, id, { into: place, index }))}
                            accepts={(drag) => drag.kind === 'note'}
                            onDrop={(drag, place, index) => {
                                const note = drag.value as Note
                                setInbox(inbox.filter((each) => each.id !== note.id))
                                setNodes(into(nodes, place, index, file(note)))
                            }}
                            className="p-1"
                        />
                    </Section>
                </Columns>
            </DragDrop>
        )
    },
}

interface Runbook {
    id: string
    title: string
    folder: string | null
}

const SHELVED: Runbook[] = [
    { id: 'r-export', title: 'Run the nightly export', folder: 'harbor' },
    { id: 'r-keys', title: 'Rotate the archive keys', folder: 'harbor' },
    { id: 'r-sync', title: 'Retry a failed sync', folder: 'juniper' },
    { id: 'r-index', title: 'Rebuild the index', folder: 'larkspur' },
    { id: 'r-oncall', title: 'On call', folder: null },
    { id: 'r-digest', title: 'Change the digest time', folder: null },
]

const byTitle = (left: { title: string }, right: { title: string }) => left.title.localeCompare(right.title)

/**
 * A list and a tree that both keep their own order, by name with folders first: the list's rows
 * drag out by their grips though the list is sorted and never reorders, and the tree, told its order
 * (`order` with a band for folders and `sorted`), offers only its folders and the top level as
 * places, never a place beside a row the sort would move. A row dropped there moves the runbook it
 * stands for (`nodeOf`), as a drag in the tree itself does.
 */
export const SortedToFolders: StoryObj = {
    name: 'Sorted to folders',
    render: function Render() {
        const [runbooks, setRunbooks] = useState(SHELVED)
        const level = (folder: string | null) =>
            runbooks
                .filter((one) => one.folder === folder)
                .sort(byTitle)
                .map((one) => file(one.id, one.title))
        const nodes: TreeNode[] = [...['harbor', 'juniper', 'larkspur'].map((name) => folder(name, name, level(name))), ...level(null)]
        const move = (id: string, into: string | null) =>
            setRunbooks(runbooks.map((one) => (one.id === id ? { ...one, folder: into } : one)))
        return (
            <DragDrop>
                <Columns count={2} min="sm" gap="lg" className="mx-auto max-w-4xl">
                    <DataTable
                        variant="list"
                        minWidth="auto"
                        columns={[
                            {
                                id: 'title',
                                header: 'Name',
                                width: 'minmax(10rem,2fr)',
                                cell: (one: Runbook) => one.title,
                                sortValue: (one) => one.title,
                            },
                            { id: 'folder', header: 'Folder', width: '7rem', cell: (one: Runbook) => one.folder ?? 'Top level' },
                        ]}
                        rows={runbooks}
                        rowKey={(one) => one.id}
                        rowLabel={(one) => one.title}
                        defaultSort={{ column: 'title', direction: 'asc' }}
                        dragKind="runbook"
                    />
                    <Section title="Runbooks" flush>
                        <Tree
                            label="Runbooks"
                            nodes={nodes}
                            selection="none"
                            defaultExpanded={['harbor']}
                            order={{ band: (node) => (node.children === undefined ? 'file' : 'folder'), sorted: true }}
                            canMove={(id) => runbooks.some((one) => one.id === id)}
                            onMove={(id, into) => move(id, into)}
                            accepts={(drag) => drag.kind === 'runbook'}
                            nodeOf={(drag) => (drag.value as { row?: Runbook } | undefined)?.row?.id}
                            className="p-1"
                        />
                    </Section>
                </Columns>
            </DragDrop>
        )
    },
}

const HIGH_IS_GOOD: Threshold[] = [{ color: 'critical' }, { value: 95, color: 'warning' }, { value: 99, color: 'good' }]
const QUEUE_STEPS: Threshold[] = [{ color: 'good' }, { value: 20, color: 'warning' }, { value: 40, color: 'critical' }]
const LOAD_STEPS: Threshold[] = [{ color: 'good' }, { value: 70, color: 'warning' }, { value: 85, color: 'critical' }]
const RUN_SERIES: PanelSeries[] = [
    { name: 'Runs', values: RUNS, color: 'chart-2' },
    { name: 'Failures', values: FAILURES, color: 'status-failed' },
]
const QUEUE_SERIES: PanelSeries[] = Object.entries(QUEUE).map(([name, values]) => ({ name, values }))

type PanelKind = 'success' | 'runs' | 'queue' | 'load' | 'activity' | 'depth' | 'failures'

interface Placed extends DashboardLayoutItem {
    kind: PanelKind
    /** The panel's own title, in place of its kind's name. */
    title?: string
}

const NAMES: Record<PanelKind, string> = {
    success: 'Success rate',
    runs: 'Runs',
    queue: 'Queue depth',
    load: 'Worker load',
    activity: 'Runs and failures',
    depth: 'Queue depth by worker',
    failures: 'Recent failures',
}

/** One panel of the job runs dashboard, by its kind. */
function panelOf(item: Placed): ReactNode {
    const title = item.title ?? NAMES[item.kind]
    switch (item.kind) {
        case 'success':
            return <StatPanel title={title} value={99.3} unit="%" decimals={1} thresholds={HIGH_IS_GOOD} sparkline={RUNS} />
        case 'runs':
            return <StatPanel title={title} value={3526} color="chart-2" sparkline={RUNS} delta="+6%" compared="vs yesterday" good />
        case 'queue':
            return <StatPanel title={title} value={30} thresholds={QUEUE_STEPS} sparkline={QUEUE['worker-3']} />
        case 'load':
            return <GaugePanel title={title} value={72} unit="%" thresholds={LOAD_STEPS} />
        case 'activity':
            return <TimeSeriesPanel title={title} subtitle="every 15 min" x={TIMES} series={RUN_SERIES} labelEvery={16} />
        case 'depth':
            return <TimeSeriesPanel title={title} x={TIMES} series={QUEUE_SERIES} step labelEvery={16} />
        case 'failures':
            return (
                <DashboardPanel title={title} flush>
                    <ListRows flush>
                        <ListRow
                            icon={<TriangleAlert className="size-4 text-critical" aria-hidden />}
                            title="rebuild-index"
                            detail="worker-2, 04:12"
                        />
                        <ListRow
                            icon={<TriangleAlert className="size-4 text-critical" aria-hidden />}
                            title="send-digest"
                            detail="worker-4, 07:00"
                        />
                    </ListRows>
                </DashboardPanel>
            )
    }
}

const LAYOUT: Placed[] = [
    { id: 'success', kind: 'success', span: 'sixth' },
    { id: 'runs', kind: 'runs', span: 'sixth' },
    { id: 'queue', kind: 'queue', span: 'sixth' },
    { id: 'load', kind: 'load', span: 'sixth' },
    { id: 'activity', kind: 'activity', span: 'third' },
    { id: 'depth', kind: 'depth', span: 'two-thirds' },
    { id: 'failures', kind: 'failures', span: 'third' },
]

function Arranged({ palette = false }: { palette?: boolean }) {
    const [layout, setLayout] = useState(LAYOUT)
    const [mode, setMode] = useState<'arrange' | 'view'>('arrange')
    const [made, setMade] = useState(0)
    const widgets: DashboardWidget[] = [
        { id: 'success', label: NAMES.success, icon: <Gauge aria-hidden />, span: 'sixth' },
        { id: 'runs', label: NAMES.runs, icon: <ListChecks aria-hidden />, span: 'sixth' },
        { id: 'activity', label: NAMES.activity, icon: <Activity aria-hidden />, span: 'half' },
        { id: 'depth', label: NAMES.depth, icon: <Timer aria-hidden />, span: 'half' },
        { id: 'failures', label: NAMES.failures, icon: <TriangleAlert aria-hidden />, span: 'third' },
    ]
    return (
        <TooltipProvider>
            <Stack gap="md">
                <Row justify="between" wrap>
                    <span className="text-section-title">Job runs</span>
                    <Segmented
                        label="Mode"
                        value={mode}
                        onValueChange={setMode}
                        options={[
                            { value: 'view', label: 'View' },
                            { value: 'arrange', label: 'Arrange' },
                        ]}
                    />
                </Row>
                <DashboardArrange
                    layout={layout}
                    onLayoutChange={setLayout}
                    label={(item) => NAMES[item.kind]}
                    renderPanel={panelOf}
                    arranging={mode === 'arrange'}
                    dense
                    palette={palette ? widgets : undefined}
                    onAdd={(widget, index) => {
                        setMade(made + 1)
                        setLayout(
                            insertItem(
                                layout,
                                { id: `${widget.id}-${String(made)}`, kind: widget.id as PanelKind, span: widget.span },
                                index,
                            ),
                        )
                    }}
                />
            </Stack>
        </TooltipProvider>
    )
}

/**
 * A dashboard arranged by drag: each panel's head holds a grip, its width and a remove while
 * arranging, a line shows where a dragged panel lands, and the layout comes back as `{ id, span }`
 * in order. A narrow panel, as the gauge, gives the tools a line of their own under its title. With
 * a grip focused the arrows move its panel; View draws the plain dashboard.
 */
export const Dashboard: StoryObj = { name: 'Dashboard', render: () => <Arranged /> }

/** The same dashboard with a palette of widgets: one dragged onto the grid adds a panel where it lands, and one pressed adds it at the end. */
export const WidgetPalette: StoryObj = { name: 'Widget palette', render: () => <Arranged palette /> }

/** The job runs dashboard behind an Edit button, each panel's title kept in the layout and changed from its configure button. */
function Edited() {
    const [kept, setKept] = useState(LAYOUT.slice(0, 5))
    const [configuring, setConfiguring] = useState<Placed | null>(null)
    const [title, setTitle] = useState('')
    const edit = useDashboardEdit({
        layout: kept,
        defaultLayout: LAYOUT.slice(0, 5),
        onSave: setKept,
        same: (left, right) => left.id === right.id && left.span === right.span && left.title === right.title,
    })
    const named = (item: Placed) => item.title ?? NAMES[item.kind]
    return (
        <TooltipProvider>
            <Stack gap="md">
                <Row justify="between" wrap>
                    <span className="text-section-title">Job runs</span>
                    <Row gap="sm">
                        <DashboardEditActions edit={edit} />
                    </Row>
                </Row>
                <DashboardArrange
                    layout={edit.layout}
                    onLayoutChange={edit.change}
                    label={named}
                    renderPanel={panelOf}
                    arranging={edit.editing}
                    dense
                    onConfigure={(item) => {
                        setConfiguring(item)
                        setTitle(named(item))
                    }}
                />
            </Stack>
            <DialogShell
                open={configuring !== null}
                onOpenChange={(open) => {
                    if (!open) setConfiguring(null)
                }}
                title="Configure panel"
                width="sm"
                confirm={{
                    label: 'Apply',
                    onConfirm: () => {
                        if (configuring === null) return
                        const given = title.trim()
                        edit.change(
                            edit.layout.map((item) =>
                                item.id === configuring.id
                                    ? { ...item, title: given === '' || given === NAMES[item.kind] ? undefined : given }
                                    : item,
                            ),
                        )
                        setConfiguring(null)
                    },
                }}
            >
                <TextField id="panel-title" label="Title" value={title} onChange={setTitle} />
            </DialogShell>
        </TooltipProvider>
    )
}

/**
 * The dashboard behind an Edit button: while editing, panels move, take a width, come off and open
 * their options from a configure button, all into a draft. Done keeps the draft, Cancel throws it
 * away, and Reset puts the dashboard as it comes in the draft.
 */
export const EditMode: StoryObj = { name: 'Edit mode', render: () => <Edited /> }
