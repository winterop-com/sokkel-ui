import type { Meta, StoryObj } from '@storybook/react-vite'

import {
    Menubar,
    MenubarCheckboxItem,
    MenubarContent,
    MenubarGroup,
    MenubarItem,
    MenubarLabel,
    MenubarMenu,
    MenubarRadioGroup,
    MenubarRadioItem,
    MenubarSeparator,
    MenubarShortcut,
    MenubarTrigger,
} from '../../components/ui/menubar'

const meta: Meta = { title: 'Primitives/Menus/Menubar', parameters: { frame: 'padded' } }
export default meta

function EditorMenubar({ open }: { open?: 'job' | 'view' }) {
    return (
        <Menubar className="w-fit">
            <MenubarMenu defaultOpen={open === 'job'}>
                <MenubarTrigger>Job</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem>
                        Run now
                        <MenubarShortcut>R</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                        Validate
                        <MenubarShortcut>V</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem disabled>Publish</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem variant="destructive">Delete import-orders</MenubarItem>
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger>Steps</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem>rows.check</MenubarItem>
                    <MenubarItem>rows.map</MenubarItem>
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu defaultOpen={open === 'view'}>
                <MenubarTrigger>View</MenubarTrigger>
                <MenubarContent>
                    <MenubarCheckboxItem checked>Show the graph</MenubarCheckboxItem>
                    <MenubarCheckboxItem>Show step durations</MenubarCheckboxItem>
                    <MenubarSeparator />
                    <MenubarGroup>
                        <MenubarLabel>Density</MenubarLabel>
                        <MenubarRadioGroup value="regular">
                            <MenubarRadioItem value="regular">Regular</MenubarRadioItem>
                            <MenubarRadioItem value="compact">Compact</MenubarRadioItem>
                        </MenubarRadioGroup>
                    </MenubarGroup>
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    )
}

export const Closed: StoryObj = { render: () => <EditorMenubar /> }
export const JobOpen: StoryObj = { render: () => <EditorMenubar open="job" /> }
export const ViewOpen: StoryObj = { render: () => <EditorMenubar open="view" /> }
