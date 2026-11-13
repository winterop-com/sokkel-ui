import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useRef, useState } from 'react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Markdown, markdownHeadings } from '@winterop-com/sokkel-ui/Markdown'
import { PlainMarkdown } from '@winterop-com/sokkel-ui/PlainMarkdown'
import { TableOfContents, useActiveHeading } from '@winterop-com/sokkel-ui/TableOfContents'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'

/** The parts of a long page: callouts in markdown, and the list of its headings that follows the reader. */
const CALLOUTS = `> [!NOTE]
> The export reads from \`api.example.org\` and never writes back.

> [!TIP]
> \`tidevann runs retry nightly-export --from validate\` starts again at the step that failed.

> [!IMPORTANT]
> The schedule is in UTC, not in the time of the site.

> [!WARNING]
> A rerun appends to the same file; move \`rejected/\` aside first.

> [!CAUTION]
> Deleting the project removes every export in it, for everyone.

> A plain quote stays a quote.
`

const RUNBOOK = `## Finding failed runs

The runs endpoint answers in JSON. This filter keeps the failed ones and counts them by job:

\`\`\`jq
# Failed runs of each job, newest first
[.runs[] | select(.state == "failed") | {job, at: .finished_at}]
  | group_by(.job)
  | map({job: .[0].job, count: length, last: (max_by(.at) | .at // null)})
\`\`\`

The last run of nightly-export <!-- part:state --> at the upload step:

<!-- part:run -->

## What the worker printed

\`\`\`ansi
\u001b[32m✓\u001b[0m fetch      \u001b[2m1.2s\u001b[0m
\u001b[32m✓\u001b[0m transform  \u001b[2m0.8s\u001b[0m
\u001b[31m✗\u001b[0m upload     \u001b[1;31mconnection reset\u001b[0m
\`\`\`

## Retrying

Start again from the step that failed with \`tidevann runs retry 4812 --from upload\`.
`

const BODY =
    'The scheduler starts nightly-export at 02:00 on the worker service. Each step hands its rows to the next, and a step that fails stops the run, so the steps after it are skipped.'

const SECTIONS: [string, string[]][] = [
    ['Overview', ['What it reads', 'What it writes']],
    ['Schedule', ['Time zones', 'Pausing a run']],
    ['Failures', ['Rejected rows', 'Retries and back-off']],
    ['Owners', ['Who is on call']],
]

const PAGE = SECTIONS.map(([title, subs]) =>
    [`## ${title}`, BODY, BODY, ...subs.flatMap((sub) => [`### ${sub}`, BODY, BODY, BODY])].join('\n\n'),
).join('\n\n')

function Callouts() {
    return (
        <div className="max-w-2xl p-6">
            <Markdown content={CALLOUTS} />
        </div>
    )
}

const PLAIN = [
    '## Retry policy',
    '',
    'A step is tried again up to its `retries`, waiting $2^n$ seconds before try $n$.',
    '',
    '```mermaid',
    'flowchart LR',
    '  fetch --> transform --> validate --> upload',
    '```',
    '',
    '> [!NOTE]',
    '> The schedule is in UTC.',
].join('\n')

/** The same text in `PlainMarkdown`: the formula stays as written and the mermaid fence is code. */
function Plain() {
    return (
        <div className="max-w-2xl p-6">
            <PlainMarkdown content={PLAIN} />
        </div>
    )
}

/** A job's description as its owner wrote it, read from the server: headings, an image, links of every kind and a key/value table. */
const DESCRIPTION = [
    '# sync-inventory',
    '',
    'Copies the stock counts from the warehouse service into harbor every hour.',
    '',
    '![Last week of runs](https://example.org/sync-inventory/runs.png)',
    '',
    '## Owners',
    '',
    '| | |',
    '|---|---|',
    '| Owner | [margaret](mailto:margaret@example.org) |',
    '| Runbook | [Retrying a run](https://example.org/runbooks/retry) |',
    '| Dashboard | [Inventory](/projects/harbor/inventory) |',
    '| Status | [check now](javascript:alert(document.cookie)) |',
    '',
    '## When it fails',
    '',
    'Retry the `upload` step first, then ask in [the channel](irc://example.org/harbor).',
].join('\n')

/**
 * Text other people wrote, set under a section's title: no image is fetched, only https and mailto
 * links are live, and its headings start under the section's.
 */
