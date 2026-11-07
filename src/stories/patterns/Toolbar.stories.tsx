import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { FilterChip } from '../../components/FilterChip'
import { IconButton } from '../../components/IconButton'
import { Row } from '../../components/Layout'
import { SearchField } from '../../components/SearchField'
import { Surface } from '../../components/Section'
import { Segmented } from '../../components/Segmented'
import { Toolbar, ToolbarTitle } from '../../components/Toolbar'
import { Tree } from '../../components/Tree'
import { Button } from '../../components/ui/button'
import { TooltipProvider } from '../../components/ui/tooltip'

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
                            onChoose={setView}
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
                            onChoose={setView}
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
                    defaultOpen={['harbor']}
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
