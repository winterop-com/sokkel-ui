import type { Meta, StoryObj } from '@storybook/react-vite'
import { Archive, Bell, MoreHorizontal, PanelRight, Pencil, RotateCcw, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = {
    title: 'Primitives/Actions/Icon button',
    parameters: { frame: 'column' },
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}
export default meta

/** A row's quiet actions: each says what it does in its tooltip and to a screen reader. */
export const Actions: StoryObj = {
    render: () => (
        <Row gap="2xs">
            <IconButton label="Run again">
                <RotateCcw aria-hidden />
            </IconButton>
            <IconButton label="Edit">
                <Pencil aria-hidden />
            </IconButton>
            <IconButton label="Archive">
                <Archive aria-hidden />
            </IconButton>
            <IconButton label="More">
                <MoreHorizontal aria-hidden />
            </IconButton>
        </Row>
    ),
}

/** A button that toggles: filled while on. */
export const Pressed: StoryObj = {
    render: function Render() {
        const [starred, setStarred] = useState(true)
        const [panel, setPanel] = useState(false)
        const [muted, setMuted] = useState(false)
        return (
            <Row gap="2xs">
                <IconButton label="Star" pressed={starred} onClick={() => setStarred(!starred)}>
                    <Star aria-hidden />
                </IconButton>
                <IconButton label="Show the details" pressed={panel} onClick={() => setPanel(!panel)}>
                    <PanelRight aria-hidden />
                </IconButton>
                <IconButton label="Mute alerts" pressed={muted} onClick={() => setMuted(!muted)}>
                    <Bell aria-hidden />
                </IconButton>
            </Row>
        )
    },
}

/** A tooltip that says more than the name, with the key that does the same drawn beside it. */
export const Shortcut: StoryObj = {
    render: () => (
        <Row gap="2xs">
            <IconButton label="Run again" tooltip="Run nightly-export again with the same inputs" shortcut="R">
                <RotateCcw aria-hidden />
            </IconButton>
            <IconButton label="Edit" shortcut="E">
                <Pencil aria-hidden />
            </IconButton>
            <IconButton label="Archive" tooltip="Archive nightly-export, keeping its runs" shortcut="A">
                <Archive aria-hidden />
            </IconButton>
        </Row>
    ),
}

/** An action that destroys: quiet until the pointer is on it, then tinted in the critical tone. */
export const Destructive: StoryObj = {
    render: () => (
        <Row gap="2xs">
            <IconButton label="Edit">
                <Pencil aria-hidden />
            </IconButton>
            <IconButton label="Delete" tooltip="Delete sync-inventory and every run it has" destructive>
                <Trash2 aria-hidden />
            </IconButton>
        </Row>
    ),
}

/** Each variant and size; ghost is the default, for the quiet actions most rows carry. */
export const Variants: StoryObj = {
    render: () => (
        <Stack gap="lg">
            {(['ghost', 'outline', 'secondary', 'default', 'destructive'] as const).map((variant) => (
                <Specimen key={variant} label={variant}>
                    <Row gap="sm">
                        {(['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const).map((size) => (
                            <IconButton key={size} label={`Delete (${size})`} variant={variant} size={size}>
                                <Trash2 aria-hidden />
                            </IconButton>
                        ))}
                    </Row>
                </Specimen>
            ))}
        </Stack>
    ),
}

/** Actions that cannot be taken now: the tooltip names each and says why, on hover and on focus. */
export const Reason: StoryObj = {
    render: () => (
        <Row gap="2xs">
            <IconButton label="Run again" reason="The last run is still going.">
                <RotateCcw aria-hidden />
            </IconButton>
            <IconButton label="Edit">
                <Pencil aria-hidden />
            </IconButton>
            <IconButton label="Delete" reason="Only an owner can delete the job.">
                <Trash2 aria-hidden />
            </IconButton>
        </Row>
    ),
}
