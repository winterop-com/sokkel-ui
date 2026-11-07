import type { Meta, StoryObj } from '@storybook/react-vite'

import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Separator } from '@winterop-com/sokkel-ui/primitives/separator'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Display/Separator', parameters: { frame: 'column' } }
export default meta

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

export const Variants: StoryObj = {
    render: () => (
        <>
            <Stack gap="sm" className="max-w-md">
                <Caption>horizontal</Caption>
                <p className="text-sm">Settings</p>
                <Separator />
                <p className="text-sm">Output</p>
            </Stack>
            <Stack gap="sm">
                <Caption>vertical</Caption>
                <Row gap="md" className="h-5 text-sm">
                    <span>Runs</span>
                    <Separator orientation="vertical" />
                    <span>Files</span>
                    <Separator orientation="vertical" />
                    <span>Settings</span>
                </Row>
            </Stack>
        </>
    ),
}

export const JobHeader: StoryObj = {
    render: () => (
        <Stack className="max-w-xl">
            <PageHeader title="Nightly export" code="nightly-export" />
            <Separator />
            <Row gap="md" wrap className="h-5 text-xs text-muted-foreground">
                <span>3 steps</span>
                <Separator orientation="vertical" />
                <span>every night at 02:00</span>
                <Separator orientation="vertical" />
                <span className="tabular-nums">last run 2026-11-04 14:02</span>
            </Row>
        </Stack>
    ),
}
