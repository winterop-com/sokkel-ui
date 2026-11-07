import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Pause, Play, Square } from 'lucide-react'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@winterop-com/sokkel-ui/primitives/button-group'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Actions/ButtonGroup', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="start" wrap>
            <Specimen label="horizontal">
                <ButtonGroup>
                    <Button variant="outline">Runs</Button>
                    <Button variant="outline">Schedules</Button>
                    <Button variant="outline">Alerts</Button>
                </ButtonGroup>
            </Specimen>
            <Specimen label="vertical">
                <ButtonGroup orientation="vertical">
                    <Button variant="outline">Runs</Button>
                    <Button variant="outline">Schedules</Button>
                    <Button variant="outline">Alerts</Button>
                </ButtonGroup>
            </Specimen>
            <Specimen label="with separator">
                <ButtonGroup>
                    <Button>Run now</Button>
                    <ButtonGroupSeparator />
                    <Button size="icon" aria-label="More run options">
                        <ChevronDown />
                    </Button>
                </ButtonGroup>
            </Specimen>
            <Specimen label="with text">
                <ButtonGroup>
                    <ButtonGroupText>Page</ButtonGroupText>
                    <Button variant="outline" size="icon" aria-label="Previous page">
                        <ChevronLeft />
                    </Button>
                    <Button variant="outline" size="icon" aria-label="Next page">
                        <ChevronRight />
                    </Button>
                </ButtonGroup>
            </Specimen>
            <Specimen label="with input">
                <ButtonGroup>
                    <Input readOnly defaultValue="https://api.example.org" aria-label="Base URL" />
                    <Button variant="outline" size="icon" aria-label="Copy base URL">
                        <Copy />
                    </Button>
                </ButtonGroup>
            </Specimen>
            <Specimen label="nested">
                <ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="sm">
                            Day
                        </Button>
                        <Button variant="outline" size="sm">
                            Week
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="sm">
                            Export
                        </Button>
                    </ButtonGroup>
                </ButtonGroup>
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen label="one disabled">
                <ButtonGroup>
                    <Button variant="outline">
                        <Play data-icon="inline-start" />
                        Resume
                    </Button>
                    <Button variant="outline" disabled>
                        <Pause data-icon="inline-start" />
                        Pause
                    </Button>
                </ButtonGroup>
            </Specimen>
            <Specimen label="all disabled">
                <ButtonGroup>
                    <Button variant="outline" disabled>
                        Previous
                    </Button>
                    <Button variant="outline" disabled>
                        Next
                    </Button>
                </ButtonGroup>
            </Specimen>
        </Row>
    ),
}

export const RunControls: StoryObj = {
    render: () => (
        <Row gap="md" justify="between" wrap className="rounded-lg border border-border p-4">
            <Stack gap="2xs">
                <p className="text-sm font-medium">Run 01a1a5c6</p>
                <p className="text-xs text-muted-foreground">running since 2026-11-04 14:02, step 2 of 3</p>
            </Stack>
            <ButtonGroup>
                <Button variant="outline" size="sm">
                    <Pause data-icon="inline-start" />
                    Pause
                </Button>
                <Button variant="outline" size="sm">
                    <Square data-icon="inline-start" />
                    Cancel
                </Button>
            </ButtonGroup>
        </Row>
    ),
}
