import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pause, Play, RotateCcw } from 'lucide-react'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Kbd } from '@winterop-com/sokkel-ui/primitives/kbd'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Row } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Overlays/Tooltip', parameters: { frame: 'padded' } }
export default meta

function Closed() {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Run" />}>
                    <Play />
                </TooltipTrigger>
                <TooltipContent>Run import-orders now</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

function Open() {
    return (
        <div className="min-h-svh bg-background p-6 pt-16 text-foreground">
            <TooltipProvider>
                <Tooltip defaultOpen>
                    <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Run" />}>
                        <Play />
                    </TooltipTrigger>
                    <TooltipContent>Run import-orders now</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}

function Toolbar() {
    return (
        <div className="min-h-svh bg-background p-6 pt-16 text-foreground">
            <TooltipProvider>
                <Row align="stretch" wrap>
                    <Tooltip>
                        <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Run" />}>
                            <Play />
                        </TooltipTrigger>
                        <TooltipContent>Run</TooltipContent>
                    </Tooltip>
                    <Tooltip defaultOpen>
                        <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Pause schedule" />}>
                            <Pause />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            Pause nightly-sync
                            <Kbd>P</Kbd>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Retry" disabled />}>
                            <RotateCcw />
                        </TooltipTrigger>
                        <TooltipContent>Retry the failed run</TooltipContent>
                    </Tooltip>
                </Row>
            </TooltipProvider>
        </div>
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const Opened: StoryObj = { parameters: { frame: 'none' }, render: () => <Open /> }
export const WithShortcut: StoryObj = { parameters: { frame: 'none' }, render: () => <Toolbar /> }