function Untrusted() {
    return (
        <div className="max-w-2xl p-6">
            <Stack gap="page">
                <Section title="Description" description="As the job's owner wrote it.">
                    <PlainMarkdown content={DESCRIPTION} images={false} linkSchemes={['https', 'mailto']} headingOffset={2} />
                </Section>
                <Field
                    id="schedule"
                    label="Schedule"
                    help={
                        <PlainMarkdown
                            inline
                            linkSchemes={['https']}
                            content={
                                'When the job runs, in **UTC**. See [schedules](https://example.org/docs/schedules) for the `cron` form.'
                            }
                        />
                    }
                >
                    <NativeSelect id="schedule" defaultValue="hourly" className="w-full">
                        <NativeSelectOption value="hourly">Every hour</NativeSelectOption>
                        <NativeSelectOption value="nightly">Nightly</NativeSelectOption>
                        <NativeSelectOption value="weekly">Weekly</NativeSelectOption>
                    </NativeSelect>
                </Field>
            </Stack>
        </div>
    )
}

/** A runbook with a jq fence, ANSI output, and the app's own parts set into the text by their markers. */
function Runbook() {
    return (
        <div className="max-w-2xl p-6">
            <Markdown
                content={RUNBOOK}
                anchors
                scale="document"
                parts={{
                    state: <StatusChip status="failed" />,
                    run: (
                        <DescriptionList
                            items={[
                                { term: 'Run', value: '4812', numeric: true },
                                { term: 'Project', value: 'harbor' },
                                { term: 'Started by', value: 'ada' },
                                { term: 'Step', value: 'upload', code: true },
                            ]}
                        />
                    ),
                }}
            />
        </div>
    )
}

const MEASURED = `## How nightly-export runs

The scheduler starts nightly-export at 02:00 on the worker service. Each step hands its rows to the next, and a step that fails stops the run, so the steps after it are skipped and the run is marked failed until someone retries it.

- fetch reads the orders from api.example.org since the last run that succeeded.
- transform and validate turn them into the export's rows and set aside the ones that do not read.
- upload writes the file, and notify tells the owners of harbor that it is there.

| Step | Service | Median | Slowest | Rows in | Rows out | Rejected | Last failure |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fetch | worker | 1.2s | 4.8s | 0 | 18 204 | 0 | never |
| transform | worker | 0.8s | 2.1s | 18 204 | 18 204 | 0 | never |
| validate | worker | 0.4s | 1.0s | 18 204 | 18 131 | 73 | run 4790 |
| upload | worker | 3.6s | 41.0s | 18 131 | 18 131 | 0 | run 4812 |

\`\`\`sh
tidevann runs retry 4812 --from upload --project harbor --notify ada,grace --wait
\`\`\`

> A rerun appends to the same file, so move the rejected rows aside before you start it again.
`

/** A wide pane holding a document: its prose to the reading measure, its table and code across the pane. */
function Measured() {
    return (
        <div className="p-6">
            <Markdown content={MEASURED} scale="document" measure />
        </div>
    )
}

const NOTE = `## Nightly export

The [[Nightly export]] job runs at 02:00 on the worker. When it fails, follow [[Runbooks/Retry a run|the retry runbook]] and
tell the owner of [[harbor]]. The steps are in [[Nightly export#Steps]].

Open questions for [[Weekly sync with grace]] and a page nobody wrote yet, [[Export retention]].

#runbook #on-call/weekly
`

const NOTES = new Set(['Nightly export', 'Runbooks/Retry a run', 'harbor', 'Weekly sync with grace'])

/** A note's links to other notes and its tags, each followed by the app; the line under it says what was followed. */
function LinkedNote() {
    const [followed, setFollowed] = useState('Nothing yet')
    return (
        <div className="max-w-2xl p-6">
            <Markdown
                content={NOTE}
                scale="document"
                links={{
                    onOpen: (target, heading) => setFollowed(heading === undefined ? `Note ${target}` : `Note ${target}, at ${heading}`),
                    exists: (target) => NOTES.has(target),
                    onTag: (tag) => setFollowed(`Tag #${tag}`),
                }}
            />
            <p className="mt-6 text-sm text-muted-foreground">Followed: {followed}</p>
        </div>
    )
}

const SHOW_NOTES = `Ada and grace walk the harbor at low water and count what the tide left behind.

- [00:00](#t=0) The harbor at low water
- [01:12](#t=72) Rock pools on the north wall
- [02:40](#t=160) What the boats bring in

More from this season in [the harbor project](#/projects/harbor). The tide tables are at
[example.org](https://example.org/tides), which opens in a new tab.
`

