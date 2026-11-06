import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, Play, ScrollText, Trash2 } from 'lucide-react'

import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from '../../components/ui/context-menu'

const meta: Meta = { title: 'Primitives/Menus/ContextMenu', parameters: { frame: 'padded' } }
export default meta

function StepMenu({ open }: { open?: boolean }) {
    return (
        <ContextMenu defaultOpen={open}>
            <ContextMenuTrigger className="flex h-40 max-w-md items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Right-click the step validate
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
                <ContextMenuItem variant="destructive">
                    <Trash2 />
                    Remove step
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

export const Trigger: StoryObj = { render: () => <StepMenu /> }
export const Opened: StoryObj = { render: () => <StepMenu open /> }
