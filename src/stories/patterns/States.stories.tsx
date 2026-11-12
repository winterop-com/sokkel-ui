import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { ProseText } from '@winterop-com/sokkel-ui/ProseText'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Unfoldable } from '@winterop-com/sokkel-ui/Unfoldable'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** The states a read lands in, and the small text pieces that carry a server's words. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <Stack gap="lg" className="max-w-3xl">
            {children}
        </Stack>
    )
}

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function ReadStates() {
    return (
        <Ground>
            <Caption>loading</Caption>
            <PageState loading>{null}</PageState>
            <Caption>refused, with the server's diagnostic</Caption>
            <PageState loading={false} status={403} error="The token for `api` may read `orders` but not `invoices`.">
                {null}
            </PageState>
            <Caption>refused, with a way to read again</Caption>
            <PageState loading={false} status={503} error="The scheduler for `harbor` is restarting." onRetry={() => undefined}>
                {null}
            </PageState>
            <Caption>missing (404)</Caption>
            <PageState loading={false} status={404} error="No job has the code `import-ordres`.">
                {null}
            </PageState>
            <Caption>unreachable</Caption>
            <PageState loading={false} status="unreachable" error="No answer from `https://api.example.org` after 10s.">
                {null}
            </PageState>
            <Caption>empty, one line</Caption>
            <PageState loading={false} empty emptyMessage="No runs in the last 24 hours.">
                {null}
            </PageState>
            <Caption>empty, with the way in</Caption>
            <PageState
                loading={false}
                empty
                emptyRender={
                    <Empty className="border border-dashed border-border-strong">
                        <EmptyHeader>
                            <EmptyTitle>No services</EmptyTitle>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button size="sm">
                                <Plus aria-hidden />
                                New
                            </Button>
                        </EmptyContent>
                    </Empty>
                }
            >
                {null}
            </PageState>
        </Ground>
    )
}

/** A run's page whose record failed to load: the failure stands for the page, headed as its h1. */
function FailedPage() {
    return (
        <Ground>
            <PageState
                loading={false}
                status={404}
                headingLevel="h1"
                error="No run of `nightly-export` has the number `4182`."
                onRetry={() => undefined}
            >
                {null}
            </PageState>
        </Ground>
    )
}

/** A run's page whose own read came back, beside a side list whose read failed. */
function SecondaryRead() {
    return (
        <Ground>
            <DescriptionList
                items={[
                    { term: 'job', value: 'nightly-export', code: true },
                    { term: 'state', value: 'succeeded' },
                    { term: 'took', value: '4m 12s' },
                ]}
            />
            <Caption>the run's artifacts, read apart from the run</Caption>
            <PageState
                loading={false}
                status={503}
                tone="warning"
                error="The artifact store for `harbor` is restarting."
                onRetry={() => undefined}
            >
                {null}
            </PageState>
        </Ground>
    )
}

function Unfolding() {
    return (
        <Ground>
            <Unfoldable heading="Inputs" aside="3 bindings" defaultOpen>
                <DescriptionList
                    items={[
                        { term: 'source', value: 'orders-2026-10.csv', code: true },
                        { term: 'month', value: '2026-10', code: true },
                        { term: 'project', value: 'larkspur', code: true },
                    ]}
                />
            </Unfoldable>
            <Unfoldable heading="Outputs" aside="1 table">
                <p className="text-sm">orders.parquet</p>
            </Unfoldable>
            <Unfoldable heading="Retry policy">
                <p className="text-sm">Three tries, 30s apart.</p>
            </Unfoldable>
            <Unfoldable heading="Held open while a filter is typed" forced>
                <p className="text-sm text-muted-foreground">This one ignores the reader's clicks until the filter clears.</p>
            </Unfoldable>
        </Ground>
    )
}

