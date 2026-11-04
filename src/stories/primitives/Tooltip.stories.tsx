import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pause, Play, RotateCcw } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Kbd } from '../../components/ui/kbd'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip'

const meta: Meta = { title: 'Primitives/Overlays/Tooltip' }
export default meta

function Closed() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Run" />}>
                        <Play />
                    </TooltipTrigger>
                    <TooltipContent>Run import-orders now</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
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
                <div className="flex flex-wrap gap-2">
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
                </div>
            </TooltipProvider>
        </div>
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const Opened: StoryObj = { render: () => <Open /> }
export const WithShortcut: StoryObj = { render: () => <Toolbar /> }
