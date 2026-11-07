import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { ProseText } from '@winterop-com/sokkel-ui/ProseText'
import { Unfoldable } from '@winterop-com/sokkel-ui/Unfoldable'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

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
export const Unfold: StoryObj = { name: 'Unfoldable', render: () => <Unfolding /> }
export const Text: StoryObj = { name: 'Prose text', render: () => <Prose /> }
