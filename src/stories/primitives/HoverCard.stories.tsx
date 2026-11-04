import type { Meta, StoryObj } from '@storybook/react-vite'
import { Cable } from 'lucide-react'

import { StatusChip } from '../../components/StatusChip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../components/ui/hover-card'

const meta: Meta = { title: 'Primitives/Overlays/HoverCard' }
export default meta

function ConnectionLink({ open }: { open?: boolean }) {
    return (
        <p className="text-sm">
            weather-gate writes to{' '}
            <HoverCard defaultOpen={open}>
                <HoverCardTrigger href="#" className="font-mono text-xs underline underline-offset-3">
                    dhis2-play
                </HoverCardTrigger>
                <HoverCardContent align="start">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Cable className="size-4 text-muted-foreground" />
                            <span className="font-medium">DHIS2 play server</span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">dhis2-play</span>
                        <p className="text-muted-foreground">A DHIS2 connection used by 3 pipelines.</p>
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
            <ConnectionLink />
        </div>
    ),
}

export const Opened: StoryObj = {
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <ConnectionLink open />
        </div>
    ),
}
