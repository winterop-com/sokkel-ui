import type { Meta, StoryObj } from '@storybook/react-vite'
import { Server } from 'lucide-react'

import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@winterop-com/sokkel-ui/primitives/hover-card'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Overlays/HoverCard', parameters: { frame: 'padded' } }
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
                    <Stack gap="sm">
                        <Row>
                            <Server className="size-4 text-muted-foreground" />
                            <span className="font-medium">Orders API</span>
                        </Row>
                        <span className="font-mono text-xs text-muted-foreground">api</span>
                        <p className="text-muted-foreground">A service used by 3 jobs.</p>
                        <Row justify="between" wrap className="text-xs text-muted-foreground">
                            <span>Checked 2026-11-04 14:02</span>
                            <StatusChip status="succeeded" />
                        </Row>
                    </Stack>
                </HoverCardContent>
            </HoverCard>{' '}
            once a night.
        </p>
    )
}

export const Trigger: StoryObj = {
    render: () => <ServiceLink />,
}

export const Opened: StoryObj = {
    render: () => <ServiceLink open />,
}
