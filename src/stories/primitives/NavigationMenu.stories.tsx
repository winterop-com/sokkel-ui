import type { Meta, StoryObj } from '@storybook/react-vite'
import { Blocks, Cable, FileJson, Play, Workflow, Zap } from 'lucide-react'
import type { ComponentType } from 'react'

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from '../../components/ui/navigation-menu'

const meta: Meta = { title: 'Primitives/Menus/NavigationMenu' }
export default meta

type Entry = { label: string; detail: string; icon: ComponentType<{ className?: string }> }

const BUILD: Entry[] = [
    { label: 'Pipelines', detail: 'Steps that move data, 12 in this project.', icon: Workflow },
    { label: 'Connections', detail: 'Servers a block reaches, like dhis2-play.', icon: Cable },
    { label: 'Schemas', detail: 'The shapes a value is checked against.', icon: FileJson },
]

const OPERATE: Entry[] = [
    { label: 'Runs', detail: 'Every run, its state and its duration.', icon: Play },
    { label: 'Triggers', detail: 'Schedules and webhooks that start runs.', icon: Zap },
]

function Links({ entries }: { entries: Entry[] }) {
    return (
        <ul className="grid w-72 gap-1 sm:w-96">
            {entries.map(({ label, detail, icon: Icon }) => (
                <li key={label}>
                    <NavigationMenuLink href="#" className="items-start">
                        <Icon className="mt-0.5 text-muted-foreground" />
                        <span className="flex flex-col gap-0.5">
                            <span className="font-medium">{label}</span>
                            <span className="text-xs text-muted-foreground">{detail}</span>
                        </span>
                    </NavigationMenuLink>
                </li>
            ))}
        </ul>
    )
}

function ProductNav({ open }: { open?: string }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
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
                            <Blocks />
                            Blocks
                        </NavigationMenuLink>
                    </NavigationMenuItem>
                </NavigationMenuList>
            </NavigationMenu>
        </div>
    )
}

export const Closed: StoryObj = { render: () => <ProductNav /> }
export const BuildOpen: StoryObj = { render: () => <ProductNav open="build" /> }
export const OperateOpen: StoryObj = { render: () => <ProductNav open="operate" /> }
