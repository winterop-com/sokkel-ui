import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Toggle } from '@winterop-com/sokkel-ui/primitives/toggle'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, FolderTree, History as HistoryIcon, LayoutDashboard, Pencil, Play, Plus, Settings } from 'lucide-react'
import { useRef, useState } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { CodeEditor } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DiffView } from '@winterop-com/sokkel-ui/DiffView'
import { EditPreview } from '@winterop-com/sokkel-ui/EditPreview'
import { InlineField } from '@winterop-com/sokkel-ui/InlineField'
import { Markdown, markdownHeadings } from '@winterop-com/sokkel-ui/Markdown'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { SubNav } from '@winterop-com/sokkel-ui/SubNav'
import { TableOfContents, useActiveHeading } from '@winterop-com/sokkel-ui/TableOfContents'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'

/**
 * An internal wiki in the library's frame: the page tree with its search beside the page, the
 * page as rendered markdown with an on-this-page list that follows the reader, an edit mode with
 * the source beside a live preview, and the page's history with the change between two versions.
 */
const GROUPS: RailGroup[] = [
    {
        id: 'work',
        entries: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '#' },
            { id: 'runs', label: 'Runs', icon: Play, href: '#' },
            { id: 'files', label: 'Files', icon: FolderTree, href: '#' },
            { id: 'docs', label: 'Docs', icon: BookOpen, href: '#', active: true },
        ],
    },
    { id: 'system', title: 'System', entries: [{ id: 'settings', label: 'Settings', icon: Settings, href: '#' }] },
]

const PAGES: TreeNode[] = [
    {
        id: 'start',
        label: 'Getting started',
        children: [
            { id: 'welcome', label: 'Welcome' },
            { id: 'access', label: 'Accounts and access' },
            { id: 'glossary', label: 'Glossary' },
        ],
    },
    {
        id: 'runbooks',
        label: 'Runbooks',
        meta: '4',
        children: [
            { id: 'nightly-export', label: 'Nightly export' },
            { id: 'sync-inventory', label: 'Sync inventory' },
            { id: 'rebuild-index', label: 'Rebuild index' },
            { id: 'send-digest', label: 'Send digest' },
        ],
    },
    {
        id: 'projects',
        label: 'Projects',
        children: [
            { id: 'harbor', label: 'harbor', children: [{ id: 'harbor-layout', label: 'Folder layout' }] },
            { id: 'juniper', label: 'juniper' },
            { id: 'larkspur', label: 'larkspur' },
        ],
    },
    {
        id: 'services',
        label: 'Services',
        children: [
            { id: 'api', label: 'api' },
            { id: 'worker', label: 'worker' },
            { id: 'scheduler', label: 'scheduler' },
        ],
    },
]

const FENCE = '```'

const INTRO = `Nightly export copies every order of the day into a CSV in **harbor**, for the monthly review and the dashboards that read it. It runs at 02:00 every night on the worker service.`

const SOURCE_NOTE = `> [!NOTE]
> The export reads from \`api.example.org\` with the service account \`export-bot\`; it never writes back.`

const HOW = `## How it runs

${FENCE}mermaid
flowchart LR
  fetch --> transform --> validate --> upload --> notify
  validate -- rejected rows --> rejected[(rejected/)]
${FENCE}

Each step hands its rows to the next. A step that fails stops the run, and the steps after it are skipped.`

const STEPS = `### Steps

| Step | What it does | Typical time |
| --- | --- | --- |
| fetch | Reads the day's orders from the api | 0.9 s |
| transform | Converts currencies to EUR and drops test orders | 1.3 s |
| validate | Checks every row against the orders schema | 1.9 s |
| upload | Writes the CSV to files.example.org | 0.6 s |
| notify | Posts the summary to the review channel | 0.1 s |`

