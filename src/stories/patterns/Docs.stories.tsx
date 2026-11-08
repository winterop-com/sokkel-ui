import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useRef } from 'react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Markdown, markdownHeadings } from '@winterop-com/sokkel-ui/Markdown'
import { TableOfContents, useActiveHeading } from '@winterop-com/sokkel-ui/TableOfContents'
import { Row } from '@winterop-com/sokkel-ui/Layout'
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
 * Code and the app's own parts in one text: a jq fence, ANSI output, and a status and a run's
 * details set in where the text has `<!-- part:state -->` and `<!-- part:run -->`.
 */
export const Parts: StoryObj = { name: 'Embedded parts', render: () => <Runbook /> }

/** A long page with its headings beside it; scrolling moves the mark to the heading in view. */
export const Contents_: StoryObj = { name: 'Table of contents', render: () => <Contents /> }

/** The same list for a form, each part with a mark for its state. */
export const Outline: StoryObj = { name: 'Form outline', parameters: { frame: 'padded' }, render: () => <FormOutline /> }
