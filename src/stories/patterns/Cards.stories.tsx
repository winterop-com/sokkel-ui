import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ItemCard } from '../../components/ItemCard'
import { StatusChip } from '../../components/StatusChip'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'

/**
 * The card for one thing, in its four uses: plain content, a card that leads somewhere, a set of
 * cards to choose one from, and cards with artwork on top.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))] gap-4">{children}</div>
        </div>
    )
}

const MENU = (
    <>
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuItem>Archive</DropdownMenuItem>
    </>
)

function Art({ from, to }: { from: string; to: string }) {
    return (
        <svg viewBox="0 0 160 90" preserveAspectRatio="none" aria-hidden>
            <defs>
                <linearGradient id={`g-${from}-${to}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={from} />
                    <stop offset="1" stopColor={to} />
                </linearGradient>
            </defs>
            <rect width="160" height="90" fill={`url(#g-${from}-${to})`} />
            <path d="M0 64 Q40 48 80 62 T160 58 V90 H0Z" fill="white" fillOpacity="0.18" />
        </svg>
    )
}

function Plain() {
    return (
        <Ground>
            <ItemCard
                title="Larkspur"
                code="larkspur"
                description="Exports, imports and the nightly digest for the finance team."
                status={<StatusChip status="failed" label="1 failing" />}
                facts={[
                    { label: 'Jobs', value: '7' },
                    { label: 'Runs today', value: '312' },
                    { label: 'Owner', value: 'ada' },
                ]}
                menu={MENU}
            />
            <ItemCard
                title="Harbor"
                code="harbor"
                description="Inventory sync with the three warehouses."
                status={<StatusChip status="succeeded" label="all passing" />}
                facts={[
                    { label: 'Jobs', value: '4' },
                    { label: 'Runs today', value: '96' },
                    { label: 'Owner', value: 'grace' },
                ]}
                menu={MENU}
            />
            <ItemCard
                code="juniper"
                description="A project with no name of its own shows its code as the title."
                facts={[{ label: 'Jobs', value: '0' }]}
            />
        </Ground>
    )
}

function Linked() {
    return (
        <Ground>
            {['nightly-export', 'import-orders', 'rebuild-index'].map((job, index) => (
                <ItemCard
                    key={job}
                    code={job}
                    href="#"
                    description={
                        [
                            'Writes yesterday’s orders to the export bucket.',
                            'Reads new orders from the api every 15 minutes.',
                            'Rebuilds the search index each night.',
                        ][index]
                    }
                    status={<StatusChip status={(['failed', 'running', 'succeeded'] as const)[index]} />}
                    facts={[
                        { label: 'Schedule', value: ['02:00 daily', 'every 15 min', '01:40 daily'][index] },
                        { label: 'Last run', value: ['4.2s', '1m 12s', '6m 03s'][index] },
                    ]}
                    menu={MENU}
                />
            ))}
        </Ground>
    )
}

function Choose() {
    const [plan, setPlan] = useState('team')
    const plans = [
        { id: 'solo', title: 'Solo', description: 'One person, five jobs, a week of history.', price: 'Free' },
        { id: 'team', title: 'Team', description: 'Up to 20 people, unlimited jobs, 90 days of history.', price: '$24 / month' },
        { id: 'org', title: 'Organization', description: 'Single sign-on, audit log, a year of history.', price: '$96 / month' },
    ]
    return (
        <Ground>
            {plans.map((entry) => (
                <ItemCard
                    key={entry.id}
                    title={entry.title}
                    description={entry.description}
                    facts={[{ label: 'Price', value: entry.price }]}
                    selected={plan === entry.id}
                    onSelect={() => setPlan(entry.id)}
                />
            ))}
        </Ground>
    )
}

function Media() {
    return (
        <Ground>
            <ItemCard
                title="Northern Coast"
                code="album-0412"
                href="#"
                media={<Art from="#2f74a8" to="#5fb3b3" />}
                facts={[
                    { label: 'Tracks', value: '11' },
                    { label: 'Length', value: '46 min' },
                ]}
            />
            <ItemCard
                title="Valley Road"
                code="album-0388"
                href="#"
                media={<Art from="#4f9d69" to="#c9b458" />}
                facts={[
                    { label: 'Tracks', value: '9' },
                    { label: 'Length', value: '38 min' },
                ]}
            />
            <ItemCard
                title="Desert Morning"
                code="album-0371"
                href="#"
                media={<Art from="#c0587e" to="#7c5cc4" />}
                facts={[
                    { label: 'Tracks', value: '12' },
                    { label: 'Length', value: '51 min' },
                ]}
            />
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Cards' }
export default meta

export const Plain_: StoryObj = { name: 'Plain', render: () => <Plain /> }
export const Linked_: StoryObj = { name: 'Interactive', render: () => <Linked /> }
export const Choose_: StoryObj = { name: 'Selectable', render: () => <Choose /> }
export const Media_: StoryObj = { name: 'With media', render: () => <Media /> }
