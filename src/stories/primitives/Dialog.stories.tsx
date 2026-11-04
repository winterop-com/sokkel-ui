import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

const meta: Meta = { title: 'Primitives/Overlays/Dialog' }
export default meta

function Closed() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="flex flex-wrap gap-3">
                <Dialog>
                    <DialogTrigger render={<Button variant="outline" />}>Rename pipeline</DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rename pipeline</DialogTitle>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}

function Open() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Dialog defaultOpen>
                <DialogTrigger render={<Button variant="outline" />}>Rename pipeline</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename pipeline</DialogTitle>
                        <DialogDescription>The name is a title only. The code weather-gate stays as it is.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="pipeline-name">Name</Label>
                        <Input id="pipeline-name" defaultValue="Weather gate" />
                    </div>
                    <DialogFooter showCloseButton>
                        <Button>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function WithoutCloseButton() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Dialog defaultOpen>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Connection saved</DialogTitle>
                        <DialogDescription>dhis2-play is ready for blocks to use.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose render={<Button />}>Done</DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function RunPipeline() {
    const [open, setOpen] = useState(true)
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<Button />}>
                    <Play />
                    Run
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Run weather-gate</DialogTitle>
                        <DialogDescription>
                            The run starts now, outside its schedule. The last run succeeded at 2026-11-04 14:02 in 1.2s.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="period">Period</Label>
                        <Input id="period" defaultValue="2026-10" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="station">Station</Label>
                        <Input id="station" defaultValue="oslo-blindern" />
                    </div>
                    <DialogFooter>
                        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                        <Button onClick={() => setOpen(false)}>
                            <Play />
                            Start run
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const Opened: StoryObj = { render: () => <Open /> }
export const NoCloseButton: StoryObj = { render: () => <WithoutCloseButton /> }
export const RunNow: StoryObj = { render: () => <RunPipeline /> }
