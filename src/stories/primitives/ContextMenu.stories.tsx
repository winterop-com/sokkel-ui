import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, Play, ScrollText, Trash2 } from 'lucide-react'

import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/context-menu'
import { Center } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Menus/ContextMenu', parameters: { frame: 'padded' } }
export default meta

function StepMenu({ open }: { open?: boolean }) {
    return (
        <ContextMenu defaultOpen={open}>
            <ContextMenuTrigger className="max-w-md rounded-lg border border-dashed text-sm text-muted-foreground">
                <Center className="h-40">Right-click the step validate</Center>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52">
                <ContextMenuGroup>
                    <ContextMenuLabel>validate</ContextMenuLabel>
                    <ContextMenuItem>
                        <Play />
                        Run from here
                    </ContextMenuItem>
                    <ContextMenuItem>
                        <ScrollText />
                        Show output
                        <ContextMenuShortcut>O</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem disabled>
                        <Copy />
                        Copy config
                    </ContextMenuItem>
                </ContextMenuGroup>
                <ContextMenuSub>
                    <ContextMenuSubTrigger>Insert after</ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                        <ContextMenuItem>rows.map</ContextMenuItem>
                        <ContextMenuItem>bucket.put</ContextMenuItem>
                    </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuCheckboxItem checked>Stop the run on failure</ContextMenuCheckboxItem>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                    <ContextMenuLabel>Retries</ContextMenuLabel>
                    <ContextMenuRadioGroup defaultValue="once">
                        <ContextMenuRadioItem value="none">None</ContextMenuRadioItem>
                        <ContextMenuRadioItem value="once">Once</ContextMenuRadioItem>
                        <ContextMenuRadioItem value="three">Three times</ContextMenuRadioItem>
                    </ContextMenuRadioGroup>
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive">
                    <Trash2 />
                    Remove step
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

/** The area a right-click opens the menu over, closed. */
export const Trigger: StoryObj = { render: () => <StepMenu /> }
/** The menu open over a step: its actions, a disabled one, a submenu, a check and a radio group of retries. */
export const Opened: StoryObj = { render: () => <StepMenu open /> }
