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
                    <DialogTrigger render={<Button variant="outline" />}>Rename job</DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rename job</DialogTitle>
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
                <DialogTrigger render={<Button variant="outline" />}>Rename job</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename job</DialogTitle>
                        <DialogDescription>The name is a title only. The code import-orders stays as it is.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="job-name">Name</Label>
                        <Input id="job-name" defaultValue="Import orders" />
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
                        <DialogTitle>Service saved</DialogTitle>
                        <DialogDescription>api is ready for jobs to use.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose render={<Button />}>Done</DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function RunJob() {
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
                        <DialogTitle>Run import-orders</DialogTitle>
                        <DialogDescription>
                            The run starts now, outside its schedule. The last run succeeded at 2026-11-04 14:02 in 1.2s.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="month">Month</Label>
                        <Input id="month" defaultValue="2026-10" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="file">File</Label>
                        <Input id="file" defaultValue="orders-2026-10.csv" />
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
export const RunNow: StoryObj = { render: () => <RunJob /> }
