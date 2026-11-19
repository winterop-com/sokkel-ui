import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, Braces, FileText, FolderTree, LayoutDashboard, Play, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { CodeEditor } from '@winterop-com/sokkel-ui/CodeEditor'
import { EditPreview, type EditPreviewView } from '@winterop-com/sokkel-ui/EditPreview'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Markdown, markdownSection, splitFrontmatter, type MarkdownLinks, type MarkdownParts } from '@winterop-com/sokkel-ui/Markdown'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { SubNav } from '@winterop-com/sokkel-ui/SubNav'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { Toggle } from '@winterop-com/sokkel-ui/primitives/toggle'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { HARBOR_DUSK } from '../fixtures/photos'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * Everything `Markdown` draws, one page per kind, in the app's frame: the pages listed beside the
 * page, each written in the editor beside its live preview, so a change shows as it is typed.
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

interface Sample {
    id: string
    title: string
    text: string
}

const SAMPLES: Sample[] = [
    {
        id: 'text',
        title: 'Text and lists',
        text: `# Text and lists

Words can be **strong**, *emphasized*, ~~struck~~, \`code\`, ==highlighted== or a
[link to example.org](https://example.org/tides). A line break inside a paragraph stays a space,
as CommonMark has it.

<!-- A comment like this one is never drawn. -->

## Lists

- fetch
- transform
    - validate
- upload

1. Open the run.
2. Read the failed step's log.
3. Run again from the failed step.

## Tasks

- [x] Rotate the api keys
- [ ] Ask margaret about the export's retention
- [ ] Move \`rejected/\` aside

## Quotes and rules

> The tide tables are kept by the harbor office, not by us.

---

The export runs at 02:00 UTC.[^utc] Its log is kept a week.[^log]

[^utc]: The scheduler reads every time in UTC.
[^log]: Older logs are in the larkspur bucket.
`,
    },
    {
        id: 'tables',
        title: 'Tables',
        text: `# Tables

| Job | Last run | Took | Rows |
| :-- | :-- | --: | --: |
| nightly-export | succeeded | 4 min | 18,204 |
| sync-inventory | failed | 1 min | 0 |
| rebuild-index | running | 12 min | 96,551 |
| send-digest | queued | | |

A table written with an empty header row is drawn without one, as a list of facts:

| | |
| --- | --- |
| Owner | grace |
| Schedule | Every night at 02:00 UTC |
| Steps | fetch, transform, validate, upload, notify |
`,
    },
    {
        id: 'code',
        title: 'Code',
        text: `# Code

Fences are highlighted in the theme's code colors, each language loaded the first time it is shown.

\`\`\`typescript
export async function retry(run: Run): Promise<Run> {
    return api.post(\`/runs/\${run.id}/retry\`, { from: run.failedStep })
}
\`\`\`

\`\`\`rust
fn upload(batch: &[Row]) -> Result<usize, Error> {
    let sent = client.post("/import-orders").json(batch).send()?;
    Ok(sent.count)
}
\`\`\`

\`\`\`python
def failed(runs):
    return [run for run in runs if run.state == "failed"]
\`\`\`

\`\`\`sql
select job, count(*) as failures
from runs
where state = 'failed'
group by job;
\`\`\`

\`\`\`bash
tidevann runs retry nightly-export --from validate
\`\`\`

\`\`\`jq
.runs[] | select(.state == "failed") | .job
\`\`\`

\`\`\`diff
- schedule: "0 1 * * *"
+ schedule: "0 2 * * *"
\`\`\`
`,
    },
    {
        id: 'math',
        title: 'Math',
        text: `# Math

A run's share of failures is $f = \\frac{n_\\text{failed}}{n}$, and "costs $5 and $10" stays prices.

$$
\\bar{t} = \\frac{1}{n} \\sum_{i=1}^{n} t_i
$$

\`\`\`math
\\sigma = \\sqrt{\\frac{1}{n} \\sum_{i=1}^{n} (t_i - \\bar{t})^2}
\`\`\`
`,
    },
    {
        id: 'diagrams',
        title: 'Diagrams',
        text: `# Diagrams

A \`mermaid\` fence is drawn as a diagram in the theme's colors, with its source, a copy and a full
screen view one press away.

\`\`\`mermaid
flowchart LR
    fetch --> transform --> validate --> upload --> notify
    validate -- rejected --> rejected[(rejected/)]
\`\`\`

\`\`\`mermaid
sequenceDiagram
    scheduler->>worker: start nightly-export
    worker->>api: fetch rows
    api-->>worker: 18,204 rows
    worker->>scheduler: succeeded
\`\`\`
`,
    },
    {
        id: 'callouts',
        title: 'Callouts',
        text: `# Callouts

> [!NOTE]
> The export reads from the api and never writes back.

> [!TIP]
> \`tidevann runs retry\` starts again at the step that failed.

> [!IMPORTANT]
> The schedule is in UTC.

> [!WARNING]
> A rerun appends to the same file.

> [!CAUTION]
> Deleting a project deletes its runs.

## Titled and folded

> [!warning] Before a rerun
> Move \`rejected/\` aside first.

> [!question]- Why from the failed step?
> The steps before it keep their output, so nothing is read twice.

> [!success]+ Last run
> All five steps succeeded in 4 minutes.

## Further markers

> [!todo]
> Ask grace about retention.

> [!bug] Upload times out on large batches
> Seen on import-orders since Tuesday.

> [!unknown] A marker no kind knows
> stays a plain quote.
`,
    },
    {
        id: 'links',
        title: 'Linked notes',
        text: `# Linked notes

[[nightly-export]] links to a note, [[nightly-export|the export]] shows other words, and
[[Retry a run#Steps]] names a heading. A link to a note that does not exist yet, such as
[[Export retention]], is drawn faint. Tags such as #runbook and #on-call are chips.

Links are not read in code: \`[[nightly-export]]\`.
`,
    },
    {
        id: 'embeds',
        title: 'Embeds and files',
        text: `# Embeds and files

A note embedded whole:

![[nightly-export]]

One section of a note:

![[Retry a run#Steps]]

An image embedded at 320 wide, its address pointed at the app's own copy:

![[harbor.svg|320]]

A file links to itself: ![[export-2026-11-02.pdf]]
`,
    },
    {
        id: 'properties',
        title: 'Properties',
        text: `---
title: Nightly export
owner: grace
project: harbor
steps: [fetch, transform, validate, upload, notify]
---
# Properties

The block between the two \`---\` lines at the top is the note's properties. It is left out of the
page, or shown above it with **Show properties**.

A text that opens with a rule and a sentence is not read as properties.
`,
    },
    {
        id: 'parts',
        title: 'App parts',
        text: `# App parts

The app's own parts stand where the text marks them, so the page stays one document:

<!-- part:state -->

The last run of nightly-export <!-- part:state --> at 02:00 UTC.
`,
    },
]

