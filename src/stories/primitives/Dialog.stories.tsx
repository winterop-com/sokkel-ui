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
import { Row, Stack } from '../../components/Layout'

const meta: Meta = { title: 'Primitives/Overlays/Dialog', parameters: { frame: 'padded' } }
export default meta

function Closed() {
    return (
        <Row gap="md" align="stretch" wrap>
            <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>Rename job</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename job</DialogTitle>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </Row>
    )
}

function Open() {
    return (
        <Dialog defaultOpen>
            <DialogTrigger render={<Button variant="outline" />}>Rename job</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename job</DialogTitle>
                    <DialogDescription>The name is a title only. The code import-orders stays as it is.</DialogDescription>
                </DialogHeader>
                <Stack gap="sm">
                    <Label htmlFor="job-name">Name</Label>
                    <Input id="job-name" defaultValue="Import orders" />
                </Stack>
                <DialogFooter showCloseButton>
                    <Button>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function WithoutCloseButton() {
    return (
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
    )
}

function RunJob() {
    const [open, setOpen] = useState(true)
    return (
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
                <Stack gap="sm">
                    <Label htmlFor="month">Month</Label>
                    <Input id="month" defaultValue="2026-10" />
                </Stack>
                <Stack gap="sm">
                    <Label htmlFor="file">File</Label>
                    <Input id="file" defaultValue="orders-2026-10.csv" />
                </Stack>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button onClick={() => setOpen(false)}>
                        <Play />
                        Start run
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const Opened: StoryObj = { render: () => <Open /> }
export const NoCloseButton: StoryObj = { render: () => <WithoutCloseButton /> }
export const RunNow: StoryObj = { render: () => <RunJob /> }
