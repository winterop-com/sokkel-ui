import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'

import { PageState } from '../../components/PageState'
import { ProseText } from '../../components/ProseText'
import { Unfoldable } from '../../components/Unfoldable'
import { Button } from '../../components/ui/button'

/** The states a read lands in, and the small text pieces that carry a server's words. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="flex max-w-3xl flex-col gap-4">{children}</div>
        </div>
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
                    <div className="flex flex-col items-start gap-3 rounded-surface border border-dashed border-border-strong px-4 py-6">
                        <p className="text-sm">No services.</p>
                        <Button size="sm">
                            <Plus aria-hidden />
                            New service
                        </Button>
                    </div>
                }
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
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">source</dt>
                    <dd className="font-mono">orders-2026-10.csv</dd>
                    <dt className="text-muted-foreground">month</dt>
                    <dd className="font-mono">2026-10</dd>
                    <dt className="text-muted-foreground">project</dt>
                    <dd className="font-mono">atlas</dd>
                </dl>
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

const meta: Meta = { title: 'Patterns/States' }
export default meta

export const Read: StoryObj = { name: 'Page state', render: () => <ReadStates /> }
export const Unfold: StoryObj = { name: 'Unfoldable', render: () => <Unfolding /> }
export const Text: StoryObj = { name: 'Prose text', render: () => <Prose /> }