/** The notes the links and embeds name. */
const NOTES: Record<string, string> = {
    'nightly-export': `**nightly-export** runs at 02:00 UTC: fetch, transform, validate, upload, notify. Owned by grace.`,
    'Retry a run': `# Retry a run

Intro left out of a section embed.

## Steps

1. Open the run and read the failed step's log.
2. Fix the cause.
3. Run again from the failed step.

## After

Watch the validate step.`,
}

const PARTS: MarkdownParts = { state: <StatusChip status="succeeded" /> }

const VIEWS = [
    { value: 'edit', label: 'Edit' },
    { value: 'both', label: 'Both' },
    { value: 'preview', label: 'Read' },
] as const

const PAGES: TreeNode[] = SAMPLES.map((sample) => ({ id: sample.id, label: sample.title, icon: FileText }))

function MarkdownApp({ start = 'text', view: initialView = 'both' }: { start?: string; view?: EditPreviewView }) {
    const [collapsed, setCollapsed] = useState(false)
    const [chosen, setChosen] = useState(start)
    const [texts, setTexts] = useState<Record<string, string>>(() => Object.fromEntries(SAMPLES.map((sample) => [sample.id, sample.text])))
    const [view, setView] = useState<EditPreviewView>(initialView)
    const [properties, setProperties] = useState(false)
    const [followed, setFollowed] = useState('Nothing followed yet')
    const sample = SAMPLES.find((one) => one.id === chosen) ?? SAMPLES[0]
    const text = texts[sample.id] ?? sample.text

    const links = useMemo<MarkdownLinks>(() => {
        const plain: MarkdownLinks = {
            onOpen: (target, heading) => setFollowed(heading === undefined ? `Opened ${target}` : `Opened ${target} at ${heading}`),
            exists: (target) => target in NOTES,
            onTag: (tag) => setFollowed(`Tag #${tag}`),
        }
        return {
            ...plain,
            embed: (target, heading) => {
                const note = NOTES[target]
                if (note === undefined) return null
                const body = splitFrontmatter(note).body
                const shown = heading === undefined ? body : markdownSection(body, heading)
                return shown === undefined ? null : <Markdown content={shown} scale="document" links={plain} />
            },
        }
    }, [])

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
                        trail={[{ label: 'Docs', href: '#' }, { label: 'Markdown', href: '#' }, { label: sample.title }]}
                        onSearch={() => undefined}
                    />
                }
                foot={
                    <StatusLine note={followed}>
                        <StatusItem label="pages">{SAMPLES.length}</StatusItem>
                    </StatusLine>
                }
            >
                <Row gap="none" align="stretch" className="h-full min-h-0">
                    <SubNav label="Pages">
                        <Tree label="Pages" nodes={PAGES} selected={[sample.id]} onSelect={(ids) => setChosen(ids[0] ?? chosen)} />
                    </SubNav>
                    <Stack
                        gap="lg"
                        className="min-h-0 min-w-0 flex-1 px-(--density-page-inset) pt-(--density-page-top) pb-(--density-page-inset)"
                    >
                        <PageHeader
                            title={sample.title}
                            actions={
                                <>
                                    <Toggle size="sm" pressed={properties} onPressedChange={setProperties}>
                                        <Braces aria-hidden />
                                        Show properties
                                    </Toggle>
                                    <Segmented size="sm" label="Show" value={view} options={VIEWS} onValueChange={setView} />
                                </>
                            }
                        />
                        <EditPreview
                            key={sample.id}
                            view={view}
                            className="min-h-0 flex-1"
                            edit={
                                <CodeEditor
                                    label={`${sample.title} as markdown`}
                                    language="markdown"
                                    value={text}
                                    onChange={(next) => setTexts((all) => ({ ...all, [sample.id]: next }))}
                                    wrap
                                />
                            }
                            preview={
                                <Markdown
                                    content={text}
                                    scale="document"
                                    anchors
                                    links={links}
                                    parts={PARTS}
                                    frontmatter={properties ? 'show' : 'hide'}
                                    resolveUrl={(url, use) => (use === 'image' && url.endsWith('harbor.svg') ? HARBOR_DUSK : url)}
                                />
                            }
                            words={{ edit: 'Markdown' }}
                        />
                    </Stack>
                </Row>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Markdown' }
export default meta

/** The first page, text and lists, written beside its preview. */
export const Guide: StoryObj = { render: () => <MarkdownApp /> }
/** Callouts: the five kinds, titled and folded ones, the further markers and an unknown one. */
export const Callouts: StoryObj = { render: () => <MarkdownApp start="callouts" view="preview" /> }
/** Embeds: a note, a section of one, an image at a width, a markdown image and a file. */
export const Embeds: StoryObj = { render: () => <MarkdownApp start="embeds" view="preview" /> }
/** Code in eight languages, Rust among them. */
export const Code: StoryObj = { render: () => <MarkdownApp start="code" view="preview" /> }