/** A run's steps, each with the lines it wrote; a step that wrote none has nothing to unfold. */
const STEP_ROWS: { step: string; state: 'succeeded' | 'failed' | 'skipped'; took: string; lines: LogLine[] }[] = [
    {
        step: 'fetch',
        state: 'succeeded',
        took: '0.7s',
        lines: [
            { at: '14:02:11.204', level: 'info', text: 'GET /v1/exports/orders-2026-10.csv?project=larkspur' },
            { at: '14:02:11.902', level: 'info', text: 'read 2,184 rows in 0.7s' },
        ],
    },
    {
        step: 'transform',
        state: 'succeeded',
        took: '0.1s',
        lines: [
            { at: '14:02:12.010', level: 'debug', text: 'map: amount = try_cast(amount as double)' },
            { at: '14:02:12.115', level: 'warning', text: '37 rows carry an amount that does not parse' },
        ],
    },
    {
        step: 'validate',
        state: 'failed',
        took: '1.3s',
        lines: [{ at: '14:02:13.420', level: 'error', text: 'rules orders: field amount must be a number (37 rows)' }],
    },
    { step: 'upload', state: 'skipped', took: '', lines: [] },
    { step: 'notify', state: 'skipped', took: '', lines: [] },
]

function StepList() {
    const [open, setOpen] = useState<readonly string[]>(['validate'])
    const unfolding = STEP_ROWS.filter((row) => row.lines.length > 0).map((row) => row.step)
    const all = open.length === unfolding.length
    return (
        <Ground>
            <Row>
                <Button size="sm" variant="outline" onClick={() => setOpen(all ? [] : unfolding)}>
                    {all ? 'Close all' : 'Open all'}
                </Button>
            </Row>
            <Stack gap="xs">
                {STEP_ROWS.map((row) => (
                    <Unfoldable
                        key={row.step}
                        heading={<span className="font-mono">{row.step}</span>}
                        aside={
                            <>
                                {row.took}
                                <StatusChip status={row.state} />
                            </>
                        }
                        summary={row.lines.at(-1)?.text}
                        open={open.includes(row.step)}
                        onOpenChange={(next) => setOpen(next ? [...open, row.step] : open.filter((step) => step !== row.step))}
                    >
                        {row.lines.length > 0 && <LogView lines={row.lines} numbered={false} />}
                    </Unfoldable>
                ))}
            </Stack>
        </Ground>
    )
}

function Prose() {
    return (
        <Ground>
            <p className="text-sm">
                <ProseText text="Set `base_url` on the service, then run `jobs check` again." />
            </p>
            <p className="text-sm text-muted-foreground">
                <ProseText text="The step `fetch` wrote 0 rows, so `validate` was skipped." />
            </p>
            <p className="text-sm">
                <ProseText text="An unmatched backtick is drawn as written: `oops" />
            </p>
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/States', parameters: { frame: 'padded' } }
export default meta

export const Read: StoryObj = { name: 'Page state', render: () => <ReadStates /> }

/**
 * A detail page whose record failed to load, drawn with `headingLevel="h1"`: the failure's heading
 * is the page's own, so `Shell`'s `routeKey` has a heading to move the focus to.
 */
export const Failed: StoryObj = { name: 'Failed page', render: () => <FailedPage /> }

/**
 * A failed read of secondary data, drawn with `tone="warning"`: the page's own content stands, and
 * the side read that failed says so in the warning tone rather than as the page's failure, headed as
 * a part of the page that could not be read (`partRefused`) rather than as the server refusing the page.
 */
export const Secondary: StoryObj = { name: 'Secondary read', render: () => <SecondaryRead /> }
export const Unfold: StoryObj = { name: 'Unfoldable', render: () => <Unfolding /> }
/**
 * A run's steps as a list of mixed rows, held from outside (`open`, `onOpenChange`) so Open all
 * opens every one. A shut step says its last line (`summary`); a skipped step wrote nothing, so its
 * row is static, with no chevron and no button, its name lined up with the rest.
 */
export const Steps: StoryObj = { name: 'Unfoldable steps', render: () => <StepList /> }
export const Text: StoryObj = { name: 'Prose text', render: () => <Prose /> }