const CONFIG = (retries: number) => `### Configuration

${FENCE}yaml
job: nightly-export
schedule: "0 2 * * *"
retries: ${retries}
steps:
  - fetch: { url: "https://api.example.org/orders", since: 24h }
  - transform: { currency: EUR }
  - validate: { schema: orders.json }
  - upload: { host: files.example.org, path: /harbor/exports }
${FENCE}`

const FAILS = `## When it fails

> [!WARNING]
> Do not rerun a failed export before the rejected rows are moved out of \`rejected/\`; a rerun appends to the same file.

1. Open the failed run and read the log of the validate step.
2. Fix the rows at the source, or ask ada to mark them as test orders.
3. Move \`rejected/\` aside and start the run again.`

const RETRIES = `### Retries and back-off

The scheduler retries a failed run three times, waiting 5, 15 and 45 minutes. After the third failure it pages whoever is on call.

> [!TIP]
> \`tidevann runs retry nightly-export --from validate\` starts again at the step that failed and keeps the rows already fetched.`

const WHO = (owner: string) => `## Who to ask

- **${owner}** owns the job and its schedule.
- **linus** looks after the worker service.
- **margaret** reads the review and asks for changes to the columns.`

const page = (...parts: string[]) => parts.join('\n\n') + '\n'

/** A version of the page: who saved it, when, what they said, and the text it saved. */
interface Version {
    number: number
    by: string
    at: string
    note: string
    text: string
}

const VERSIONS: Version[] = [
    {
        number: 6,
        by: 'grace',
        at: 'Nov 3, 2026, 16:40',
        note: 'Retry from the failed step',
        text: page(INTRO, SOURCE_NOTE, HOW, STEPS, CONFIG(3), FAILS, RETRIES, WHO('grace')),
    },
    {
        number: 5,
        by: 'linus',
        at: 'Oct 28, 2026, 10:12',
        note: 'Three retries instead of two',
        text: page(INTRO, SOURCE_NOTE, HOW, STEPS, CONFIG(3), FAILS, RETRIES.replace(/\n\n> \[!TIP\][\s\S]*$/, ''), WHO('grace')),
    },
    {
        number: 4,
        by: 'ada',
        at: 'Oct 21, 2026, 09:03',
        note: 'Draw the steps as a diagram',
        text: page(
            INTRO,
            SOURCE_NOTE,
            HOW,
            STEPS,
            CONFIG(2),
            FAILS,
            'The scheduler retries a failed run twice, waiting 5 and 15 minutes.',
            WHO('grace'),
        ),
    },
    {
        number: 3,
        by: 'grace',
        at: 'Oct 14, 2026, 14:27',
        note: 'Hand the job over to grace',
        text: page(
            INTRO,
            SOURCE_NOTE,
            '## How it runs\n\nfetch, transform, validate, upload and notify run in that order. A step that fails stops the run.',
            STEPS,
            CONFIG(2),
            FAILS,
            'The scheduler retries a failed run twice, waiting 5 and 15 minutes.',
            WHO('grace'),
        ),
    },
    {
        number: 2,
        by: 'margaret',
        at: 'Oct 2, 2026, 11:50',
        note: 'What to do when it fails',
        text: page(
            INTRO,
            '## How it runs\n\nfetch, transform, validate, upload and notify run in that order. A step that fails stops the run.',
            STEPS,
            CONFIG(2),
            FAILS,
            WHO('ada'),
        ),
    },
    {
        number: 1,
        by: 'ada',
        at: 'Sep 30, 2026, 17:05',
        note: 'First version',
        text: page(INTRO, '## How it runs\n\nfetch, transform, validate, upload and notify run in that order.', STEPS, WHO('ada')),
    },
]

const CURRENT = VERSIONS[0]

function Reading({ content }: { content: string }) {
    const article = useRef<HTMLDivElement>(null)
    const headings = markdownHeadings(content)
    const active = useActiveHeading(
        article,
        headings.map((heading) => heading.id),
    )
    return (
        <Row gap="3xl" align="stretch">
            <article ref={article} className="max-w-3xl min-w-0 flex-1">
                <Markdown content={content} anchors scale="document" />
            </article>
            <TableOfContents entries={headings} active={active} className="sticky top-0 w-52 shrink-0 self-start max-xl:hidden" />
        </Row>
    )
}

