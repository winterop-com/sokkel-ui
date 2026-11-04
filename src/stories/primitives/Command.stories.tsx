import type { Meta, StoryObj } from '@storybook/react-vite'
import { Blocks, Cable, FileJson, Play, Workflow, Zap } from 'lucide-react'
import { useState } from 'react'

import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '../../components/ui/command'

const meta: Meta = { title: 'Primitives/Menus/Command' }
export default meta

function Palette({ search = '' }: { search?: string }) {
    const [value, setValue] = useState(search)
    return (
        <>
            <CommandInput placeholder="Search pipelines, connections, schemas" value={value} onValueChange={setValue} />
            <CommandList>
                <CommandEmpty>Nothing matches.</CommandEmpty>
                <CommandGroup heading="Pipelines">
                    <CommandItem value="weather-gate">
                        <Workflow />
                        <span className="font-mono text-xs">weather-gate</span>
                    </CommandItem>
                    <CommandItem value="dhis2-sync">
                        <Workflow />
                        <span className="font-mono text-xs">dhis2-sync</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Go to">
                    <CommandItem value="connections">
                        <Cable />
                        Connections
                        <CommandShortcut>G C</CommandShortcut>
                    </CommandItem>
                    <CommandItem value="schemas">
                        <FileJson />
                        Schemas
                        <CommandShortcut>G S</CommandShortcut>
                    </CommandItem>
                    <CommandItem value="triggers">
                        <Zap />
                        Triggers
                    </CommandItem>
                    <CommandItem value="blocks" disabled>
                        <Blocks />
                        Blocks
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Actions">
                    <CommandItem value="run weather-gate">
                        <Play />
                        Run weather-gate
                        <CommandShortcut>R</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </>
    )
}

export const Inline: StoryObj = {
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Command className="max-w-md rounded-xl border">
                <Palette />
            </Command>
        </div>
    ),
}

export const Empty: StoryObj = {
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Command className="max-w-md rounded-xl border">
                <Palette search="humidity" />
            </Command>
        </div>
    ),
}

export const InDialog: StoryObj = {
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <CommandDialog defaultOpen title="Go to" description="Search pipelines, connections and schemas.">
                <Command>
                    <Palette />
                </Command>
            </CommandDialog>
        </div>
    ),
}
