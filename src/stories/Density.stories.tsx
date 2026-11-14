import type { Meta, StoryObj } from '@storybook/react-vite'
import { Download, Pin, RotateCw, Share2 } from 'lucide-react'
import { useState } from 'react'

import { DateField } from '@winterop-com/sokkel-ui/DateField'
import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { Toggle } from '@winterop-com/sokkel-ui/primitives/toggle'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

import { RunsPage } from './RunsPage'

/** The Runs page at each density, every distance on it a density token. */
const meta: Meta<typeof RunsPage> = {
    title: 'Foundations/Density',
    component: RunsPage,
}
export default meta

type Story = StoryObj<typeof RunsPage>

export const Regular: Story = { globals: { density: 'regular' } }
export const Compact: Story = { globals: { density: 'compact' } }

const PROJECTS = [
    { value: 'harbor', label: 'harbor' },
    { value: 'juniper', label: 'juniper' },
    { value: 'larkspur', label: 'larkspur' },
]

const STATES = [
    { value: 'any', label: 'Any state' },
    { value: 'failed', label: 'Failed' },
    { value: 'running', label: 'Running' },
    { value: 'succeeded', label: 'Succeeded' },
]

/** One density's controls, scoped to it with `data-density-scope`: a toolbar, a form row and a line of small controls. */
function Level({ level }: { level: 'regular' | 'compact' }) {
    const [query, setQuery] = useState('')
    const [view, setView] = useState<'list' | 'grid'>('list')
    const [range, setRange] = useState<'day' | 'week'>('day')
    return (
        <Stack gap="xl" data-density-scope={level}>
            <span className="text-sm font-medium">{level === 'regular' ? 'Regular' : 'Compact'}</span>
            <Toolbar
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                end={
                    <Segmented
                        label="View"
                        size="md"
                        value={view}
                        onValueChange={setView}
                        options={[
                            { value: 'list', label: 'List' },
                            { value: 'grid', label: 'Grid' },
                        ]}
                    />
                }
            >
                <FilterChip facet="Project" value="harbor" onClear={() => undefined} />
                <Select items={STATES} defaultValue="any">
                    <SelectTrigger aria-label="Run state">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                                {state.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline">
                    <Download aria-hidden />
                    Export
                </Button>
                <IconButton size="icon" variant="outline" label="Share">
                    <Share2 aria-hidden />
                </IconButton>
                <Button>Run now</Button>
            </Toolbar>
            <Row gap="md" align="end" wrap>
                <TextField id={`${level}-job`} label="Job" defaultValue="nightly-export" className="w-36" />
                <SelectField id={`${level}-project`} label="Project" options={PROJECTS} defaultValue="harbor" className="w-28" />
                <DateField id={`${level}-starts`} label="Starts" defaultValue="2026-11-13" today="2026-11-13" className="w-40" />
                <NumberField id={`${level}-retries`} label="Retries" defaultValue={3} className="w-20" />
                <Button>Save</Button>
            </Row>
            <Row gap="sm" align="center" wrap>
                <Button size="sm" variant="outline">
                    Today
                </Button>
                <Segmented
                    label="Range"
                    value={range}
                    onValueChange={setRange}
                    options={[
                        { value: 'day', label: 'Day' },
                        { value: 'week', label: 'Week' },
                    ]}
                />
                <Select items={PROJECTS} defaultValue="juniper">
                    <SelectTrigger size="sm" aria-label="Project">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PROJECTS.map((project) => (
                            <SelectItem key={project.value} value={project.value}>
                                {project.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Toggle size="sm" variant="outline" aria-label="Pin">
                    <Pin />
                </Toggle>
                <Button size="xs" variant="outline">
                    <RotateCw aria-hidden />
                    Retry
                </Button>
                <IconButton size="icon-xs" variant="outline" label="Share">
                    <Share2 aria-hidden />
                </IconButton>
            </Row>
        </Stack>
    )
}

/**
 * The controls side by side at both densities: a toolbar of a search, a filter, a select and
 * buttons, a form row of a text, a select, a date and a number field ending in a button, and a line
 * of small controls. Every control at a size takes that size's height from the density, so each
 * line stands level at either density and compact draws every control one step smaller.
 */
export const Controls: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => (
        <TooltipProvider>
            <Columns count={2} min="xl" gap="3xl" align="start">
                <Level level="regular" />
                <Level level="compact" />
            </Columns>
        </TooltipProvider>
    ),
}
