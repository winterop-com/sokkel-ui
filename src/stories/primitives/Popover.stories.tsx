import type { Meta, StoryObj } from '@storybook/react-vite'
import { Filter, Info } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '../../components/ui/popover'

const meta: Meta = { title: 'Primitives/Overlays/Popover' }
export default meta

function Closed() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="flex flex-wrap gap-3">
                <Popover>
                    <PopoverTrigger render={<Button variant="outline" />}>
                        <Info />
                        About this schedule
                    </PopoverTrigger>
                    <PopoverContent>Runs every day at 02:00.</PopoverContent>
                </Popover>
            </div>
        </div>
    )
}

function Open() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Popover defaultOpen>
                <PopoverTrigger render={<Button variant="outline" />}>
                    <Info />
                    About this schedule
                </PopoverTrigger>
                <PopoverContent align="start">
                    <PopoverHeader>
                        <PopoverTitle>nightly-sync</PopoverTitle>
                        <PopoverDescription>Starts sync-inventory every day at 02:00. The next run is 2026-11-05 02:00.</PopoverDescription>
                    </PopoverHeader>
                </PopoverContent>
            </Popover>
        </div>
    )
}

function FilterRuns() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Popover defaultOpen>
                <PopoverTrigger render={<Button variant="outline" />}>
                    <Filter />
                    Filter runs
                </PopoverTrigger>
                <PopoverContent align="start">
                    <PopoverHeader>
                        <PopoverTitle>Filter runs</PopoverTitle>
                        <PopoverDescription>Show runs of import-orders that match.</PopoverDescription>
                    </PopoverHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="since">Since</Label>
                        <Input id="since" defaultValue="2026-11-01 00:00" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="state">State</Label>
                        <Input id="state" defaultValue="failed" aria-invalid />
                        <p className="text-xs text-destructive">Pick a state: succeeded, failed or running.</p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                            Clear
                        </Button>
                        <Button size="sm">Apply</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const Opened: StoryObj = { render: () => <Open /> }
export const RunFilter: StoryObj = { render: () => <FilterRuns /> }