function Editing({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <EditPreview
            edit={<CodeEditor value={value} onChange={onChange} wrap label="The page as markdown" />}
            preview={<Markdown content={value} scale="document" />}
            words={{ edit: 'Markdown' }}
            className="flex-1"
        />
    )
}

const VERSION_COLUMNS: DataColumn<Version>[] = [
    {
        id: 'version',
        header: 'Version',
        width: '1fr',
        cell: (version) => (
            <Row gap="md" align="start">
                <PersonAvatar name={version.by} image={pictureOf(version.by)} />
                <Stack gap="3xs" className="flex-1">
                    <Row align="baseline">
                        <span className="truncate font-medium">{version.note}</span>
                        {version.number === CURRENT.number && <Badge variant="secondary">Current</Badge>}
                    </Row>
                    <MetaLine truncate items={[`Version ${String(version.number)}`, version.by, version.at]} />
                </Stack>
            </Row>
        ),
    },
]

function Versions({ chosen, onChoose }: { chosen: number; onChoose: (number: number) => void }) {
    return (
        <DataTable
            variant="list"
            columns={VERSION_COLUMNS}
            rows={VERSIONS}
            rowKey={(version) => String(version.number)}
            rowHeight="auto"
            onOpen={(version) => onChoose(version.number)}
            opened={(version) => version.number === chosen}
            resizable={false}
        />
    )
}

function Compare({ chosen, against, onAgainst }: { chosen: number; against: number; onAgainst: (number: number) => void }) {
    const after = VERSIONS.find((version) => version.number === chosen) ?? CURRENT
    const before = VERSIONS.find((version) => version.number === against)
    const earlier = VERSIONS.filter((version) => version.number < chosen)
    return (
        <Stack as="section" className="flex-1">
            <Row gap="md" rowGap="sm" wrap>
                <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
                    Version {after.number}, {after.note}
                </h2>
                {earlier.length > 0 && (
                    <InlineField id="compare-with" label="Compared with" size="sm">
                        <NativeSelect
                            id="compare-with"
                            size="sm"
                            value={String(against)}
                            onChange={(event) => onAgainst(Number(event.target.value))}
                        >
                            {earlier.map((version) => (
                                <NativeSelectOption key={version.number} value={String(version.number)}>
                                    Version {version.number}
                                </NativeSelectOption>
                            ))}
                        </NativeSelect>
                    </InlineField>
                )}
            </Row>
            <DiffView before={before?.text ?? ''} after={after.text} title="nightly-export.md" size="sm" />
        </Stack>
    )
}

