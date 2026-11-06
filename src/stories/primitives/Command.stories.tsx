import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, CalendarClock, Play, Server, Webhook, Workflow } from 'lucide-react'
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

const meta: Meta = { title: 'Primitives/Menus/Command', parameters: { frame: 'padded' } }
export default meta

function Palette({ search = '' }: { search?: string }) {
    const [value, setValue] = useState(search)
    return (
        <>
            <CommandInput placeholder="Search jobs, services, webhooks" value={value} onValueChange={setValue} />
            <CommandList>
                <CommandEmpty>Nothing matches.</CommandEmpty>
                <CommandGroup heading="Jobs">
                    <CommandItem value="import-orders">
                        <Workflow />
                        <span className="font-mono text-xs">import-orders</span>
                    </CommandItem>
                    <CommandItem value="sync-inventory">
                        <Workflow />
                        <span className="font-mono text-xs">sync-inventory</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Go to">
                    <CommandItem value="services">
                        <Server />
                        Services
                        <CommandShortcut>G S</CommandShortcut>
                    </CommandItem>
                    <CommandItem value="webhooks">
                        <Webhook />
                        Webhooks
                        <CommandShortcut>G W</CommandShortcut>
                    </CommandItem>
                    <CommandItem value="schedules">
                        <CalendarClock />
                        Schedules
                    </CommandItem>
                    <CommandItem value="docs" disabled>
                        <BookOpen />
                        Docs
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Actions">
                    <CommandItem value="run import-orders">
                        <Play />
                        Run import-orders
                        <CommandShortcut>R</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </>
    )
}

export const Inline: StoryObj = {
    render: () => (
        <Command className="max-w-md rounded-xl border">
            <Palette />
        </Command>
    ),
}

export const Empty: StoryObj = {
    render: () => (
        <Command className="max-w-md rounded-xl border">
            <Palette search="payroll" />
        </Command>
    ),
}

export const InDialog: StoryObj = {
    render: () => (
        <CommandDialog defaultOpen title="Go to" description="Search jobs, services and webhooks.">
            <Command>
                <Palette />
            </Command>
        </CommandDialog>
    ),
}
