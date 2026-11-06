import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, CalendarClock, Play, Server, Webhook, Workflow } from 'lucide-react'
import type { ComponentType } from 'react'
import { Stack } from '../../components/Layout'

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from '../../components/ui/navigation-menu'

const meta: Meta = { title: 'Primitives/Menus/NavigationMenu', parameters: { frame: 'padded' } }
export default meta

type Entry = { label: string; detail: string; icon: ComponentType<{ className?: string }> }

const BUILD: Entry[] = [
    { label: 'Jobs', detail: 'Steps that move data, 12 in this project.', icon: Workflow },
    { label: 'Services', detail: 'Servers a step reaches, like api.', icon: Server },
    { label: 'Webhooks', detail: 'URLs that start a job when called.', icon: Webhook },
]

const OPERATE: Entry[] = [
    { label: 'Runs', detail: 'Every run, its state and its duration.', icon: Play },
    { label: 'Schedules', detail: 'The times each job starts on its own.', icon: CalendarClock },
]

function Links({ entries }: { entries: Entry[] }) {
    return (
        <Stack as="ul" gap="2xs" className="w-72 sm:w-96">
            {entries.map(({ label, detail, icon: Icon }) => (
                <li key={label}>
                    <NavigationMenuLink href="#" className="items-start">
                        <Icon className="mt-0.5 text-muted-foreground" />
                        <Stack as="span" gap="3xs">
                            <span className="font-medium">{label}</span>
                            <span className="text-xs text-muted-foreground">{detail}</span>
                        </Stack>
                    </NavigationMenuLink>
                </li>
            ))}
        </Stack>
    )
}

function ProductNav({ open }: { open?: string }) {
    return (
        <NavigationMenu defaultValue={open ?? null}>
            <NavigationMenuList className="flex-wrap">
                <NavigationMenuItem value="build">
                    <NavigationMenuTrigger>Build</NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <Links entries={BUILD} />
                    </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem value="operate">
                    <NavigationMenuTrigger>Operate</NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <Links entries={OPERATE} />
                    </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                    <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>
                        <BookOpen />
                        Docs
                    </NavigationMenuLink>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    )
}

export const Closed: StoryObj = { render: () => <ProductNav /> }
export const BuildOpen: StoryObj = { render: () => <ProductNav open="build" /> }
export const OperateOpen: StoryObj = { render: () => <ProductNav open="operate" /> }
