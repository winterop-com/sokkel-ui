import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Banner } from '../../components/Banner'
import { CheckList } from '../../components/CheckList'
import { ListSkeleton, Pending } from '../../components/Loading'
import { Problem } from '../../components/Problem'
import { Section } from '../../components/Section'
import { Button } from '../../components/ui/button'

/** States the app tells a person about: banners for what holds, skeletons for what is coming, health checks. */
function Ground({ children, pad = true }: { children: React.ReactNode; pad?: boolean }) {
    return (
        <div className={pad ? 'min-h-svh bg-background p-6 text-foreground' : 'min-h-svh bg-background text-foreground'}>
            <div className={pad ? 'mx-auto flex max-w-4xl flex-col gap-6' : 'flex flex-col'}>{children}</div>
        </div>
    )
}

function Banners() {
    const [shown, setShown] = useState(true)
    return (
        <Ground pad={false}>
            {shown && (
                <Banner
                    tone="critical"
                    onDismiss={() => setShown(false)}
                    actions={
                        <Button size="sm" variant="outline">
                            Retry
                        </Button>
                    }
                >
                    No answer from <span className="font-mono">https://api.example.org</span>.
                </Banner>
            )}
            <Banner tone="warning">This instance is read-only while it is being upgraded to 1.5.0.</Banner>
            <Banner
                tone="info"
                actions={
                    <Button size="sm" variant="outline">
                        Reload
                    </Button>
                }
            >
                A newer version of the app is ready.
            </Banner>
            <Banner tone="good">All 18 jobs ran in the last hour.</Banner>
        </Ground>
    )
}

function Loading() {
    return (
        <Ground>
            <Section title="Runs" flush>
                <ListSkeleton rows={6} />
            </Section>
            <ListSkeleton rows={4} kind="card" />
            <Section title="Graph">
                <Pending label="Loading the graph" />
            </Section>
        </Ground>
    )
}

function Health() {
    return (
        <Ground>
            <Section title="Health" flush>
                <CheckList
                    checks={[
                        { name: 'Database', status: 'ok', detail: 'sqlite, 48 MB, schema current' },
                        { name: 'Storage', status: 'ok', detail: 'bucket harbor-exports, 2.1 GB used' },
                        { name: 'Workers', status: 'warn', detail: '3 running' },
                        { name: 'worker-1', status: 'ok', detail: '1.4.0', group: 'Workers' },
                        {
                            name: 'worker-2',
                            status: 'warn',
                            detail: '1.3.0',
                            hint: 'One version behind the api; redeploy it to update it.',
                            group: 'Workers',
                        },
                        { name: 'worker-3', status: 'ok', detail: '1.4.0', group: 'Workers' },
                        {
                            name: 'Scheduler',
                            status: 'fail',
                            detail: 'last tick 14 minutes ago',
                            hint: 'Restart the scheduler to resume schedules.',
                        },
                    ]}
                />
            </Section>
        </Ground>
    )
}

/** A failure said for a person, with the raw message folded away, and a warning with a way forward. */
function Problems() {
    return (
        <Ground>
            <Problem
                title="37 rows have an amount that is not a number"
                detail="The first is row 112, where `amount` is `n/a`. Amounts are written like `12.50`."
                technical="at $.amount: 'n/a' does not match '^[0-9]+[.][0-9]{2}$'"
            />
            <Problem
                title="The api did not answer"
                detail="No answer from `https://api.example.org` within 30 seconds. The job tries again in 5 minutes."
                technical={'ConnectTimeout: timed out after 30000 ms\n  at fetch (worker/http.ts:88)'}
                actions={
                    <Button size="sm" variant="outline">
                        Try now
                    </Button>
                }
            />
            <Problem
                tone="warning"
                title="12 rows had no currency"
                detail="They were read as `EUR`. Set `currency` on the source to stop guessing."
            />
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Feedback' }
export default meta

export const Banners_: StoryObj = { name: 'Banner', render: () => <Banners /> }
export const Skeletons: StoryObj = { name: 'Loading', render: () => <Loading /> }
export const Checks: StoryObj = { name: 'Check list', render: () => <Health /> }
export const Problems_: StoryObj = { name: 'Problem', render: () => <Problems /> }
