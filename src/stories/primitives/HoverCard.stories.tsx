import type { Meta, StoryObj } from '@storybook/react-vite'
import { Server } from 'lucide-react'

import { StatusChip } from '../../components/StatusChip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../components/ui/hover-card'

const meta: Meta = { title: 'Primitives/Overlays/HoverCard' }
export default meta

function ServiceLink({ open }: { open?: boolean }) {
    return (
        <p className="text-sm">
            nightly-export writes to{' '}
            <HoverCard defaultOpen={open}>
                <HoverCardTrigger href="#" className="font-mono text-xs underline underline-offset-3">
                    api
                </HoverCardTrigger>
                <HoverCardContent align="start">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Server className="size-4 text-muted-foreground" />
                            <span className="font-medium">Orders API</span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">api</span>
                        <p className="text-muted-foreground">A service used by 3 jobs.</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>Checked 2026-11-04 14:02</span>
                            <StatusChip status="succeeded" />
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>{' '}
            once a night.
        </p>
    )
}

export const Trigger: StoryObj = {
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <ServiceLink />
        </div>
    ),
}

export const Opened: StoryObj = {
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <ServiceLink open />
        </div>
    ),
}
