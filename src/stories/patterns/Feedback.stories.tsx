import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Banner } from '../../components/Banner'
import { CheckList } from '../../components/CheckList'
import { ListSkeleton, Pending } from '../../components/Loading'
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
                    No answer from <span className="font-mono">https://dirigent.example.org</span>.
                </Banner>
            )}
            <Banner tone="warning">This instance is read-only while it is being upgraded to 0.37.0.</Banner>
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
            <Banner tone="good">All 18 pipelines ran in the last hour.</Banner>
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
                        { name: 'Storage', status: 'ok', detail: 's3://dirigent-artifacts, 2.1 GB used' },
                        { name: 'Packs', status: 'warn', detail: '3 installed' },
                        { name: 'dirigent-dhis2', status: 'ok', detail: '0.36.0', group: 'Packs' },
                        {
                            name: 'dirigent-fhir',
                            status: 'warn',
                            detail: '0.35.0',
                            hint: 'One version behind the server; run uv sync to update it.',
                            group: 'Packs',
                        },
                        { name: 'dirigent-contrib', status: 'ok', detail: '0.36.0', group: 'Packs' },
                        {
                            name: 'Scheduler',
                            status: 'fail',
                            detail: 'last tick 14 minutes ago',
                            hint: 'Restart the server to resume schedules.',
                        },
                    ]}
                />
            </Section>
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Feedback' }
export default meta

export const Banners_: StoryObj = { name: 'Banner', render: () => <Banners /> }
export const Skeletons: StoryObj = { name: 'Loading', render: () => <Loading /> }
export const Checks: StoryObj = { name: 'Check list', render: () => <Health /> }
