import type { Meta, StoryObj } from '@storybook/react-vite'
import { Filter, Info } from 'lucide-react'

import { Field } from '../../components/Field'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '../../components/ui/popover'
import { Row } from '../../components/Layout'

const meta: Meta = { title: 'Primitives/Overlays/Popover', parameters: { frame: 'padded' } }
export default meta

function Closed() {
    return (
        <Row gap="md" align="stretch" wrap>
            <Popover>
                <PopoverTrigger render={<Button variant="outline" />}>
                    <Info />
                    About this schedule
                </PopoverTrigger>
                <PopoverContent>Runs every day at 02:00.</PopoverContent>
            </Popover>
        </Row>
    )
}

function Open() {
    return (
        <Popover defaultOpen>
            <PopoverTrigger render={<Button variant="outline" />}>
                <Info />
                About this schedule
            </PopoverTrigger>
            <PopoverContent align="start">
                <PopoverHeader>
                    <PopoverTitle>nightly-sync</PopoverTitle>
                    <PopoverDescription>Starts sync-inventory every day at 02:00. The next run is 2026-11-05 02:00.</PopoverDescription>
                </PopoverHeader>
            </PopoverContent>
        </Popover>
    )
}

function FilterRuns() {
    return (
        <Popover defaultOpen>
            <PopoverTrigger render={<Button variant="outline" />}>
                <Filter />
                Filter runs
            </PopoverTrigger>
            <PopoverContent align="start">
                <PopoverHeader>
                    <PopoverTitle>Filter runs</PopoverTitle>
                    <PopoverDescription>Show runs of import-orders that match.</PopoverDescription>
                </PopoverHeader>
                <Field id="since" label="Since">
                    <Input id="since" defaultValue="2026-11-01 00:00" />
                </Field>
                <Field id="state" label="State" error="Pick a state: succeeded, failed or running.">
                    <Input id="state" defaultValue="done" aria-invalid />
                </Field>
                <Row align="stretch" justify="end">
                    <Button variant="ghost" size="sm">
                        Clear
                    </Button>
                    <Button size="sm">Apply</Button>
                </Row>
            </PopoverContent>
        </Popover>
    )
}

export const Trigger: StoryObj = { render: () => <Closed /> }
export const Opened: StoryObj = { render: () => <Open /> }
export const RunFilter: StoryObj = { render: () => <FilterRuns /> }
