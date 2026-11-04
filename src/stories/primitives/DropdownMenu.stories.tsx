import type { Meta, StoryObj } from '@storybook/react-vite'
import { Archive, Copy, Ellipsis, FolderInput, History, Pencil, Play, Share2, Tag, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'

const meta: Meta = { title: 'Primitives/Menus/DropdownMenu' }
export default meta

function Closed() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Job actions" />}>
                    <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Run</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

function Variants() {
    const [columns, setColumns] = useState({ duration: true, startedBy: false })
    const [sort, setSort] = useState('newest')
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger render={<Button variant="outline" />}>View</DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Columns</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                            checked={columns.duration}
                            onCheckedChange={(duration) => setColumns({ ...columns, duration })}
                        >
                            Duration
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={columns.startedBy}
                            onCheckedChange={(startedBy) => setColumns({ ...columns, startedBy })}
                        >
                            Started by
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Sort</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                            <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="slowest">Slowest first</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem inset>Inset item</DropdownMenuItem>
                    <DropdownMenuItem disabled>
                        Export as CSV
                        <DropdownMenuShortcut>E</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">
                        <Trash2 />
                        Clear history
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

function JobActions() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <div className="flex flex-col">
                    <span className="font-medium">Import orders</span>
                    <span className="font-mono text-xs text-muted-foreground">import-orders</span>
                </div>
                <DropdownMenu defaultOpen>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Job actions" />}>
                        <Ellipsis />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem>
                            <Play />
                            Run now
                            <DropdownMenuShortcut>R</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Pencil />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Copy />
                            Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <History />
                                Recent runs
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem>01a1a5c6, succeeded</DropdownMenuItem>
                                <DropdownMenuItem>01a1a5c2, failed</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                            <Trash2 />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}

/** Submenus open two levels deep, with checkbox and radio items inside them. */
function Submenus() {
    const [labels, setLabels] = useState<string[]>(['exports'])
    const [project, setProject] = useState('atlas')
    const toggle = (label: string) =>
        setLabels((current) => (current.includes(label) ? current.filter((each) => each !== label) : [...current, label]))
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>Actions</DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem>
                        <Pencil />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuSub defaultOpen>
                        <DropdownMenuSubTrigger>
                            <FolderInput />
                            Move to
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-48">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={project} onValueChange={setProject}>
                                    <DropdownMenuRadioItem value="atlas">atlas</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="harbor">harbor</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="juniper">juniper</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub defaultOpen>
                                <DropdownMenuSubTrigger>
                                    <Archive />
                                    Archived
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-44">
                                    <DropdownMenuItem>lighthouse</DropdownMenuItem>
                                    <DropdownMenuItem>old-reports</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Tag />
                            Labels
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-44">
                            {['exports', 'orders', 'nightly'].map((label) => (
                                <DropdownMenuCheckboxItem
                                    key={label}
                                    checked={labels.includes(label)}
                                    onCheckedChange={() => toggle(label)}
                                >
                                    {label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Share2 />
                            Share
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-44">
                            <DropdownMenuItem>Copy link</DropdownMenuItem>
                            <DropdownMenuItem>Email</DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">
                        <Trash2 />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const Nested: StoryObj = { name: 'Submenus', render: () => <Submenus /> }
export const Items: StoryObj = { render: () => <Variants /> }
export const RowActions: StoryObj = { render: () => <JobActions /> }
