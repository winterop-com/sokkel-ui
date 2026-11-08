import type { Meta, StoryObj } from '@storybook/react-vite'
import { Archive, ArrowUpDown, ChevronLeft, ChevronRight, Copy, Download, Pin, Play, Share2 } from 'lucide-react'
import { useState } from 'react'

import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar, ToolbarTitle, type ToolbarItem } from '@winterop-com/sokkel-ui/Toolbar'
import { Tree } from '@winterop-com/sokkel-ui/Tree'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

const meta: Meta = { title: 'Patterns/Toolbar', parameters: { frame: 'column' } }
export default meta

/** A page's tools over its list: the search, two filters, and the view and a count at the end. On a phone the search takes its own line. */
export const Page: StoryObj = {
    render: function Render() {
        const [query, setQuery] = useState('')
        const [view, setView] = useState<'list' | 'grid'>('list')
        return (
            <Toolbar
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                end={
                    <>
                        <span className="text-xs text-muted-foreground tabular-nums">48 jobs</span>
                        <Segmented
                            label="View"
                            value={view}
                            onValueChange={setView}
                            options={[
                                { value: 'list', label: 'List' },
                                { value: 'grid', label: 'Grid' },
                            ]}
                        />
                    </>
                }
            >
                <FilterChip facet="State" value="failed" onClear={() => undefined} />
                <FilterChip facet="Project" />
                <Button variant="ghost" size="sm">
                    <ArrowUpDown aria-hidden />
                    Sort
                </Button>
            </Toolbar>
        )
    },
}

/** A title the tools name the content by, as a calendar names its month: it takes the room left and truncates. */
export const Titled: StoryObj = {
    render: function Render() {
        const [view, setView] = useState<'week' | 'month'>('month')
        return (
            <TooltipProvider>
                <Toolbar
                    end={
                        <Segmented
                            label="View"
                            value={view}
                            onValueChange={setView}
                            options={[
                                { value: 'week', label: 'Week' },
                                { value: 'month', label: 'Month' },
                            ]}
                        />
                    }
                >
                    <Button size="sm" variant="outline">
                        Today
                    </Button>
                    <Row gap="none">
                        <IconButton label="Previous month">
                            <ChevronLeft aria-hidden />
                        </IconButton>
                        <IconButton label="Next month">
                            <ChevronRight aria-hidden />
                        </IconButton>
                    </Row>
                    <ToolbarTitle>November 2026</ToolbarTitle>
                </Toolbar>
            </TooltipProvider>
        )
    },
}

/** The strip across the top of a pane, with a rule under it and the pane's content below. */
export const Pane: StoryObj = {
    render: function Render() {
        const [query, setQuery] = useState('')
        return (
            <Surface className="max-w-sm">
                <Toolbar
                    variant="pane"
                    search={<SearchField value={query} onChange={setQuery} placeholder="Find" />}
                    end={<span className="text-xs text-muted-foreground tabular-nums">3 projects</span>}
                />
                <Tree
                    label="Projects"
                    query={query}
                    defaultExpanded={['harbor']}
                    nodes={[
                        {
                            id: 'harbor',
                            label: 'harbor',
                            children: [
                                { id: 'harbor/nightly-export', label: 'nightly-export' },
                                { id: 'harbor/sync-inventory', label: 'sync-inventory' },
                            ],
                        },
                        { id: 'juniper', label: 'juniper', children: [{ id: 'juniper/rebuild-index', label: 'rebuild-index' }] },
                        { id: 'larkspur', label: 'larkspur', children: [{ id: 'larkspur/send-digest', label: 'send-digest' }] },
                    ]}
                    className="p-2"
                />
            </Surface>
        )
    },
}

/** A job's tools as items that give way: Run now, Export, Duplicate, Share, Pin as a toggle and Archive, moved in order into More when the row has no room for them. */
function JobTools({ narrow = false }: { narrow?: boolean }) {
    const [pinned, setPinned] = useState(true)
    const [query, setQuery] = useState('')
    const items: ToolbarItem[] = [
        { id: 'run', label: 'Run now', icon: <Play aria-hidden />, onSelect: () => undefined },
        { id: 'export', label: 'Export', icon: <Download aria-hidden />, onSelect: () => undefined },
        { id: 'duplicate', label: 'Duplicate', icon: <Copy aria-hidden />, onSelect: () => undefined },
        { id: 'share', label: 'Share', icon: <Share2 aria-hidden />, onSelect: () => undefined },
        { id: 'pin', label: 'Pinned', icon: <Pin aria-hidden />, pressed: pinned, onSelect: () => setPinned(!pinned) },
        { id: 'archive', label: 'Archive', icon: <Archive aria-hidden />, disabled: true, onSelect: () => undefined },
    ]
    const toolbar = (
        <Toolbar
            variant={narrow ? 'pane' : 'page'}
            search={narrow ? undefined : <SearchField value={query} onChange={setQuery} placeholder="Search" />}
            items={items}
            defaultMoreOpen={narrow}
            end={<span className="text-xs text-muted-foreground tabular-nums">12 runs</span>}
        >
            <FilterChip facet="State" value="failed" onClear={() => undefined} />
        </Toolbar>
    )
    return narrow ? <Surface className="max-w-sm">{toolbar}</Surface> : toolbar
}

/** Tools that move into a More menu at their end, in order, as the toolbar narrows; measured on the toolbar, so they come back as it widens. */
export const Overflow: StoryObj = { render: () => <JobTools /> }

/** The same tools in a narrow pane with More open: plain entries, Pinned checked, and Archive shut. */
export const OverflowOpen: StoryObj = { name: 'Overflow open', render: () => <JobTools narrow /> }
