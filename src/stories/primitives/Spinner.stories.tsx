import type { Meta, StoryObj } from '@storybook/react-vite'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'
import { Row } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Display/Spinner', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="end" wrap>
            <Specimen below label="size-3">
                <Spinner className="size-3" />
            </Specimen>
            <Specimen below label="default (size-4)">
                <Spinner />
            </Specimen>
            <Specimen below label="size-6">
                <Spinner className="size-6" />
            </Specimen>
            <Specimen below label="muted">
                <Spinner className="text-muted-foreground" />
            </Specimen>
            <Specimen below label="running ink">
                <Spinner className="text-status-running-ink" />
            </Specimen>
        </Row>
    ),
}

export const InContext: StoryObj = {
    render: () => (
        <Row gap="lg" wrap>
            <Specimen below label="in a disabled button">
                <Button disabled>
                    <Spinner data-icon="inline-start" />
                    Running
                </Button>
            </Specimen>
            <Specimen below label="in a badge">
                <Badge className="bg-status-running/15 text-status-running-ink">
                    <Spinner data-icon="inline-start" />
                    running
                </Badge>
            </Specimen>
            <Specimen below label="beside text">
                <Row as="p" className="text-sm text-muted-foreground">
                    <Spinner />
                    Running <span className="font-mono">sync-inventory</span>
                </Row>
            </Specimen>
        </Row>
    ),
}
