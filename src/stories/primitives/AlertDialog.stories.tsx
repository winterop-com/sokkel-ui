import type { Meta, StoryObj } from '@storybook/react-vite'
import { Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@winterop-com/sokkel-ui/primitives/alert-dialog'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Row } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Overlays/AlertDialog', parameters: { frame: 'padded' } }
export default meta

function Closed() {
    return (
        <Row gap="md" align="stretch" wrap>
            <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" />}>Delete job</AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete import-orders?</AlertDialogTitle>
                    </AlertDialogHeader>
                </AlertDialogContent>
            </AlertDialog>
        </Row>
    )
}

function Default() {
    return (
        <AlertDialog defaultOpen>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel the running run?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Run 01a1a5c6 of import-orders has been running for 42.0s. Steps that finished keep their output.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep running</AlertDialogCancel>
                    <AlertDialogAction>Cancel run</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function Small() {
    return (
        <AlertDialog defaultOpen>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogMedia>
                        <TriangleAlert />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Disable the schedule?</AlertDialogTitle>
                    <AlertDialogDescription>nightly-export stops running on its schedule until it is enabled again.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep</AlertDialogCancel>
                    <AlertDialogAction>Disable</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function DeleteJob() {
    const [open, setOpen] = useState(true)
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger render={<Button variant="destructive" />}>Delete job</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-destructive/10 text-destructive">
                        <Trash2 />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Delete import-orders?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Its 128 runs stay in the history. Its schedule stops, and the bucket harbor-exports is kept.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => setOpen(false)}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const Opened: StoryObj = { render: () => <Default /> }
export const SmallWithMedia: StoryObj = { render: () => <Small /> }
export const Destructive: StoryObj = { render: () => <DeleteJob /> }
