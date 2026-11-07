import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useRef } from 'react'

import { Dot } from '../../components/Dot'
import { Markdown, markdownHeadings } from '../../components/Markdown'
import { TableOfContents, useActiveHeading } from '../../components/TableOfContents'
import { Row } from '../../components/Layout'

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
                    <Markdown content={PAGE} anchors />
                </article>
                <TableOfContents entries={headings} active={active} className="sticky top-6 hidden w-52 shrink-0 self-start md:flex" />
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

/** A long page with its headings beside it; scrolling moves the mark to the heading in view. */
export const Contents_: StoryObj = { name: 'Table of contents', render: () => <Contents /> }

/** The same list for a form, each part with a mark for its state. */
export const Outline: StoryObj = { name: 'Form outline', parameters: { frame: 'padded' }, render: () => <FormOutline /> }