/** An episode's notes whose times and app routes the app follows in the page; the line under it says what was followed. */
function ShowNotes() {
    const [followed, setFollowed] = useState('Nothing yet')
    return (
        <div className="max-w-2xl p-6">
            <Markdown
                content={SHOW_NOTES}
                scale="document"
                onLink={(href) => {
                    const time = /^#t=(\d+)$/.exec(href)
                    if (time !== null) setFollowed(`Seek to ${time[1]} seconds`)
                    else if (href.startsWith('#/')) setFollowed(`Route ${href.slice(1)}`)
                    else return false
                    return true
                }}
            />
            <p className="mt-6 text-sm text-muted-foreground">Followed: {followed}</p>
        </div>
    )
}

function Contents() {
    const article = useRef<HTMLElement>(null)
    const headings = markdownHeadings(PAGE)
    const active = useActiveHeading(
        article,
        headings.map((heading) => heading.id),
    )
    return (
        <div className="h-svh overflow-y-auto">
            <Row gap="3xl" align="stretch" className="p-6">
                <article ref={article} className="max-w-2xl min-w-0 flex-1">
                    <Markdown content={PAGE} anchors scale="document" />
                </article>
                <TableOfContents entries={headings} active={active} className="sticky top-6 w-52 shrink-0 self-start max-md:hidden" />
            </Row>
        </div>
    )
}

/** A form's parts beside it, each with a mark for its state: complete, needing attention, not started. */
function FormOutline() {
    return (
        <TableOfContents
            entries={[
                {
                    id: 'where',
                    label: 'Where and when',
                    level: 1,
                    icon: <CheckCircle2 className="size-4 text-good-ink" aria-label="Complete" />,
                },
                {
                    id: 'measurements',
                    label: 'Measurements',
                    level: 1,
                    icon: <CircleAlert className="size-4 text-critical-ink" aria-label="Needs attention" />,
                },
                { id: 'conditions', label: 'Site check', level: 1, icon: <Dot outline /> },
                { id: 'notes', label: 'Notes', level: 1, icon: <Dot outline /> },
            ]}
            active="measurements"
            onJump={() => undefined}
            words={{ title: 'On this form' }}
            className="w-52"
        />
    )
}

const meta: Meta = { title: 'Patterns/Docs' }
export default meta

/** Each kind of callout a quote becomes from its first line, and a plain quote. */
export const Callout: StoryObj = { name: 'Callouts', render: () => <Callouts /> }
/**
 * `PlainMarkdown`: everything `Markdown` draws save math and diagrams, so a formula stays as written
 * and a mermaid fence shows as code, and an app that renders only this carries neither KaTeX nor
 * Mermaid in its build.
 */
export const PlainText: StoryObj = { name: 'Plain markdown', render: () => <Plain /> }

/**
 * Text other people wrote: a job's description with `images={false}`, so its image is drawn as its
 * alt text and address and nothing is fetched, `linkSchemes={['https', 'mailto']}`, so the app's
 * route, the irc link and the javascript: link are drawn as their words, and `headingOffset={2}`, so
 * its `#` is an h3 under the section. Its key/value table, written with an empty header row, has no
 * header. The field's help under it is `inline`: one line, its link and code kept.
 */
export const Untrusted_: StoryObj = { name: 'Untrusted text', render: () => <Untrusted /> }

/**
 * Code and the app's own parts in one text: a jq fence, ANSI output, and a status and a run's
 * details set in where the text has `<!-- part:state -->` and `<!-- part:run -->`.
 */
export const Parts: StoryObj = { name: 'Embedded parts', render: () => <Runbook /> }

/**
 * `measure`: in a pane as wide as the canvas, paragraphs, lists, quotes and headings stop at the
 * reading measure (`--reading-measure`), while the table and the code block run the pane's width.
 */
export const Measure: StoryObj = { name: 'Reading measure', render: () => <Measured /> }

/**
 * Links between notes and tags: `[[Note]]`, `[[Note|words]]` and `[[Note#Heading]]` are links the
 * app follows, a link to a note that does not exist is drawn faint, and each `#tag` is a chip.
 */
export const Links: StoryObj = { name: 'Linked notes', render: () => <LinkedNote /> }

/**
 * Links the app follows in the page through `onLink`: each time in an episode's notes seeks, and a
 * link to a route of the app's own goes there, while a link to another site opens in a new tab.
 */
export const AppLinks: StoryObj = { name: 'App links', render: () => <ShowNotes /> }

/** A long page with its headings beside it; scrolling moves the mark to the heading in view. */
export const Contents_: StoryObj = { name: 'Table of contents', render: () => <Contents /> }

/** The same list for a form, each part with a mark for its state. */
export const Outline: StoryObj = { name: 'Form outline', parameters: { frame: 'padded' }, render: () => <FormOutline /> }
