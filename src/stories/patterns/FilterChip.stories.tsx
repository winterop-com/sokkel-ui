import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleDot, Workflow } from 'lucide-react'

import { FilterChip } from '../../components/FilterChip'
import { Row } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'
import { JOB_OPTIONS, PEOPLE_OPTIONS, PERIOD_OPTIONS, STATUS_OPTIONS } from '../fixtures/filters'

const meta: Meta = { title: 'Patterns/Filter chip', parameters: { frame: 'padded' } }
export default meta

/** Chips not yet set: each offers its facet with a chevron, and opens the facet's values. */
export const Unset: StoryObj = {
    render: () => (
        <Row gap="sm" wrap>
            <FilterChip facet="Status" options={STATUS_OPTIONS} />
            <FilterChip facet="Job" options={JOB_OPTIONS} multiple />
            <FilterChip facet="Started by" options={PEOPLE_OPTIONS} multiple />
            <FilterChip facet="Period" options={PERIOD_OPTIONS} />
        </Row>
    ),
}

/** Chips set to one value, to two, and to more than two, which says the first and how many more. */
export const Chosen: StoryObj = {
    name: 'Set',
    render: () => (
        <Row gap="xl" align="end" wrap>
            <Specimen label="one">
                <FilterChip facet="Status" options={STATUS_OPTIONS} defaultSelected={['failed']} />
            </Specimen>
            <Specimen label="two">
                <FilterChip facet="Job" options={JOB_OPTIONS} multiple defaultSelected={['nightly-export', 'send-digest']} />
            </Specimen>
            <Specimen label="more">
                <FilterChip facet="Started by" options={PEOPLE_OPTIONS} multiple defaultSelected={['ada', 'grace', 'linus']} />
            </Specimen>
            <Specimen label="icon">
                <FilterChip
                    facet="Job"
                    icon={<Workflow className="size-3.5 text-muted-foreground" aria-hidden />}
                    options={JOB_OPTIONS}
                    defaultSelected={['rebuild-index']}
                />
            </Specimen>
        </Row>
    ),
}

/** A single choice open: Any unsets the filter, and picking a state closes the menu. */
export const Open: StoryObj = {
    render: () => (
        <FilterChip
            facet="Status"
            icon={<CircleDot className="size-3.5 text-muted-foreground" aria-hidden />}
            options={STATUS_OPTIONS}
            defaultSelected={['failed']}
            defaultOpen
        />
    ),
}

/** Several choices open: each person is ticked or unticked, and the menu stays open. */
export const Several: StoryObj = {
    render: () => <FilterChip facet="Started by" options={PEOPLE_OPTIONS} multiple defaultSelected={['ada', 'grace']} defaultOpen />,
}