function DocsApp({ mode: initialMode = 'read' }: { mode?: 'read' | 'edit' | 'history' }) {
    const [dark, setDark] = useState(true)
    const [collapsed, setCollapsed] = useState(false)
    const [query, setQuery] = useState('')
    const [pageId, setPageId] = useState('nightly-export')
    const [mode, setMode] = useState(initialMode)
    const [draft, setDraft] = useState(
        CURRENT.text.replace(
            'After the third failure it pages whoever is on call.',
            'After the third failure it pages whoever is on call, and the run shows as failed on the overview.',
        ),
    )
    const [chosen, setChosen] = useState(4)
    const [against, setAgainst] = useState(3)

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
                        defaultSize={232}
                        foot={
                            <AccountMenu
                                name="grace"
                                image={pictureOf('grace')}
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSignOut={() => undefined}
                            />
                        }
                    />
                }
                top={
                    <TopBar
                        trail={[
                            { label: 'Docs', href: '#' },
                            { label: 'Runbooks', href: '#' },
                            { label: 'Nightly export', href: mode === 'read' ? undefined : '#' },
                            ...(mode === 'edit' ? [{ label: 'Edit' }] : mode === 'history' ? [{ label: 'History' }] : []),
                        ]}
                        onSearch={() => undefined}
                        actions={<ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />}
                    />
                }
                foot={
                    <StatusLine note={mode === 'edit' ? 'Draft not saved' : 'Saved'} tone={mode === 'edit' ? 'warn' : undefined}>
                        <StatusItem label="pages">38</StatusItem>
                    </StatusLine>
                }
            >
                <Row gap="none" align="stretch" className="h-full min-h-0">
                    <SubNav
                        label="Pages"
                        search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                        actions={
                            <IconButton label="New page">
                                <Plus aria-hidden />
                            </IconButton>
                        }
                    >
                        <Tree
                            label="Pages"
                            nodes={PAGES}
                            query={query}
                            selected={[pageId]}
                            onSelect={(ids) => setPageId(ids[0])}
                            defaultExpanded={['runbooks', 'projects']}
                        />
                    </SubNav>
                    <Stack gap="none" className="min-h-0 flex-1 overflow-y-auto">
                        <Stack
                            gap="lg"
                            className={cn(
                                'w-full px-(--density-page-inset) pt-(--density-page-top) pb-10',
                                mode === 'edit' && 'min-h-0 flex-1 pb-(--density-page-inset)',
                                mode === 'read' && 'max-w-[68rem]',
                            )}
                        >
                            <PageHeader
                                title="Nightly export"
                                meta={
                                    <>
                                        <PersonAvatar name={CURRENT.by} image={pictureOf(CURRENT.by)} />
                                        <span className="truncate">
                                            Last edited by <span className="font-medium text-foreground">{CURRENT.by}</span> on {CURRENT.at}
                                        </span>
                                    </>
                                }
                                actions={
                                    <>
                                        {mode === 'edit' ? (
                                            <>
                                                <Button variant="ghost" size="sm" onClick={() => setMode('read')}>
                                                    Cancel
                                                </Button>
                                                <Button size="sm" onClick={() => setMode('read')}>
                                                    Save
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Toggle
                                                    size="sm"
                                                    pressed={mode === 'history'}
                                                    onPressedChange={(pressed) => setMode(pressed ? 'history' : 'read')}
                                                >
                                                    <HistoryIcon aria-hidden />
                                                    History
                                                </Toggle>
                                                <Button variant="outline" size="sm" onClick={() => setMode('edit')}>
                                                    <Pencil aria-hidden />
                                                    Edit
                                                </Button>
                                            </>
                                        )}
                                    </>
                                }
                            />
                            {mode === 'read' && <Reading content={CURRENT.text} />}
                            {mode === 'edit' && <Editing value={draft} onChange={setDraft} />}
                            {mode === 'history' && (
                                <Row gap="lg" align="start" stackBelow="lg">
                                    <Stack gap="sm" className="w-full shrink-0 lg:w-80">
                                        <GroupLabel as="h2">{VERSIONS.length} versions</GroupLabel>
                                        <Versions
                                            chosen={chosen}
                                            onChoose={(number) => {
                                                setChosen(number)
                                                setAgainst(number - 1)
                                            }}
                                        />
                                    </Stack>
                                    <Compare chosen={chosen} against={against} onAgainst={setAgainst} />
                                </Row>
                            )}
                        </Stack>
                    </Stack>
                </Row>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Docs' }
export default meta

/** A runbook as a reader sees it, the list of its headings beside it marking where the reader is. */
export const Page: StoryObj = { render: () => <DocsApp /> }

/** The same page being edited: its markdown beside the preview, which follows every keystroke. */
export const Editing_: StoryObj = { name: 'Editing', render: () => <DocsApp mode="edit" /> }

/** The page's versions, newest first, and what version 4 changed against the one before it. */
export const History: StoryObj = { render: () => <DocsApp mode="history" /> }
