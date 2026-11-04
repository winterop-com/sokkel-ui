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

const meta: Meta = { title: 'Primitives/Menus/Menubar' }
export default meta

function EditorMenubar({ open }: { open?: 'pipeline' | 'view' }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Menubar className="w-fit">
                <MenubarMenu defaultOpen={open === 'pipeline'}>
                    <MenubarTrigger>Pipeline</MenubarTrigger>
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
                        <MenubarItem variant="destructive">Delete weather-gate</MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Blocks</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem>dhis2.import</MenubarItem>
                        <MenubarItem>jq.transform</MenubarItem>
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
        </div>
    )
}

export const Closed: StoryObj = { render: () => <EditorMenubar /> }
export const PipelineOpen: StoryObj = { render: () => <EditorMenubar open="pipeline" /> }
export const ViewOpen: StoryObj = { render: () => <EditorMenubar open="view" /> }
